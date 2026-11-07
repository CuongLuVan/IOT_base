// MQTT transport: broker settings, TLS credentials, connect / reconnect with
// backoff, dead-connection detection and the publish pipeline.
//
// Reconnection: connect() may be called every network loop. It waits
// MQTT_RECONNECT_BACKOFF_MIN_MS after a drop, doubles the wait after every
// failed attempt up to MQTT_RECONNECT_BACKOFF_MAX_MS (plus jitter) and resets
// it after a successful connect + subscribe. Every attempt starts from a
// closed TLS client with the credentials applied again, and PubSubClient
// resolves the host name again. service() closes the connection when
// PubSubClient reports it lost; PubSubClient itself drops a connection that
// stays silent for 1.5 x MQTT_KEEPALIVE_SECONDS after a PINGREQ.
//
// Blocking: PubSubClient waits for CONNACK and for the rest of a packet by
// polling available() without sleeping. YieldingClient sleeps 1 ms on every
// repeated empty poll, so those waits (at most MQTT_SOCKET_TIMEOUT_SECONDS)
// leave the CPU to the other tasks and the idle task.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <PubSubClient.h>
#include <string.h>

#include "Clock.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MqttInternal.h"
#include "MqttPlatform.h"
#include "PemCheck.h"
#include "TaskWatchdog.h"

namespace mqtt {
namespace {

constexpr size_t kHostMaxLength = 127;
// PubSubClient fixed header (up to 5 bytes) and the topic length field.
constexpr size_t kPublishOverhead = 5 + 2;

struct MqttSettings {
    char host[kHostMaxLength + 1];
    uint16_t port;
    char clientId[kCredentialMaxLength + 1];
    char user[kCredentialMaxLength + 1];
    char password[kCredentialMaxLength + 1];
    char publishTopic[kTopicMaxLength + 1];
    char subscribeTopic[kTopicMaxLength + 1];
};

// Keeps failed CONNECTs below the broker's brute-force threshold
// (ENABLE_MQTT_CONNECT_RATE_LIMIT, mqtt_bruteforce.json).
class ConnectRateLimiter {
public:
    bool attemptAllowed() const
    {
        return count_ < MQTT_CONNECT_MAX_FAILURES || millis() - times_[oldest_] >= MQTT_CONNECT_FAILURE_WINDOW_MS;
    }

    void record(bool connected)
    {
        if (connected) {
            count_ = 0;
            oldest_ = 0;
            return;
        }
        uint8_t slot = static_cast<uint8_t>((oldest_ + count_) % MQTT_CONNECT_MAX_FAILURES);
        if (count_ == MQTT_CONNECT_MAX_FAILURES) {
            slot = oldest_;
            oldest_ = static_cast<uint8_t>((oldest_ + 1) % MQTT_CONNECT_MAX_FAILURES);
        } else {
            ++count_;
        }
        times_[slot] = millis();
    }

private:
    uint32_t times_[MQTT_CONNECT_MAX_FAILURES] = {};
    uint8_t count_ = 0;
    uint8_t oldest_ = 0;
};

// Exponential backoff with jitter between connect attempts.
class ReconnectBackoff {
public:
    bool due(uint32_t nowMs) const
    {
        return static_cast<int32_t>(nowMs - nextAttemptMs_) >= 0;
    }

    void reset()
    {
        delayMs_ = MQTT_RECONNECT_BACKOFF_MIN_MS;
    }

    // After a lost connection: first retry after the minimum delay.
    void restart(uint32_t nowMs)
    {
        reset();
        schedule(nowMs);
    }

    // Schedules the next attempt delayMs_ (+ jitter) from now, then doubles delayMs_.
    void schedule(uint32_t nowMs)
    {
        const uint32_t jitterRange = delayMs_ / 100UL * MQTT_RECONNECT_JITTER_PERCENT;
        const uint32_t jitter = jitterRange > 0 ? mqtt_platform::secureRandom32() % jitterRange : 0;
        nextAttemptMs_ = nowMs + delayMs_ + jitter;
        delayMs_ = delayMs_ >= MQTT_RECONNECT_BACKOFF_MAX_MS / 2 ? MQTT_RECONNECT_BACKOFF_MAX_MS : delayMs_ * 2;
    }

private:
    uint32_t delayMs_ = MQTT_RECONNECT_BACKOFF_MIN_MS;
    uint32_t nextAttemptMs_ = 0;
};

// Forwards to the TLS client. The first empty available() of a network cycle
// returns at once (the poll of PubSubClient::loop()); every further empty one
// sleeps 1 ms, because then PubSubClient is busy-waiting for data.
class YieldingClient : public Client {
public:
    explicit YieldingClient(Client& inner) : inner_(inner) {}

    // Call once per network cycle, before PubSubClient runs.
    void newCycle()
    {
        polledEmpty_ = false;
    }

    int connect(IPAddress ip, uint16_t port) override
    {
        task_watchdog::reset(task_watchdog::Slot::Network);
        const int result = inner_.connect(ip, port);
        task_watchdog::reset(task_watchdog::Slot::Network);
        return result;
    }
    int connect(const char* host, uint16_t port) override
    {
        task_watchdog::reset(task_watchdog::Slot::Network);
        const int result = inner_.connect(host, port);
        task_watchdog::reset(task_watchdog::Slot::Network);
        return result;
    }
    size_t write(uint8_t value) override
    {
        return inner_.write(value);
    }
    size_t write(const uint8_t* buffer, size_t size) override
    {
        return inner_.write(buffer, size);
    }
    int available() override
    {
        const int count = inner_.available();
        if (count > 0) {
            polledEmpty_ = false;
        } else if (polledEmpty_) {
            delay(1);
        } else {
            polledEmpty_ = true;
        }
        return count;
    }
    int read() override
    {
        return inner_.read();
    }
    int read(uint8_t* buffer, size_t size) override
    {
        return inner_.read(buffer, size);
    }
    int peek() override
    {
        return inner_.peek();
    }
    void flush() override
    {
        inner_.flush();
    }
    void stop() override
    {
        inner_.stop();
    }
    uint8_t connected() override
    {
        return inner_.connected();
    }
    operator bool() override
    {
        return static_cast<bool>(inner_);
    }

private:
    Client& inner_;
    bool polledEmpty_ = false;
};

struct TransportState {
    MqttSettings settings = {};
    mqtt_platform::SecureClient secureClient;
    YieldingClient yieldingClient{secureClient};
    PubSubClient client{yieldingClient};
    mqtt_platform::TlsCredentials credentials;
    ConnectRateLimiter rateLimiter;
    ReconnectBackoff backoff;
    bool sessionUp = false;  // A connect + subscribe succeeded and no drop was seen since.
    bool ready = false;      // Settings and every credential loaded.
};

TransportState state;

bool copySetting(JsonVariantConst source, char* destination, size_t destinationSize, bool required,
                 const char* name)
{
    const char* value = source.as<const char*>();
    if (value == nullptr) {
        destination[0] = '\0';
        if (required) {
            DEVICE_LOGF_ERROR("[MQTT] Missing setting: %s\n", name);
        }
        return !required;
    }
    const size_t length = strlen(value);
    if ((required && length == 0) || length >= destinationSize) {
        DEVICE_LOGF_ERROR("[MQTT] Empty or oversized setting: %s\n", name);
        return false;
    }
    memcpy(destination, value, length + 1);
    return true;
}

bool isPublishTopicValid(const char* topic)
{
    return topic[0] != '\0' && strchr(topic, '+') == nullptr && strchr(topic, '#') == nullptr;
}

// JSON keys are the stored setup format ("subcribe_topic" included).
bool parseSettings(const String& json, MqttSettings& settings)
{
    JsonDocument document;
    if (deserializeJson(document, json) || !document.is<JsonObject>()) {
        DEVICE_LOG_ERROR("[MQTT] Stored broker settings are not valid JSON");
        return false;
    }
    long port = 0;
    if (!readIntField(document.as<JsonVariantConst>(), "mqtt_port", 0, 1, 65535, port)) {
        DEVICE_LOG_ERROR("[MQTT] mqtt_port must be 1-65535");
        return false;
    }
    settings.port = static_cast<uint16_t>(port);
    if (!copySetting(document["mqtt_host"], settings.host, sizeof(settings.host), true, "mqtt_host") ||
        !copySetting(document["mqtt_client"], settings.clientId, sizeof(settings.clientId), true, "mqtt_client") ||
        !copySetting(document["public_topic"], settings.publishTopic, sizeof(settings.publishTopic), true,
                     "public_topic") ||
        !copySetting(document["subcribe_topic"], settings.subscribeTopic, sizeof(settings.subscribeTopic), true,
                     "subcribe_topic")) {
        return false;
    }
    if (ENABLE_MQTT_USER_AUTH &&
        (!copySetting(document["mqtt_user"], settings.user, sizeof(settings.user), false, "mqtt_user") ||
         !copySetting(document["mqtt_pwd"], settings.password, sizeof(settings.password), false, "mqtt_pwd"))) {
        return false;
    }
    if (!isPublishTopicValid(settings.publishTopic)) {
        DEVICE_LOG_ERROR("[MQTT] public_topic must not contain '+' or '#'");
        return false;
    }
    return true;
}

// The CA (always) and, with ENABLE_MTLS, the client certificate and key.
bool loadTlsCredentials()
{
    Memory* memory = Memory::GetInstance();
    String ca;
    if (!memory->readString(MTLS_CA_CERT_ADDRESS, MTLS_CA_CERT_MAX_LENGTH, ca) || !pem::isCertificate(ca)) {
        DEVICE_LOG_ERROR("[MQTT] CA certificate is missing or invalid; MQTT is disabled");
        return false;
    }
    String certificate;
    String privateKey;
    if (ENABLE_MTLS &&
        (!memory->readString(MTLS_CLIENT_CERT_ADDRESS, MTLS_CLIENT_CERT_MAX_LENGTH, certificate) ||
         !pem::isCertificate(certificate) ||
         !memory->readString(MTLS_PRIVATE_KEY_ADDRESS, MTLS_PRIVATE_KEY_MAX_LENGTH, privateKey) ||
         !pem::isPrivateKey(privateKey))) {
        DEVICE_LOG_ERROR("[MQTT] Client certificate or private key is missing or invalid; MQTT is disabled");
        return false;
    }
    if (!state.credentials.load(ca, certificate, privateKey)) {
        DEVICE_LOG_ERROR("[MQTT] Cannot keep the TLS credentials; MQTT is disabled");
        return false;
    }
    return true;
}

// SNTP is needed for the certificate validity check and the replay timestamps.
bool brokerClockReady()
{
    if (device_clock::isValidNow()) {
        return true;
    }
    device_clock::startSync();
    return false;
}

void closeConnection()
{
    if (state.client.connected()) {
        state.client.disconnect();
    }
    state.secureClient.stop();
    state.sessionUp = false;
}

// Closes a lost session; the next connect() waits the minimum backoff.
void dropSession(uint32_t nowMs)
{
    closeConnection();
    state.backoff.restart(nowMs);
}

// A session that just came up: replies the server may have missed.
void announceSession()
{
    if (ascon::kEnabled && !ascon::announceKey()) {
        DEVICE_LOG_WARNING("[ASCON] Handshake publish failed");
    }
    status::sendReport(brokerSink(), 0, CommandResult::ok());
}

}  // namespace

namespace transport {

bool begin()
{
    state.ready = false;
    closeConnection();

    MqttSettings settings = {};
    if (!parseSettings(Memory::GetInstance()->readString(EEPROM_ADDR_MQTT_SETTINGS, MQTT_SETTINGS_MAX_LENGTH),
                       settings)) {
        DEVICE_LOG_ERROR("[MQTT] Invalid or missing broker configuration; MQTT is disabled");
        return false;
    }
    state.settings = settings;
    if (!loadTlsCredentials() || !security::loadCredentials()) {
        return false;
    }
    // The host name, not an address: PubSubClient resolves it on every connect.
    state.client.setServer(state.settings.host, state.settings.port);
    state.client.setCallback(onMessage);
    state.client.setKeepAlive(MQTT_KEEPALIVE_SECONDS);
    state.client.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SECONDS);
    if (!state.client.setBufferSize(MQTT_PACKET_SIZE)) {
        DEVICE_LOG_WARNING("[MQTT] Cannot allocate the packet buffer; large messages will fail");
    }
    state.backoff = ReconnectBackoff();
    state.ready = true;
    DEVICE_LOGF_INFO("[MQTT] Broker %s:%u, client %s\n", state.settings.host, state.settings.port,
                     state.settings.clientId);
    return true;
}

bool connect()
{
    if (state.client.connected()) {
        return true;
    }
    const uint32_t now = millis();
    if (!state.ready || !mqtt_platform::stationConnected() || !state.backoff.due(now)) {
        return false;
    }
    if (!brokerClockReady()) {
        DEVICE_LOG_DEBUG("[MQTT] Waiting for SNTP before connecting");
        return false;
    }
    if (ENABLE_MQTT_CONNECT_RATE_LIMIT && !state.rateLimiter.attemptAllowed()) {
        DEVICE_LOG_DEBUG("[MQTT] Connect deferred: broker brute-force limit");
        return false;
    }

    state.backoff.schedule(now);
    state.credentials.apply(state.secureClient);
    state.yieldingClient.newCycle();
    DEVICE_LOG_DEBUG("[MQTT] Connecting");
    // With mTLS the broker identifies the device by client id + certificate.
    const bool connected = ENABLE_MQTT_USER_AUTH ? state.client.connect(state.settings.clientId, state.settings.user,
                                                                        state.settings.password)
                                                 : state.client.connect(state.settings.clientId);
    if (ENABLE_MQTT_CONNECT_RATE_LIMIT) {
        state.rateLimiter.record(connected);
    }
    if (!connected) {
        DEVICE_LOGF_WARNING("[MQTT] Connect failed, state=%d\n", state.client.state());
        state.secureClient.stop();
        return false;
    }
    if (!state.client.subscribe(state.settings.subscribeTopic, MQTT_SUBSCRIBE_QOS)) {
        DEVICE_LOG_WARNING("[MQTT] Subscribe rejected (check mqtt_acl.json); disconnecting");
        closeConnection();
        return false;
    }
    state.backoff.reset();
    state.sessionUp = true;
    DEVICE_LOG_INFO("[MQTT] Connected");
    announceSession();
    return state.client.connected();
}

void disconnect()
{
    if (!state.sessionUp && !state.client.connected()) {
        state.secureClient.stop();
        return;
    }
    DEVICE_LOGF_WARNING("[MQTT] Disconnecting, state=%d\n", state.client.state());
    dropSession(millis());
}

bool connected()
{
    return state.client.connected();
}

void service()
{
    if (!state.sessionUp) {
        return;
    }
    state.yieldingClient.newCycle();
    if (state.client.loop() && state.client.state() == MQTT_CONNECTED) {
        return;
    }
    DEVICE_LOGF_WARNING("[MQTT] Connection lost, state=%d\n", state.client.state());
    dropSession(millis());
}

bool send(const String& payload)
{
    if (!state.client.connected()) {
        DEVICE_LOG_DEBUG("[MQTT] Publish skipped: not connected");
        return false;
    }
    if (payload.length() + kPublishOverhead + strlen(state.settings.publishTopic) > MQTT_PACKET_SIZE) {
        DEVICE_LOGF_WARNING("[MQTT] Publish rejected: payload of %u bytes too large\n",
                            static_cast<unsigned>(payload.length()));
        return false;
    }
    state.yieldingClient.newCycle();
    // Never retained: a retained copy would be replayed to later subscribers.
    if (!state.client.publish(state.settings.publishTopic, payload.c_str(), false)) {
        DEVICE_LOGF_WARNING("[MQTT] Publish failed, state=%d\n", state.client.state());
        return false;
    }
    return true;
}

}  // namespace transport

bool publishPlain(JsonDocument& message)
{
    if (!transport::connected()) {
        DEVICE_LOG_DEBUG("[MQTT] Publish skipped: not connected");
        return false;
    }
    if (!security::addReplayMetadata(message) || !security::signMessage(message)) {
        return false;
    }
    String payload;
    payload.reserve(measureJson(message) + 1);
    if (message.overflowed() || serializeJson(message, payload) == 0) {
        DEVICE_LOG_WARNING("[MQTT] Publish rejected: message does not fit in RAM");
        return false;
    }
    return transport::send(payload);
}

bool publishEncrypted(JsonDocument& message)
{
    if (!ascon::kEnabled) {
        return publishPlain(message);
    }
    String json;
    json.reserve(measureJson(message) + 1);
    serializeJson(message, json);
    return publishEncryptedText(json);
}

bool publishEncryptedText(const String& json)
{
    if (!transport::connected()) {
        DEVICE_LOG_DEBUG("[MQTT] Publish skipped: not connected");
        return false;
    }
    JsonDocument message;
    if (ascon::kEnabled) {
        if (!ascon::prepareKey() || !ascon::seal(json, message)) {
            return false;
        }
        return publishPlain(message);
    }
    if (!ENABLE_REPLAY_PROTECTION && !ENABLE_MESSAGE_AUTHENTICATION) {
        return transport::send(json);
    }
    if (deserializeJson(message, json) || !message.is<JsonObject>()) {
        DEVICE_LOG_WARNING("[MQTT] Publish rejected: payload must be a JSON object");
        return false;
    }
    return publishPlain(message);
}

}  // namespace mqtt
