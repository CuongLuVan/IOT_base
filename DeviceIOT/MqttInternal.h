#pragma once

// Interfaces between the files of the MQTT module. Only these files include it:
//   NetworkMqtt.cpp       public API (NetworkMqtt.h)
//   MqttTransport.cpp      settings, TLS credentials, connect / reconnect, publish pipeline
//   MqttSecurity.cpp       hex, replay metadata, HMAC sign / verify
//   AsconSession.cpp       Ascon session key, encrypt / decrypt, key handshake
//   CommandDispatcher.cpp  MQTT callback, LAN entry, command password, route table
//   CommandHandlers.cpp    com 1, 2, 4, 5, 7, 8..13, 14
//   StatusReport.cpp       status report and short replies
//   HighSpeedCommand.cpp   com 15 (DeviceIOT only)
// Platform differences (TLS client, HMAC backend, random) are in MqttPlatform.h.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>
#include <ArduinoJson.h>
#include <stddef.h>
#include <stdint.h>

#include "CommandResult.h"
#include "define_All.h"

namespace mqtt {

// Longest client id, user name and password accepted in the stored settings.
constexpr size_t kCredentialMaxLength = 32;
// Longest publish / subscribe topic.
constexpr size_t kTopicMaxLength = 64;

namespace transport {
// Loads settings and credentials; true when connect() may run.
bool begin();
// One connect + subscribe attempt, rate-limited by an exponential backoff.
bool connect();
// Closes the MQTT session and the TLS socket at once.
void disconnect();
bool connected();
// Services the client and detects a dead connection.
void service();
// Publishes the final wire text to the publish topic, never retained.
bool send(const String& payload);
}  // namespace transport

// Publish pipeline: Ascon encryption (when enabled), replay metadata, HMAC
// signature, then one serialisation. The broker checks replay fields and the
// signature without the Ascon key.
//
// Adds replay metadata and the signature to message and publishes it as is.
bool publishPlain(JsonDocument& message);
// Encrypts message with the Ascon session key when enabled, then publishPlain().
bool publishEncrypted(JsonDocument& message);
// Same as publishEncrypted() for a JSON object given as text.
bool publishEncryptedText(const String& json);

namespace security {
void appendHex(String& out, const uint8_t* data, size_t length);
// Decodes 2 * length hex characters; false on a non-hex character.
bool hexDecode(const char* hex, uint8_t* out, size_t length);
// Reads the HMAC key id and secret; true when message authentication is off.
bool loadCredentials();
// "timestamp" (ms) and "nonce" for the broker; no-op when replay protection is off.
bool addReplayMetadata(JsonDocument& message);
// "keyId" and "signature"; no-op when message authentication is off.
bool signMessage(JsonDocument& message);
// Checks and removes "keyId" / "signature"; true when message authentication is off.
bool verifySignature(JsonDocument& message);
}  // namespace security

namespace ascon {
constexpr bool kEnabled = ENABLE_ASCON_AEAD128 != 0;
// Rotates the session key when due and announces it to the broker; false
// while no key the server knows is available. true when Ascon is off.
bool prepareKey();
// Publishes {"rc":7,"rs":0,"ky":"<digits>"} in plaintext to the broker,
// rotating the key first when due.
bool announceKey();
// Wraps plainText as {"com":1,"value":"<hex nonce | ciphertext | tag>"}.
bool seal(const String& plainText, JsonDocument& envelope);
// Replaces an encrypted command with its plaintext JSON; only the handshake
// request may arrive unencrypted. true when Ascon is off.
bool open(JsonDocument& command);
}  // namespace ascon

// Where the replies of one command go: the broker for MQTT, the HTTP response
// for LAN control. Both encrypt like an MQTT publish when Ascon is on.
class ReplySink {
public:
    virtual bool send(JsonDocument& reply) = 0;
    virtual bool sendText(const String& json) = 0;

protected:
    ~ReplySink() = default;
};

// The sink that publishes to the broker.
ReplySink& brokerSink();

struct CommandContext {
    JsonVariantConst fields;  // The decrypted, verified command.
    long com;                 // kCommandTypeMin..kCommandTypeMax.
    ReplySink& reply;
};

using CommandHandler = void (*)(const CommandContext& context);

// Runs one command from MQTT or LAN: size limit, signature, Ascon, password,
// then the handler of its "com". Unknown com -> {"rc":com,"rs":2}.
void dispatch(const char* data, size_t length, ReplySink& reply);
// PubSubClient callback.
void onMessage(char* topic, uint8_t* payload, unsigned int length);
// The stored settings changed: read the command password again on next use.
void reloadCommandPassword();

void handleControlCommand(const CommandContext& context);
void handleStatusCommand(const CommandContext& context);
void handleCountdownCommand(const CommandContext& context);
void handleOnTimerCommand(const CommandContext& context);
void handleHandshakeCommand(const CommandContext& context);
void handleScheduleCommand(const CommandContext& context);
void handleThresholdCommand(const CommandContext& context);
#if defined(ESP32)
void handleHighSpeedCommand(const CommandContext& context);
#endif

namespace status {
// The full status report. replyTo 0 = unsolicited (no "rc" / "rs"); id > 0
// adds "id" (schedule or threshold rule).
void sendReport(ReplySink& sink, long replyTo, const CommandResult& result, long id = 0);
// The periodic device status plus "rc" / "rs".
void sendShortReply(ReplySink& sink, long replyTo, CommandStatus status);
// {"rc":replyTo,"rs":status}.
void sendResult(ReplySink& sink, long replyTo, CommandStatus status);
}  // namespace status

}  // namespace mqtt
