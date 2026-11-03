#include "NetWork_Mqtt.h"

#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <time.h>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MemoryData.h"
#include "PlatformCompat.h"
#include "SystemTask.h"

#if ENABLE_TLS_SSL || ENABLE_mTLS
  #include <WiFiClientSecure.h>
  using MqttWiFiClient = WiFiClientSecure;
#else
  using MqttWiFiClient = WiFiClient;
#endif

#if ENABLE_MESSAGE_AUTHENTICATION
  // The NON-OS core ships BearSSL; the RTOS core ships mbedTLS.
  #if PLATFORM_ESP8266 && !SUPPORT_RTOS
    #include <bearssl/bearssl.h>
  #else
    #include <mbedtls/md.h>
  #endif
#endif

#if ENABLE_ASCON_AEAD128
  #include <new>
  #include "AsconAead128.h"
#endif

extern InfoSensor sensorValue;
extern InfoDeviceControl statusDevice;
#if SUPPORT_RTOS
extern QueueHandle_t deviceCommandQueue;
#endif

namespace {
struct MqttSettings {
    char host[128] = {};
    uint16_t port = 0;
    char client[33] = {};
#if ENABLE_MQTT_USER_AUTH
    char user[33] = {};
    char password[33] = {};
#endif
    char publishTopic[64] = {};
    char subscribeTopic[64] = {};
};

MqttSettings settings;
MqttWiFiClient mqttTransport;
PubSubClient mqttClient(mqttTransport);
DeviceCommand pendingCommand = {};
bool settingsLoaded = false;
bool clockRequested = false;
#if PLATFORM_ESP8266 && !SUPPORT_RTOS
// BearSSL keeps only the parsed DER objects; the PEM text read from EEPROM is
// freed after parsing.
BearSSL::X509List* trustAnchors = nullptr;
#if ENABLE_mTLS
BearSSL::X509List* clientChain = nullptr;
BearSSL::PrivateKey* clientKey = nullptr;
#endif
#else
// The mbedTLS client keeps pointers to the PEM text, so it stays in RAM.
String caCertificate;
#if ENABLE_mTLS
String clientCertificate;
String privateKey;
#endif
#endif
#if ENABLE_mTLS
bool mtlsCredentialsLoaded = false;
#endif
#if ENABLE_MESSAGE_AUTHENTICATION
String authKeyId;
String authSecret;
bool authCredentialsLoaded = false;
#endif
#if ENABLE_ASCON_AEAD128
uint8_t asconKey[16] = {};
char asconDigits[ASCON_RANDOM_DIGITS + 1] = {};
bool asconKeyReady = false;
uint32_t asconKeyCreatedMs = 0;
#endif

#if ENABLE_ASCON_AEAD128 || ENABLE_MESSAGE_AUTHENTICATION
const char kHexAlphabet[] = "0123456789abcdef";

void appendHex(String& out, const uint8_t* data, size_t length) {
    for (size_t index = 0; index < length; ++index) {
        out += kHexAlphabet[data[index] >> 4];
        out += kHexAlphabet[data[index] & 0x0F];
    }
}

int hexNibble(char character) {
    if (character >= '0' && character <= '9') return character - '0';
    if (character >= 'a' && character <= 'f') return character - 'a' + 10;
    if (character >= 'A' && character <= 'F') return character - 'A' + 10;
    return -1;
}

bool hexDecode(const char* hex, uint8_t* out, size_t outLength) {
    for (size_t index = 0; index < outLength; ++index) {
        const int high = hexNibble(hex[2 * index]);
        const int low = high < 0 ? -1 : hexNibble(hex[2 * index + 1]);
        if (low < 0) {
            return false;
        }
        out[index] = static_cast<uint8_t>((high << 4) | low);
    }
    return true;
}
#endif

#if ENABLE_MESSAGE_AUTHENTICATION
// Mirrors JSON.stringify() for strings so the HMAC input matches the broker.
void appendJsonString(String& out, const char* value) {
    out += '"';
    for (const char* cursor = value; *cursor != '\0'; ++cursor) {
        const char character = *cursor;
        switch (character) {
            case '"': out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
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

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js.
bool appendCanonicalJson(String& out, JsonVariantConst value) {
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

bool hmacSha256Hex(const String& data, char signature[65]) {
    uint8_t digest[32];
#if PLATFORM_ESP8266 && !SUPPORT_RTOS
    br_hmac_key_context keyContext;
    br_hmac_context context;
    br_hmac_key_init(&keyContext, &br_sha256_vtable, authSecret.c_str(), authSecret.length());
    br_hmac_init(&context, &keyContext, 0);
    br_hmac_update(&context, data.c_str(), data.length());
    br_hmac_out(&context, digest);
#else
    const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    if (info == nullptr ||
        mbedtls_md_hmac(info, reinterpret_cast<const unsigned char*>(authSecret.c_str()),
                        authSecret.length(),
                        reinterpret_cast<const unsigned char*>(data.c_str()),
                        data.length(), digest) != 0) {
        return false;
    }
#endif
    for (size_t index = 0; index < sizeof(digest); ++index) {
        signature[2 * index] = kHexAlphabet[digest[index] >> 4];
        signature[2 * index + 1] = kHexAlphabet[digest[index] & 0x0F];
    }
    signature[64] = '\0';
    return true;
}

bool canonicalSignature(JsonDocument& document, char signature[65]) {
    document.remove("signature");
    document.remove("keyId");
    String canonical;
    return appendCanonicalJson(canonical, document.as<JsonVariantConst>()) &&
           hmacSha256Hex(canonical, signature);
}

bool signPayload(String& payload) {
    if (!authCredentialsLoaded) {
        DEVICE_LOG_ERROR("[MQTT Auth] Publish blocked: HMAC credentials are missing");
        return false;
    }
    DynamicJsonDocument document(payload.length() * 2 + 256);
    if (deserializeJson(document, payload) || !document.is<JsonObject>()) {
        return false;
    }
    char signature[65];
    if (!canonicalSignature(document, signature)) {
        DEVICE_LOG_WARNING("[MQTT Auth] Cannot sign payload");
        return false;
    }
    document["keyId"] = authKeyId;
    document["signature"] = signature;
    String signedPayload;
    if (serializeJson(document, signedPayload) == 0 || document.overflowed()) {
        return false;
    }
    payload = signedPayload;
    return true;
}

bool verifySignature(JsonDocument& document) {
    if (!authCredentialsLoaded) {
        return false;
    }
    const char* keyId = document["keyId"] | "";
    const char* received = document["signature"] | "";
    if (authKeyId != keyId || strlen(received) != 64) {
        return false;
    }
    char receivedCopy[65];
    strlcpy(receivedCopy, received, sizeof(receivedCopy));
    char expected[65];
    if (!canonicalSignature(document, expected)) {
        return false;
    }
    uint8_t difference = 0;
    for (size_t index = 0; index < 64; ++index) {
        difference |= static_cast<uint8_t>(tolower(receivedCopy[index]) ^ expected[index]);
    }
    return difference == 0;
}
#endif

#if ENABLE_ASCON_AEAD128
bool readAsconTableKey(int index, uint8_t key[16]) {
    const String hexKey = Memory::GetInstance()->readString(
        ASCON_PUBLIC_KEYS_ADDRESS + index * ASCON_PUBLIC_KEY_ENTRY_LENGTH,
        ASCON_PUBLIC_KEY_HEX_LENGTH);
    return hexKey.length() == ASCON_PUBLIC_KEY_HEX_LENGTH &&
           hexDecode(hexKey.c_str(), key, 16);
}

bool rotateAsconKey() {
    char digits[ASCON_RANDOM_DIGITS + 1];
    uint8_t key[16] = {};
    for (int position = 0; position < ASCON_RANDOM_DIGITS; ++position) {
        const int index = static_cast<int>(deviceSecureRandom32() % ASCON_PUBLIC_KEY_COUNT);
        uint8_t tableKey[16];
        if (!readAsconTableKey(index, tableKey)) {
            DEVICE_LOG_ERROR("[ASCON] Key table is missing or invalid");
            return false;
        }
        for (int byte = 0; byte < 16; ++byte) {
            key[byte] ^= tableKey[byte];
        }
        digits[position] = static_cast<char>('0' + index);
    }
    digits[ASCON_RANDOM_DIGITS] = '\0';
    memcpy(asconKey, key, sizeof(asconKey));
    memcpy(asconDigits, digits, sizeof(asconDigits));
    asconKeyCreatedMs = millis();
    asconKeyReady = true;
    DEVICE_LOG_INFO("[ASCON] Session key rotated");
    return true;
}

bool asconRotationDue() {
    return !asconKeyReady || millis() - asconKeyCreatedMs >= ASCON_KEY_ROTATION_MS;
}

// Envelope: {"com":1,"value":"<hex nonce16 | ciphertext | tag16>"}
bool asconEncrypt(String& payload) {
    const size_t length = payload.length();
    uint8_t* cipher = new (std::nothrow) uint8_t[length > 0 ? length : 1];
    if (cipher == nullptr) {
        return false;
    }
    uint8_t nonce[16];
    for (size_t offset = 0; offset < sizeof(nonce); offset += 4) {
        const uint32_t value = deviceSecureRandom32();
        memcpy(nonce + offset, &value, sizeof(value));
    }
    uint8_t tag[16];
    asconAead128Encrypt(asconKey, nonce, nullptr, 0,
                        reinterpret_cast<const uint8_t*>(payload.c_str()), length,
                        cipher, tag);
    String wrapped;
    if (!wrapped.reserve(2 * (length + sizeof(nonce) + sizeof(tag)) + 24)) {
        delete[] cipher;
        return false;
    }
    wrapped = "{\"com\":1,\"value\":\"";
    appendHex(wrapped, nonce, sizeof(nonce));
    appendHex(wrapped, cipher, length);
    appendHex(wrapped, tag, sizeof(tag));
    wrapped += "\"}";
    delete[] cipher;
    payload = wrapped;
    return true;
}

bool asconDecrypt(const char* hex, String& plainText) {
    const size_t hexLength = strlen(hex);
    if (!asconKeyReady || hexLength % 2 != 0 || hexLength <= 64) {
        return false;
    }
    const size_t packedLength = hexLength / 2;
    const size_t cipherLength = packedLength - 32;
    uint8_t* packed = new (std::nothrow) uint8_t[packedLength];
    uint8_t* plain = new (std::nothrow) uint8_t[cipherLength + 1];
    bool ok = packed != nullptr && plain != nullptr &&
              hexDecode(hex, packed, packedLength) &&
              asconAead128Decrypt(asconKey, packed, nullptr, 0, packed + 16, cipherLength,
                                  packed + 16 + cipherLength, plain);
    if (ok) {
        plain[cipherLength] = '\0';
        ok = strlen(reinterpret_cast<const char*>(plain)) == cipherLength;
        if (ok) {
            plainText = reinterpret_cast<const char*>(plain);
        }
    }
    delete[] packed;
    delete[] plain;
    return ok;
}

// Replaces an encrypted command envelope with its plaintext JSON. Only the
// handshake request may arrive unencrypted.
bool unwrapEncryptedCommand(JsonDocument& document) {
    const uint8_t commandType = document["com"] | 0;
    if (commandType == COMMAND_TYPE_ASCON_HANDSHAKE) {
        return true;
    }
    const char* hex = document["value"].as<const char*>();
    if (commandType != COMMAND_TYPE_CONTROL || hex == nullptr) {
        return false;
    }
    String plainText;
    if (!asconDecrypt(hex, plainText)) {
        return false;
    }
    document.clear();
    return !deserializeJson(document, plainText) && document.is<JsonObject>();
}
#endif

bool clockIsValid() {
    return time(nullptr) >= 1704067200;
}

bool ensureBrokerClockStarted() {
    if (clockIsValid()) {
        return true;
    }
    if (!clockRequested && WiFi.status() == WL_CONNECTED) {
        configTime(SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS, 0,
                   "pool.ntp.org", "time.nist.gov");
        clockRequested = true;
    }
    return false;
}

bool parseSettings(const String& json) {
    // Temporary document: the parsed fields are copied into `settings`.
    DynamicJsonDocument settingsDocument(json.length() + JSON_SMALL_BUFFER_SIZE);
    if (deserializeJson(settingsDocument, json)) {
        return false;
    }
    strlcpy(settings.host, settingsDocument["mqtt_host"] | "", sizeof(settings.host));
    settings.port = settingsDocument["mqtt_port"] | 0;
    strlcpy(settings.client, settingsDocument["mqtt_client"] | "", sizeof(settings.client));
#if ENABLE_MQTT_USER_AUTH
    strlcpy(settings.user, settingsDocument["mqtt_user"] | "", sizeof(settings.user));
    strlcpy(settings.password, settingsDocument["mqtt_pwd"] | "", sizeof(settings.password));
#endif
    strlcpy(settings.publishTopic, settingsDocument["public_topic"] | "", sizeof(settings.publishTopic));
    strlcpy(settings.subscribeTopic, settingsDocument["subcribe_topic"] | "", sizeof(settings.subscribeTopic));

    return settings.host[0] != '\0' && settings.port != 0 &&
           settings.client[0] != '\0' && settings.publishTopic[0] != '\0' &&
           settings.subscribeTopic[0] != '\0';
}

#if ENABLE_REPLAY_PROTECTION
// Fields read by verifyReplayProtection() in MqttBroker1885.js.
bool addReplayMetadata(String& payload) {
    DynamicJsonDocument document(payload.length() * 2 + 256);
    if (deserializeJson(document, payload) || !document.is<JsonObject>()) {
        DEVICE_LOG_WARNING("[MQTT] Publish rejected: payload must be a JSON object");
        return false;
    }
    if (!clockIsValid()) {
        DEVICE_LOG_WARNING("[MQTT] Publish deferred: clock is not synchronized");
        return false;
    }

    char nonce[17];
    snprintf(nonce, sizeof(nonce), "%08lx%08lx",
             static_cast<unsigned long>(deviceSecureRandom32()),
             static_cast<unsigned long>(deviceSecureRandom32()));
    document["timestamp"] = static_cast<uint64_t>(time(nullptr)) * 1000ULL;
    document["nonce"] = nonce;

    String protectedPayload;
    if (serializeJson(document, protectedPayload) == 0 || document.overflowed()) {
        return false;
    }
    payload = protectedPayload;
    return true;
}
#endif

#if ENABLE_MQTT_CONNECT_RATE_LIMIT
// Keeps failed CONNECTs below the broker's brute-force threshold.
uint32_t connectFailureTimes[MQTT_CONNECT_MAX_FAILURES] = {};
uint8_t connectFailureCount = 0;
uint8_t connectFailureOldest = 0;

bool connectAttemptAllowed() {
    return connectFailureCount < MQTT_CONNECT_MAX_FAILURES ||
           millis() - connectFailureTimes[connectFailureOldest] >= MQTT_CONNECT_FAILURE_WINDOW_MS;
}

void recordConnectResult(bool connected) {
    if (connected) {
        connectFailureCount = 0;
        connectFailureOldest = 0;
        return;
    }
    uint8_t slot = (connectFailureOldest + connectFailureCount) % MQTT_CONNECT_MAX_FAILURES;
    if (connectFailureCount == MQTT_CONNECT_MAX_FAILURES) {
        slot = connectFailureOldest;
        connectFailureOldest = (connectFailureOldest + 1) % MQTT_CONNECT_MAX_FAILURES;
    } else {
        ++connectFailureCount;
    }
    connectFailureTimes[slot] = millis();
}
#endif

bool publishPayload(const String& data, bool encrypt = true);

#if ENABLE_ASCON_AEAD128
// Sends the current key digits in plaintext, rotating the key first if due.
bool announceAsconKey() {
    if (asconRotationDue() && !rotateAsconKey()) {
        return false;
    }
    return publishPayload(String("{\"co\":6,\"va\":\"") + asconDigits + "\"}", false);
}
#endif

// Order: encrypt -> replay metadata -> sign, so the broker can check the
// replay fields and signature without the Ascon key.
bool publishPayload(const String& data, bool encrypt) {
    if (!mqttClient.connected() || settings.publishTopic[0] == '\0') {
        return false;
    }
    String payload = data;
#if ENABLE_ASCON_AEAD128
    if (encrypt) {
        // The server learns a new key only from the handshake; if that
        // publish fails, retry the rotation instead of using an unknown key.
        if (asconRotationDue() && !announceAsconKey()) {
            asconKeyReady = false;
            DEVICE_LOG_WARNING("[ASCON] Publish blocked: session key is not available");
            return false;
        }
        if (!asconEncrypt(payload)) {
            DEVICE_LOG_WARNING("[ASCON] Publish blocked: encryption failed");
            return false;
        }
    }
#else
    (void)encrypt;
#endif
#if ENABLE_REPLAY_PROTECTION
    if (!addReplayMetadata(payload)) {
        return false;
    }
#endif
#if ENABLE_MESSAGE_AUTHENTICATION
    if (!signPayload(payload)) {
        return false;
    }
#endif
    if (payload.length() >= MQTT_PACKET_SIZE) {
        DEVICE_LOG_WARNING("[MQTT] Publish rejected: payload too large");
        return false;
    }
    return mqttClient.publish(settings.publishTopic, payload.c_str());
}

void sendCurrentStatus() {
    const String payload = getInfoDevice(sensorValue, statusDevice);
    if (payload.length() > 0) {
        (void)publishPayload(payload);
    }
}

void sendScheduleReply(const char* event) {
    const String payload = SystemTask::schedulerJson(event);
    if (payload.length() > 0) {
        (void)publishPayload(payload);
    }
}

bool handleScheduleCommand(JsonDocument& document) {
    const char* command = document["cmd"] | "";
    if (strcmp(command, "schedule.status") == 0) {
        sendScheduleReply("schedule.status");
        return true;
    }

    const int slot = document["id"] | -1;
    if (strcmp(command, "schedule.clear") == 0) {
        sendScheduleReply(slot >= 0 && slot < SYSTEM_TASK_SCHEDULE_MAX_RULES &&
                SystemTask::clearSchedule(static_cast<uint8_t>(slot))
            ? "schedule.cleared" : "schedule.error");
        return true;
    }
    if (strcmp(command, "schedule.set") != 0) {
        return false;
    }

    // The schedule has no port/GPIO field: it is permanently bound to the pump.
    if (document.containsKey("port") || slot < 0 ||
        slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES) {
        sendScheduleReply("schedule.error");
        return true;
    }
    const char* period = document["period"] | "";
    const char* action = document["action"] | "";
    const int hour = document["hour"] | -1;
    const int minute = document["minute"] | -1;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 ||
        (strcmp(action, "on") != 0 && strcmp(action, "off") != 0)) {
        sendScheduleReply("schedule.error");
        return true;
    }

    SystemControlSchedule rule = {};
    rule.enabled = 1;
    rule.hour = static_cast<uint8_t>(hour);
    rule.minute = static_cast<uint8_t>(minute);
    rule.turnOn = strcmp(action, "on") == 0 ? 1 : 0;
    if (strcmp(period, "weekly") == 0) {
        const int weekday = document["weekday"] | -1;
        if (weekday < 0 || weekday > 6) {
            sendScheduleReply("schedule.error");
            return true;
        }
        rule.period = SYSTEM_SCHEDULE_WEEKLY;
        rule.weekday = static_cast<uint8_t>(weekday);
    } else if (strcmp(period, "monthly") == 0) {
        const int day = document["day"] | -1;
        if (day < 1 || day > 31) {
            sendScheduleReply("schedule.error");
            return true;
        }
        rule.period = SYSTEM_SCHEDULE_MONTHLY;
        rule.day = static_cast<uint8_t>(day);
    } else if (strcmp(period, "yearly") == 0) {
        const int month = document["month"] | -1;
        const int day = document["day"] | -1;
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            sendScheduleReply("schedule.error");
            return true;
        }
        rule.period = SYSTEM_SCHEDULE_YEARLY;
        rule.month = static_cast<uint8_t>(month);
        rule.day = static_cast<uint8_t>(day);
    } else {
        sendScheduleReply("schedule.error");
        return true;
    }

    sendScheduleReply(SystemTask::configureSchedule(static_cast<uint8_t>(slot), rule)
        ? "schedule.saved" : "schedule.error");
    return true;
}

void mqttCallback(char* topic, byte* data, unsigned int length) {
    (void)topic;
    if (length == 0 || length >= MQTT_PACKET_SIZE) {
        DEVICE_LOG_WARNING("[MQTT] Rejected oversized command");
        return;
    }

    // Copy mode: verification removes fields and decryption reuses the document.
    DynamicJsonDocument document(MQTT_COMMAND_DOC_SIZE + length);
    if (deserializeJson(document, reinterpret_cast<const char*>(data), length) ||
        !document.is<JsonObject>()) {
        DEVICE_LOG_WARNING("[MQTT] Rejected invalid command JSON");
        return;
    }
#if ENABLE_MESSAGE_AUTHENTICATION
    if (!verifySignature(document)) {
        DEVICE_LOG_WARNING("[MQTT Auth] Rejected command with invalid signature");
        return;
    }
#endif
#if ENABLE_ASCON_AEAD128
    if (!unwrapEncryptedCommand(document)) {
        DEVICE_LOG_WARNING("[ASCON] Rejected unencrypted or undecryptable command");
        return;
    }
#endif

    if (handleScheduleCommand(document)) {
        return;
    }

    const uint8_t commandType = document["com"] | 0;
#if ENABLE_ASCON_AEAD128
    if (commandType == COMMAND_TYPE_ASCON_HANDSHAKE) {
        if (!announceAsconKey()) {
            DEVICE_LOG_WARNING("[ASCON] Handshake reply failed");
        }
        return;
    }
#endif
    if (commandType == COMMAND_TYPE_OTHER) {
        sendCurrentStatus();
        return;
    }
    if (commandType != COMMAND_TYPE_CONTROL) {
        DEVICE_LOG_WARNING("[MQTT] Rejected unknown command");
        return;
    }
    if (!document["value"].is<int>()) {
        DEVICE_LOG_WARNING("[MQTT] Rejected command without an integer value");
        return;
    }
    const int commandValue = document["value"].as<int>();
    if (commandValue < 0 || commandValue > DEVICE_OUTPUT_MASK) {
        DEVICE_LOG_WARNING("[MQTT] Rejected out-of-range control value");
        return;
    }

    pendingCommand.commandType = commandType;
    pendingCommand.commandValue = static_cast<uint8_t>(commandValue);
    pendingCommand.reserved = COMMAND_RESERVED_CONTROL;
#if SUPPORT_RTOS
    if (deviceCommandQueue == nullptr ||
        xQueueSend(deviceCommandQueue, &pendingCommand, 0) != pdTRUE) {
        DEVICE_LOG_WARNING("[MQTT] Device command queue is full");
        return;
    }
#else
    MemoryData::GetInstance().deviceCommand_ = &pendingCommand;
#endif
    sendCurrentStatus();
}
} // namespace

#if ENABLE_ASCON_AEAD128
String getAsconEncryptedPayload(const String& payload) {
    String encrypted = payload;
    if (!asconKeyReady || !asconEncrypt(encrypted)) {
        return String(F("{\"error\":\"ascon_key_not_ready\"}"));
    }
    return encrypted;
}
#endif

// The CA is stored at the same address for TLS and mTLS. Credentials must be
// ECDSA P-256 (the EEPROM regions are sized for it).
static bool loadTlsCredentials() {
    String ca = Memory::GetInstance()->readLargeString(MTLS_CA_CERT_ADDRESS,
                                                       MTLS_CA_CERT_MAX_LENGTH);
#if ENABLE_mTLS
    String certificate = Memory::GetInstance()->readLargeString(MTLS_CLIENT_CERT_ADDRESS,
                                                                MTLS_CLIENT_CERT_MAX_LENGTH);
    String key = Memory::GetInstance()->readLargeString(MTLS_PRIVATE_KEY_ADDRESS,
                                                        MTLS_PRIVATE_KEY_MAX_LENGTH);
    if (certificate.length() == 0 || key.length() == 0) {
        return false;
    }
#endif
    if (ca.length() == 0) {
        return false;
    }
#if PLATFORM_ESP8266 && !SUPPORT_RTOS
    // New objects are installed before the old ones are deleted, because the
    // transport keeps pointers to them.
    BearSSL::X509List* anchors = new BearSSL::X509List();
    if (!anchors->append(ca.c_str())) {
        delete anchors;
        return false;
    }
#if ENABLE_mTLS
    BearSSL::X509List* chain = new BearSSL::X509List();
    BearSSL::PrivateKey* privateKey = new BearSSL::PrivateKey();
    if (!chain->append(certificate.c_str()) || !privateKey->parse(key.c_str()) ||
        !privateKey->isEC()) {
        DEVICE_LOG_ERROR("[MQTT] Client certificate/key must be ECDSA P-256 PEM");
        delete anchors;
        delete chain;
        delete privateKey;
        return false;
    }
    mqttTransport.setClientECCert(chain, privateKey, BR_KEYTYPE_KEYX | BR_KEYTYPE_SIGN,
                                  BR_KEYTYPE_EC);
    delete clientChain;
    delete clientKey;
    clientChain = chain;
    clientKey = privateKey;
#endif
    mqttTransport.setTrustAnchors(anchors);
    delete trustAnchors;
    trustAnchors = anchors;
#else
    caCertificate = ca;
    mqttTransport.setCACert(caCertificate.c_str());
#if ENABLE_mTLS
    clientCertificate = certificate;
    privateKey = key;
    mqttTransport.setCertificate(clientCertificate.c_str());
    mqttTransport.setPrivateKey(privateKey.c_str());
#endif
#endif
    return true;
}

void NetWork_Mqtt::setupInfoMQTT() {
    settingsLoaded = parseSettings(Memory::GetInstance()->readString(WIFI_SETUP_JSON, WIFI_SETUP_JSON_MAX_LENGTH));
    if (!settingsLoaded) {
        DEVICE_LOG_WARNING("[MQTT] Invalid or missing broker configuration");
        return;
    }

    if (!loadTlsCredentials()) {
        DEVICE_LOG_ERROR("[MQTT] TLS credentials are missing or invalid; insecure fallback is disabled");
        return;
    }
#if ENABLE_mTLS
    mtlsCredentialsLoaded = true;
#endif

#if ENABLE_MESSAGE_AUTHENTICATION
    authKeyId = Memory::GetInstance()->readLargeString(MESSAGE_AUTH_KEY_ID_ADDRESS,
                                                       MESSAGE_AUTH_KEY_ID_MAX_LENGTH);
    authSecret = Memory::GetInstance()->readLargeString(MESSAGE_AUTH_SECRET_ADDRESS,
                                                        MESSAGE_AUTH_SECRET_MAX_LENGTH);
    authCredentialsLoaded = authKeyId.length() > 0 && authSecret.length() > 0;
    if (!authCredentialsLoaded) {
        DEVICE_LOG_ERROR("[MQTT Auth] HMAC keyId/secret are missing; MQTT traffic is blocked");
    }
#endif

#if PLATFORM_ESP8266 && !SUPPORT_RTOS
    // Smaller than BearSSL's 16 KB default, but large enough for one record.
    mqttTransport.setBufferSizes(TLS_RX_BUFFER_SIZE, TLS_TX_BUFFER_SIZE);
#endif

    mqttClient.setServer(settings.host, settings.port);
    mqttClient.setCallback(mqttCallback);
    if (!mqttClient.setBufferSize(MQTT_PACKET_SIZE)) {
        DEVICE_LOG_WARNING("[MQTT] Cannot allocate packet buffer");
    }
    DEVICE_LOG_INFO("[MQTT] Broker configuration loaded");
}

void NetWork_Mqtt::getAllDataSetup() {}

void NetWork_Mqtt::disconnetMqtt() {
    mqttClient.disconnect();
    mqttTransport.stop();
}

void NetWork_Mqtt::connectMqtt() {
    if (!settingsLoaded || WiFi.status() != WL_CONNECTED || !ensureBrokerClockStarted()) {
        return;
    }
#if ENABLE_mTLS
    if (!mtlsCredentialsLoaded) {
        return;
    }
#endif
    if (mqttClient.connected()) {
        return;
    }

#if ENABLE_MQTT_CONNECT_RATE_LIMIT
    if (!connectAttemptAllowed()) {
        return;
    }
#endif

#if ENABLE_MQTT_USER_AUTH
    const bool connected = mqttClient.connect(settings.client, settings.user, settings.password);
#else
    // With mTLS the broker identifies the device by clientId + certificate.
    const bool connected = mqttClient.connect(settings.client);
#endif
#if ENABLE_MQTT_CONNECT_RATE_LIMIT
    recordConnectResult(connected);
#endif
    if (!connected) {
        DEVICE_LOG_WARNING(String("[MQTT] Connect failed, state=") + mqttClient.state());
        return;
    }
    if (!mqttClient.subscribe(settings.subscribeTopic)) {
        DEVICE_LOG_WARNING("[MQTT] Subscribe rejected (check mqtt_acl.json)");
    }
    DEVICE_LOG_INFO("[MQTT] Connected");
#if ENABLE_ASCON_AEAD128
    // Re-announce on every connect: the server may have lost the session key.
    if (!announceAsconKey()) {
        DEVICE_LOG_WARNING("[ASCON] Handshake publish failed");
    }
#endif
}

unsigned char NetWork_Mqtt::checkStatusMqtt() {
    return mqttClient.connected() ? 1 : 0;
}

void NetWork_Mqtt::sendMessageInfo(char* data) {
    if (data != nullptr && !publishPayload(String(data))) {
        DEVICE_LOG_WARNING("[MQTT] Publish failed");
    }
}

void NetWork_Mqtt::MqttSubscribe(char* topic) {
    if (mqttClient.connected() && topic != nullptr) {
        (void)mqttClient.subscribe(topic);
    }
}

void NetWork_Mqtt::lisenMqtt() {
    if (mqttClient.connected()) {
        mqttClient.loop();
    }
}

void NetWork_Mqtt::MqttReconnect() {
    connectMqtt();
}
