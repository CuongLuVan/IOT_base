// MQTT transport: broker settings, TLS credentials, connect / reconnect with
// backoff, dead-connection detection and the publish pipeline (same logic as
// DeviceIOT8266; MqttClient replaces PubSubClient + WiFiClientSecure).
//
// Reconnection: connect() may be called every network loop. It waits
// MQTT_RECONNECT_BACKOFF_MIN_MS after a drop, doubles the wait after every
// failed attempt up to MQTT_RECONNECT_BACKOFF_MAX_MS (plus jitter) and resets
// it after a successful connect + subscribe. Every attempt starts from a
// closed TLS session. service() closes the connection when MqttClient
// reports it lost; MqttClient itself drops a connection whose PINGREQ stays
// unanswered.

#include <string.h>

#include "Clock.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MqttClient.h"
#include "MqttInternal.h"
#include "MqttPlatform.h"
#include "PemCheck.h"
#include "TaskWatchdog.h"

namespace mqtt {
namespace {

constexpr size_t kHostMaxLength = 127;
// MQTT fixed header (up to 5 bytes) and the topic length field.
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

struct TransportState {
    MqttSettings settings = {};
    MqttClient client;
    ConnectRateLimiter rateLimiter;
    ReconnectBackoff backoff;
    bool sessionUp = false;  // A connect + subscribe succeeded and no drop was seen since.
    bool ready = false;      // Settings and every credential loaded.
};

TransportState state;

bool copySetting(const cJSON* document, const char* name, char* destination, size_t destinationSize, bool required)
{
    const cJSON* item = json::get(document, name);
    if (!json::isString(item)) {
        destination[0] = '\0';
        if (required) {
            DEVICE_LOGF_ERROR("[MQTT] Missing setting: %s\n", name);
        }
        return !required;
    }
    const char* value = item->valuestring;
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
bool parseSettings(const std::string& text, MqttSettings& settings)
{
    json::Ptr owner = json::parseObject(text);
    const cJSON* document = owner.get();
    if (document == nullptr) {
        DEVICE_LOG_ERROR("[MQTT] Stored broker settings are not valid JSON");
        return false;
    }
    long port = 0;
    if (!json::readIntField(document, "mqtt_port", 0, 1, 65535, port)) {
        DEVICE_LOG_ERROR("[MQTT] mqtt_port must be 1-65535");
        return false;
    }
    settings.port = static_cast<uint16_t>(port);
    if (!copySetting(document, "mqtt_host", settings.host, sizeof(settings.host), true) ||
        !copySetting(document, "mqtt_client", settings.clientId, sizeof(settings.clientId), true) ||
        !copySetting(document, "public_topic", settings.publishTopic, sizeof(settings.publishTopic), true) ||
        !copySetting(document, "subcribe_topic", settings.subscribeTopic, sizeof(settings.subscribeTopic), true)) {
        return false;
    }
    if (ENABLE_MQTT_USER_AUTH &&
        (!copySetting(document, "mqtt_user", settings.user, sizeof(settings.user), false) ||
         !copySetting(document, "mqtt_pwd", settings.password, sizeof(settings.password), false))) {
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
    std::string ca;
    if (!memory->readString(MTLS_CA_CERT_ADDRESS, MTLS_CA_CERT_MAX_LENGTH, ca) || !pem::isCertificate(ca)) {
        DEVICE_LOG_ERROR("[MQTT] CA certificate is missing or invalid; MQTT is disabled");
        return false;
    }
    std::string certificate;
    std::string privateKey;
    if (ENABLE_MTLS &&
        (!memory->readString(MTLS_CLIENT_CERT_ADDRESS, MTLS_CLIENT_CERT_MAX_LENGTH, certificate) ||
         !pem::isCertificate(certificate) ||
         !memory->readString(MTLS_PRIVATE_KEY_ADDRESS, MTLS_PRIVATE_KEY_MAX_LENGTH, privateKey) ||
         !pem::isPrivateKey(privateKey))) {
        DEVICE_LOG_ERROR("[MQTT] Client certificate or private key is missing or invalid; MQTT is disabled");
        return false;
    }
    if (!state.client.loadCredentials(ca, certificate, privateKey)) {
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
    if (state.client.isConnected()) {
        state.client.disconnectBroker();
    }
    state.client.stopTransport();
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
    state.client.setServer(state.settings.host, state.settings.port);
    state.client.setCallback(onMessage);
    state.client.setKeepAlive(MQTT_KEEPALIVE_SECONDS);
    state.client.setSocketTimeout(MQTT_SOCKET_TIMEOUT_SECONDS);
    state.client.setHandshakeTimeout(MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS);
    if (!state.client.setBufferSize(MQTT_PACKET_SIZE)) {
        DEVICE_LOG_ERROR("[MQTT] Cannot allocate the packet buffer; MQTT is disabled");
        return false;
    }
    state.backoff = ReconnectBackoff();
    state.ready = true;
    DEVICE_LOGF_INFO("[MQTT] Broker %s:%u, client %s\n", state.settings.host, static_cast<unsigned>(state.settings.port),
                     state.settings.clientId);
    return true;
}

bool connect()
{
    if (state.client.isConnected()) {
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
    DEVICE_LOG_DEBUG("[MQTT] Connecting");
    // With mTLS the broker identifies the device by client id + certificate.
    const bool connected =
        ENABLE_MQTT_USER_AUTH
            ? state.client.connectBroker(state.settings.clientId, state.settings.user, state.settings.password)
            : state.client.connectBroker(state.settings.clientId, nullptr, nullptr);
    if (ENABLE_MQTT_CONNECT_RATE_LIMIT) {
        state.rateLimiter.record(connected);
    }
    if (!connected) {
        DEVICE_LOGF_WARNING("[MQTT] Connect failed, state=%d\n", state.client.state());
        state.client.stopTransport();
        return false;
    }
    if (!state.client.subscribeTopic(state.settings.subscribeTopic, MQTT_SUBSCRIBE_QOS)) {
        DEVICE_LOG_WARNING("[MQTT] Subscribe rejected (check mqtt_acl.json); disconnecting");
        closeConnection();
        return false;
    }
    state.backoff.reset();
    state.sessionUp = true;
    DEVICE_LOG_INFO("[MQTT] Connected");
    announceSession();
    return state.client.isConnected();
}

void disconnect()
{
    if (!state.sessionUp && !state.client.isConnected()) {
        state.client.stopTransport();
        return;
    }
    DEVICE_LOGF_WARNING("[MQTT] Disconnecting, state=%d\n", state.client.state());
    dropSession(millis());
}

bool connected()
{
    return state.client.isConnected();
}

void service()
{
    if (!state.sessionUp) {
        return;
    }
    if (state.client.poll() && state.client.state() == MqttClient::kConnected) {
        return;
    }
    DEVICE_LOGF_WARNING("[MQTT] Connection lost, state=%d\n", state.client.state());
    dropSession(millis());
}

bool send(const std::string& payload)
{
    if (!state.client.isConnected()) {
        DEVICE_LOG_DEBUG("[MQTT] Publish skipped: not connected");
        return false;
    }
    if (payload.size() + kPublishOverhead + strlen(state.settings.publishTopic) > MQTT_PACKET_SIZE) {
        DEVICE_LOGF_WARNING("[MQTT] Publish rejected: payload of %u bytes too large\n",
                            static_cast<unsigned>(payload.size()));
        return false;
    }
    // Never retained: a retained copy would be replayed to later subscribers.
    if (!state.client.publishMessage(state.settings.publishTopic, payload.data(), payload.size(), false)) {
        DEVICE_LOGF_WARNING("[MQTT] Publish failed, state=%d\n", state.client.state());
        return false;
    }
    return true;
}

}  // namespace transport

bool publishPlain(cJSON* message)
{
    if (!transport::connected()) {
        DEVICE_LOG_DEBUG("[MQTT] Publish skipped: not connected");
        return false;
    }
    if (!security::addReplayMetadata(message) || !security::signMessage(message)) {
        return false;
    }
    const std::string payload = json::print(message);
    if (payload.empty()) {
        DEVICE_LOG_WARNING("[MQTT] Publish rejected: message does not fit in RAM");
        return false;
    }
    return transport::send(payload);
}

bool publishEncrypted(cJSON* message)
{
    if (!ascon::kEnabled) {
        return publishPlain(message);
    }
    return publishEncryptedText(json::print(message));
}

bool publishEncryptedText(const std::string& text)
{
    if (!transport::connected()) {
        DEVICE_LOG_DEBUG("[MQTT] Publish skipped: not connected");
        return false;
    }
    if (ascon::kEnabled) {
        json::Ptr envelope = json::newObject();
        if (!envelope || !ascon::prepareKey() || !ascon::seal(text, envelope.get())) {
            return false;
        }
        return publishPlain(envelope.get());
    }
    if (!ENABLE_REPLAY_PROTECTION && !ENABLE_MESSAGE_AUTHENTICATION) {
        return transport::send(text);
    }
    json::Ptr message = json::parseObject(text);
    if (!message) {
        DEVICE_LOG_WARNING("[MQTT] Publish rejected: payload must be a JSON object");
        return false;
    }
    return publishPlain(message.get());
}

}  // namespace mqtt
