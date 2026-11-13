// Entry point of every MQTT / LAN command: size limit, JSON, HMAC signature,
// Ascon, command password, then the handler of its "com" from kRoutes.
// Replies go to a ReplySink: the broker for MQTT, the HTTP response for LAN
// control (docs/LanControl.md).
//
// The ESP32 firmware also routes high-speed capture commands.

#include <string.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "MqttInternal.h"
#include "NetworkMqtt.h"

// Declared by NetworkMqtt.h only with ENABLE_COMMAND_PASSWORD; always defined.
bool commandPasswordMatches(const char* received);

namespace mqtt {
namespace {

struct CommandRoute {
    long com;
    CommandHandler handler;
};

const CommandRoute kRoutes[] = {
    {COMMAND_TYPE_CONTROL, handleControlCommand},
    {COMMAND_TYPE_STATUS, handleStatusCommand},
    {COMMAND_TYPE_COUNTDOWN, handleCountdownCommand},
    {COMMAND_TYPE_ON_TIMER, handleOnTimerCommand},
    {COMMAND_TYPE_ASCON_HANDSHAKE, handleHandshakeCommand},
    {COMMAND_TYPE_SCHEDULE_ADD, handleScheduleCommand},
    {COMMAND_TYPE_SCHEDULE_UPDATE, handleScheduleCommand},
    {COMMAND_TYPE_SCHEDULE_DELETE, handleScheduleCommand},
    {COMMAND_TYPE_SCHEDULE_ENABLE, handleScheduleCommand},
    {COMMAND_TYPE_SCHEDULE_CLEAR, handleScheduleCommand},
    {COMMAND_TYPE_SCHEDULE_LIST, handleScheduleCommand},
    {COMMAND_TYPE_THRESHOLD, handleThresholdCommand},
    {COMMAND_TYPE_CERTIFICATE_RENEW, handleCertificateCommand},
    {COMMAND_TYPE_CA_RENEW, handleCertificateCommand},
#if defined(ESP32)
    {COMMAND_TYPE_HIGH_SPEED_CAPTURE, handleHighSpeedCommand},
#endif
};

CommandHandler findHandler(long com)
{
    for (const CommandRoute& route : kRoutes) {
        if (route.com == com) {
            return route.handler;
        }
    }
    return nullptr;
}

class BrokerSink final : public ReplySink {
public:
    bool send(JsonDocument& reply) override
    {
        return publishEncrypted(reply);
    }

    bool sendText(const String& json) override
    {
        return publishEncryptedText(json);
    }
};

BrokerSink broker;

// Collects the replies of one LAN command as a JSON array body. Replay fields
// and the signature are for the broker only; Ascon applies as over MQTT.
class LanSink final : public ReplySink {
public:
    explicit LanSink(String& replies) : replies_(replies) {}

    bool send(JsonDocument& reply) override
    {
        String json;
        json.reserve(measureJson(reply) + 1);
        if (reply.overflowed() || serializeJson(reply, json) == 0) {
            return false;
        }
        return sendText(json);
    }

    bool sendText(const String& json) override
    {
        if (!ascon::kEnabled) {
            return append(json);
        }
        JsonDocument envelope;
        String wire;
        if (!ascon::prepareKey() || !ascon::seal(json, envelope) || serializeJson(envelope, wire) == 0) {
            return false;
        }
        return append(wire);
    }

private:
    bool append(const String& payload)
    {
        if (replies_.length() + payload.length() + 1 > LAN_REPLY_MAX_LENGTH) {
            DEVICE_LOG_WARNING("[LAN] Reply dropped: response too large");
            return false;
        }
        if (replies_.length() > 0) {
            replies_ += ',';
        }
        replies_ += payload;
        return true;
    }

    String& replies_;
};

// Device password = "mqtt_pwd" of the stored setup JSON, read on first use
// after boot or NetworkMqtt::begin().
struct PasswordCache {
    char value[kCredentialMaxLength + 1];
    bool loaded;
};

PasswordCache password = {};

const char* devicePassword()
{
    if (!password.loaded) {
        password.loaded = true;
        password.value[0] = '\0';
        JsonDocument filter;
        filter["mqtt_pwd"] = true;
        JsonDocument stored;
        const String json = Memory::GetInstance()->readString(EEPROM_ADDR_MQTT_SETTINGS, MQTT_SETTINGS_MAX_LENGTH);
        if (!deserializeJson(stored, json, DeserializationOption::Filter(filter))) {
            strlcpy(password.value, stored["mqtt_pwd"] | "", sizeof(password.value));
        }
    }
    return password.value;
}

}  // namespace

ReplySink& brokerSink()
{
    return broker;
}

void reloadCommandPassword()
{
    password.loaded = false;
}

void dispatch(const char* data, size_t length, ReplySink& reply)
{
    if (data == nullptr || length == 0 || length >= MQTT_PACKET_SIZE) {
        DEVICE_LOG_WARNING("[MQTT] Rejected empty or oversized command");
        return;
    }
    // Verification removes fields and decryption reuses the document.
    JsonDocument document;
    if (deserializeJson(document, data, length) || !document.is<JsonObject>()) {
        DEVICE_LOG_WARNING("[MQTT] Rejected invalid command JSON");
        return;
    }
    if (!security::verifySignature(document)) {
        DEVICE_LOG_WARNING("[MQTT Auth] Rejected command with invalid signature");
        return;
    }
    if (!ascon::open(document)) {
        DEVICE_LOG_WARNING("[ASCON] Rejected unencrypted or undecryptable command");
        return;
    }

    long com = 0;
    const bool comValid =
        readIntField(document.as<JsonVariantConst>(), "com", 0, kCommandTypeMin, kCommandTypeMax, com);
    // After decryption: "pa" is inside the encrypted command.
    if (ENABLE_COMMAND_PASSWORD && !commandPasswordMatches(document["pa"] | "")) {
        DEVICE_LOG_WARNING("[Auth] Rejected command with a wrong password");
        status::sendResult(reply, com, CommandStatus::WrongPassword);
        return;
    }
    const CommandHandler handler = comValid ? findHandler(com) : nullptr;
    if (handler == nullptr) {
        DEVICE_LOGF_WARNING("[MQTT] Rejected unknown command com=%ld\n", com);
        status::sendResult(reply, com, CommandStatus::Invalid);
        return;
    }
    handler(CommandContext{document.as<JsonVariantConst>(), com, reply});
}

void onMessage(char* topic, uint8_t* payload, unsigned int length)
{
    (void)topic;
    dispatch(reinterpret_cast<const char*>(payload), length, broker);
}

}  // namespace mqtt

// Constant time: runs over the whole received text, so the timing does not
// show how much matched. A device without a password accepts "" only.
bool commandPasswordMatches(const char* received)
{
    const char* expected = mqtt::devicePassword();
    const size_t expectedLength = strlen(expected);
    const size_t receivedLength = strlen(received);
    uint8_t difference = expectedLength != receivedLength ? 1 : 0;
    for (size_t index = 0; index < receivedLength; ++index) {
        difference |= static_cast<uint8_t>(received[index] ^ expected[expectedLength ? index % expectedLength : 0]);
    }
    return difference == 0;
}

#if ENABLE_LAN_CONTROL
String handleLanCommand(const char* json, size_t length)
{
    String replies;
    replies.reserve(256);
    mqtt::LanSink sink(replies);
    mqtt::dispatch(json, length, sink);
    String array;
    array.reserve(replies.length() + 2);
    array += '[';
    array += replies;
    array += ']';
    return array;
}
#endif
