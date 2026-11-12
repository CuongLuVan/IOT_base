// Hex helpers, replay metadata and HMAC-SHA256 message authentication for the
// broker (mqttBroker/MqttBroker1885.js). Same logic as DeviceIOT8266; the code
// is always compiled and the feature switches make the disabled parts no-ops.

#include <ctype.h>
#include <stdio.h>
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

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js:
// object keys sorted, no whitespace, strings escaped like JSON.stringify().
bool appendCanonicalJson(std::string& out, const cJSON* value, int depth)
{
    if (value == nullptr || depth > json::kMaxNesting) return false;
    if (cJSON_IsObject(value)) {
        const cJSON* keys[MESSAGE_AUTH_MAX_FIELDS];
        size_t count = 0;
        for (const cJSON* child = value->child; child != nullptr; child = child->next) {
            if (count == MESSAGE_AUTH_MAX_FIELDS || child->string == nullptr) {
                return false;
            }
            size_t position = count++;
            while (position > 0 && strcmp(keys[position - 1]->string, child->string) > 0) {
                keys[position] = keys[position - 1];
                --position;
            }
            keys[position] = child;
        }
        out += '{';
        for (size_t index = 0; index < count; ++index) {
            if (index > 0) {
                out += ',';
            }
            json::appendString(out, keys[index]->string);
            out += ':';
            if (!appendCanonicalJson(out, keys[index], depth + 1)) {
                return false;
            }
        }
        out += '}';
        return true;
    }
    if (cJSON_IsArray(value)) {
        out += '[';
        bool first = true;
        for (const cJSON* item = value->child; item != nullptr; item = item->next) {
            if (!first) {
                out += ',';
            }
            first = false;
            if (!appendCanonicalJson(out, item, depth + 1)) {
                return false;
            }
        }
        out += ']';
        return true;
    }
    return json::appendTo(out, value);
}

bool hmacSha256Hex(const std::string& data, char signature[kHmacHexLength + 1])
{
    uint8_t digest[kHmacDigestBytes];
    if (!mqtt_platform::hmacSha256(credentials.secret, strlen(credentials.secret), data.c_str(), data.size(),
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
bool canonicalSignature(cJSON* message, char signature[kHmacHexLength + 1])
{
    json::remove(message, "signature");
    json::remove(message, "keyId");
    std::string canonical;
    return appendCanonicalJson(canonical, message, 0) && hmacSha256Hex(canonical, signature);
}

bool readCredential(int address, size_t maxLength, char* destination)
{
    std::string value;
    if (!Memory::GetInstance()->readString(address, maxLength, value) || value.empty()) {
        destination[0] = '\0';
        return false;
    }
    const size_t length = value.size() < maxLength ? value.size() : maxLength;
    memcpy(destination, value.data(), length);
    destination[length] = '\0';
    return true;
}

}  // namespace

void appendHex(std::string& out, const uint8_t* data, size_t length)
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

bool addReplayMetadata(cJSON* message)
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
    const double timestampMs = static_cast<double>(static_cast<uint64_t>(time(nullptr)) * 1000ULL);
    return json::setNumber(message, "timestamp", timestampMs) && json::setString(message, "nonce", nonce);
}

bool signMessage(cJSON* message)
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
    return json::setString(message, "keyId", credentials.keyId) && json::setString(message, "signature", signature);
}

bool verifySignature(cJSON* message)
{
    if (!ENABLE_MESSAGE_AUTHENTICATION) {
        return true;
    }
    if (!credentials.loaded) {
        return false;
    }
    const char* keyId = json::getString(message, "keyId", "");
    const char* received = json::getString(message, "signature", "");
    if (strcmp(credentials.keyId, keyId) != 0 || strlen(received) != kHmacHexLength) {
        return false;
    }
    // canonicalSignature() removes the field that received points into.
    char receivedCopy[kHmacHexLength + 1];
    memcpy(receivedCopy, received, sizeof(receivedCopy));
    char expected[kHmacHexLength + 1];
    if (!canonicalSignature(message, expected)) {
        return false;
    }
    uint8_t difference = 0;
    for (size_t index = 0; index < kHmacHexLength; ++index) {
        difference |= static_cast<uint8_t>(tolower(static_cast<unsigned char>(receivedCopy[index])) ^ expected[index]);
    }
    return difference == 0;
}

}  // namespace security
}  // namespace mqtt
