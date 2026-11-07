// Hex helpers, replay metadata and HMAC-SHA256 message authentication for the
// broker (mqttBroker/MqttBroker1885.js). The code is always compiled; the
// feature switches make the disabled parts no-ops that the linker drops.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <string.h>
#include <time.h>

#include "Clock.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MqttInternal.h"
#include "MqttPlatform.h"

namespace mqtt {
namespace security {
namespace {

const char kHexAlphabet[] = "0123456789abcdef";
constexpr size_t kHmacDigestBytes = 32;
constexpr size_t kHmacHexLength = 2 * kHmacDigestBytes;

struct AuthCredentials {
    char keyId[MESSAGE_AUTH_KEY_ID_MAX_LENGTH + 1];
    char secret[MESSAGE_AUTH_SECRET_MAX_LENGTH + 1];
    bool loaded;
};

AuthCredentials credentials = {};

// Mirrors JSON.stringify() for strings so the HMAC input matches the broker.
void appendJsonString(String& out, const char* value)
{
    out += '"';
    for (const char* cursor = value; *cursor != '\0'; ++cursor) {
        const char character = *cursor;
        switch (character) {
            case '"':
                out += "\\\"";
                break;
            case '\\':
                out += "\\\\";
                break;
            case '\b':
                out += "\\b";
                break;
            case '\f':
                out += "\\f";
                break;
            case '\n':
                out += "\\n";
                break;
            case '\r':
                out += "\\r";
                break;
            case '\t':
                out += "\\t";
                break;
            default:
                if (static_cast<uint8_t>(character) < 0x20) {
                    char escaped[7];
                    snprintf(escaped, sizeof(escaped), "\\u%04x", static_cast<uint8_t>(character));
                    out += escaped;
                } else {
                    out += character;
                }
        }
    }
    out += '"';
}

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js:
// object keys sorted, no whitespace.
bool appendCanonicalJson(String& out, JsonVariantConst value)
{
    if (value.is<JsonObjectConst>()) {
        JsonObjectConst object = value.as<JsonObjectConst>();
        const char* keys[MESSAGE_AUTH_MAX_FIELDS];
        size_t count = 0;
        for (JsonPairConst pair : object) {
            if (count == MESSAGE_AUTH_MAX_FIELDS) {
                return false;
            }
            const char* key = pair.key().c_str();
            size_t position = count++;
            while (position > 0 && strcmp(keys[position - 1], key) > 0) {
                keys[position] = keys[position - 1];
                --position;
            }
            keys[position] = key;
        }
        out += '{';
        for (size_t index = 0; index < count; ++index) {
            if (index > 0) {
                out += ',';
            }
            appendJsonString(out, keys[index]);
            out += ':';
            if (!appendCanonicalJson(out, object[keys[index]])) {
                return false;
            }
        }
        out += '}';
        return true;
    }
    if (value.is<JsonArrayConst>()) {
        out += '[';
        bool first = true;
        for (JsonVariantConst item : value.as<JsonArrayConst>()) {
            if (!first) {
                out += ',';
            }
            first = false;
            if (!appendCanonicalJson(out, item)) {
                return false;
            }
        }
        out += ']';
        return true;
    }
    if (value.is<const char*>()) {
        appendJsonString(out, value.as<const char*>());
        return true;
    }
    String scalar;
    serializeJson(value, scalar);
    out += scalar;
    return true;
}

bool hmacSha256Hex(const String& data, char signature[kHmacHexLength + 1])
{
    uint8_t digest[kHmacDigestBytes];
    if (!mqtt_platform::hmacSha256(credentials.secret, strlen(credentials.secret), data.c_str(), data.length(),
                                   digest)) {
        return false;
    }
    for (size_t index = 0; index < kHmacDigestBytes; ++index) {
        signature[2 * index] = kHexAlphabet[digest[index] >> 4];
        signature[2 * index + 1] = kHexAlphabet[digest[index] & 0x0F];
    }
    signature[kHmacHexLength] = '\0';
    return true;
}

// The broker drops "signature" and "keyId" before computing the HMAC.
bool canonicalSignature(JsonDocument& message, char signature[kHmacHexLength + 1])
{
    message.remove("signature");
    message.remove("keyId");
    String canonical;
    return appendCanonicalJson(canonical, message.as<JsonVariantConst>()) && hmacSha256Hex(canonical, signature);
}

bool readCredential(int address, size_t maxLength, char* destination)
{
    String value;
    if (!Memory::GetInstance()->readString(address, maxLength, value) || value.length() == 0) {
        destination[0] = '\0';
        return false;
    }
    strlcpy(destination, value.c_str(), maxLength + 1);
    return true;
}

}  // namespace

void appendHex(String& out, const uint8_t* data, size_t length)
{
    for (size_t index = 0; index < length; ++index) {
        out += kHexAlphabet[data[index] >> 4];
        out += kHexAlphabet[data[index] & 0x0F];
    }
}

bool hexDecode(const char* hex, uint8_t* out, size_t length)
{
    for (size_t index = 0; index < length; ++index) {
        uint8_t byte = 0;
        for (size_t half = 0; half < 2; ++half) {
            const char character = hex[2 * index + half];
            uint8_t nibble;
            if (character >= '0' && character <= '9') {
                nibble = static_cast<uint8_t>(character - '0');
            } else if (character >= 'a' && character <= 'f') {
                nibble = static_cast<uint8_t>(character - 'a' + 10);
            } else if (character >= 'A' && character <= 'F') {
                nibble = static_cast<uint8_t>(character - 'A' + 10);
            } else {
                return false;
            }
            byte = static_cast<uint8_t>((byte << 4) | nibble);
        }
        out[index] = byte;
    }
    return true;
}

bool loadCredentials()
{
    credentials.loaded = false;
    if (!ENABLE_MESSAGE_AUTHENTICATION) {
        return true;
    }
    if (!readCredential(MESSAGE_AUTH_KEY_ID_ADDRESS, MESSAGE_AUTH_KEY_ID_MAX_LENGTH, credentials.keyId) ||
        !readCredential(MESSAGE_AUTH_SECRET_ADDRESS, MESSAGE_AUTH_SECRET_MAX_LENGTH, credentials.secret)) {
        DEVICE_LOG_ERROR("[MQTT Auth] HMAC keyId/secret are missing; MQTT is disabled");
        return false;
    }
    credentials.loaded = true;
    return true;
}

bool addReplayMetadata(JsonDocument& message)
{
    if (!ENABLE_REPLAY_PROTECTION) {
        return true;
    }
    // Read by verifyReplayProtection() in MqttBroker1885.js.
    if (!device_clock::isValidNow()) {
        DEVICE_LOG_WARNING("[MQTT] Publish deferred: clock is not synchronized");
        return false;
    }
    char nonce[17];
    snprintf(nonce, sizeof(nonce), "%08lx%08lx", static_cast<unsigned long>(mqtt_platform::secureRandom32()),
             static_cast<unsigned long>(mqtt_platform::secureRandom32()));
    message["timestamp"] = static_cast<uint64_t>(time(nullptr)) * 1000ULL;
    message["nonce"] = nonce;
    return true;
}

bool signMessage(JsonDocument& message)
{
    if (!ENABLE_MESSAGE_AUTHENTICATION) {
        return true;
    }
    if (!credentials.loaded) {
        DEVICE_LOG_ERROR("[MQTT Auth] Publish blocked: HMAC credentials are missing");
        return false;
    }
    char signature[kHmacHexLength + 1];
    if (!canonicalSignature(message, signature)) {
        DEVICE_LOG_WARNING("[MQTT Auth] Publish blocked: cannot sign payload");
        return false;
    }
    message["keyId"] = static_cast<const char*>(credentials.keyId);
    message["signature"] = signature;
    return true;
}

bool verifySignature(JsonDocument& message)
{
    if (!ENABLE_MESSAGE_AUTHENTICATION) {
        return true;
    }
    if (!credentials.loaded) {
        return false;
    }
    const char* keyId = message["keyId"] | "";
    const char* received = message["signature"] | "";
    if (strcmp(credentials.keyId, keyId) != 0 || strlen(received) != kHmacHexLength) {
        return false;
    }
    // canonicalSignature() removes the field that received points into.
    char receivedCopy[kHmacHexLength + 1];
    strlcpy(receivedCopy, received, sizeof(receivedCopy));
    char expected[kHmacHexLength + 1];
    if (!canonicalSignature(message, expected)) {
        return false;
    }
    uint8_t difference = 0;
    for (size_t index = 0; index < kHmacHexLength; ++index) {
        difference |= static_cast<uint8_t>(tolower(receivedCopy[index]) ^ expected[index]);
    }
    return difference == 0;
}

}  // namespace security
}  // namespace mqtt
