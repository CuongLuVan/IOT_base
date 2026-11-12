// Entry point of every MQTT / LAN command: size limit, JSON, HMAC signature,
// Ascon, command password, then the handler of its "com" from kRoutes.
// Replies go to a ReplySink: the broker for MQTT, the HTTP response for LAN
// control. Same logic as DeviceIOT8266.

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
    bool send(cJSON* reply) override
    {
        return publishEncrypted(reply);
    }

    bool sendText(const std::string& text) override
    {
        return publishEncryptedText(text);
    }
};

BrokerSink broker;

// Collects the replies of one LAN command as a JSON array body. Replay fields
// and the signature are for the broker only; Ascon applies as over MQTT.
class LanSink final : public ReplySink {
public:
    explicit LanSink(std::string& replies) : replies_(replies) {}

    bool send(cJSON* reply) override
    {
        const std::string text = json::print(reply);
        if (text.empty()) {
            return false;
        }
        return sendText(text);
    }

    bool sendText(const std::string& text) override
    {
        if (!ascon::kEnabled) {
            return append(text);
        }
        json::Ptr envelope = json::newObject();
        if (!envelope || !ascon::prepareKey() || !ascon::seal(text, envelope.get())) {
            return false;
        }
        const std::string wire = json::print(envelope.get());
        return !wire.empty() && append(wire);
    }

private:
    bool append(const std::string& payload)
    {
        if (replies_.size() + payload.size() + 1 > LAN_REPLY_MAX_LENGTH) {
            DEVICE_LOG_WARNING("[LAN] Reply dropped: response too large");
            return false;
        }
        if (!replies_.empty()) {
            replies_ += ',';
        }
        replies_ += payload;
        return true;
    }

    std::string& replies_;
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
        json::Ptr stored =
            json::parseObject(Memory::GetInstance()->readString(EEPROM_ADDR_MQTT_SETTINGS, MQTT_SETTINGS_MAX_LENGTH));
        const char* value = json::getString(stored.get(), "mqtt_pwd", "");
        const size_t length = strlen(value) < kCredentialMaxLength ? strlen(value) : kCredentialMaxLength;
        memcpy(password.value, value, length);
        password.value[length] = '\0';
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
    // Verification removes fields and decryption replaces the document.
    json::Ptr document = json::parseObject(data, length);
    if (!document) {
        DEVICE_LOG_WARNING("[MQTT] Rejected invalid command JSON");
        return;
    }
    if (!security::verifySignature(document.get())) {
        DEVICE_LOG_WARNING("[MQTT Auth] Rejected command with invalid signature");
        return;
    }
    if (!ascon::open(document)) {
        DEVICE_LOG_WARNING("[ASCON] Rejected unencrypted or undecryptable command");
        return;
    }

    long com = 0;
    const bool comValid = json::readIntField(document.get(), "com", 0, kCommandTypeMin, kCommandTypeMax, com);
    // After decryption: "pa" is inside the encrypted command.
    if (ENABLE_COMMAND_PASSWORD && !commandPasswordMatches(json::getString(document.get(), "pa", ""))) {
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
    handler(CommandContext{document.get(), com, reply});
}

void onMessage(const char* topic, const uint8_t* payload, size_t length)
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
std::string handleLanCommand(const char* text, size_t length)
{
    std::string replies;
    replies.reserve(256);
    mqtt::LanSink sink(replies);
    mqtt::dispatch(text, length, sink);
    std::string array;
    array.reserve(replies.size() + 2);
    array += '[';
    array += replies;
    array += ']';
    return array;
}
#endif
