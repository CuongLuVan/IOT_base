#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include "Common.h"
#include "define_All.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <esp_system.h>
#include <time.h>

#if ENABLE_MESSAGE_AUTHENTICATION
#include <mbedtls/md.h>
#endif

#if ENABLE_TLS_SSL || ENABLE_mTLS
#include <WiFiClientSecure.h>
using MqttWiFiClient = WiFiClientSecure;
#else
#include <WiFiClient.h>
using MqttWiFiClient = WiFiClient;
#endif

#include "Memory.h"
#include "MemoryData.h"
#include "DebugInfo.h"
#include "HighSpeedSampler.h"
#include "SystemTask.h"
#if ENABLE_ASCON_AEAD128
#include <new>
#include "AsconAead128.h"
#endif

#if !ENABLE_TLS_SSL || !ENABLE_mTLS
#error "This firmware requires TLS with client-certificate authentication for MQTT."
#endif

MqttWiFiClient EspClient;
PubSubClient MqttClient(EspClient);         // MQTT Client

extern InfoSensor sensorValue;
extern InfoDeviceControl statusDevice;
extern QueueHandle_t deviceCommandQueue;

// Only the fields used by this firmware; sizes follow PubSubClient limits.
struct SYSCFG {
  char          mqtt_host[128];
  uint16_t      mqtt_port;
  char          mqtt_client[33];
#if ENABLE_MQTT_USER_AUTH
  char          mqtt_user[33];
  char          mqtt_pwd[33];
#endif
  char          public_topic[65];
  char          subcribe_topic[65];
} Settings;

#if ENABLE_TLS_SSL || ENABLE_mTLS
// WiFiClientSecure keeps these pointers, so the PEM strings stay global.
String tlsCaCertificate;
#endif

#if ENABLE_mTLS
String mtlsClientCertificate;
String mtlsPrivateKey;
bool mtlsCredentialsLoaded = false;
#endif
bool mqttConfigurationReady = false;

static bool copyMqttSetting(JsonVariantConst source, char *destination,
                            size_t destinationSize, bool required,
                            const char *settingName)
{
  const char *value = source.as<const char *>();
  if (value == NULL) {
    if (!required) {
      destination[0] = '\0';
      return true;
    }
    DEVICE_LOG_INFO(String("[MQTT] Missing required setting: ") + settingName);
    return false;
  }

  const size_t length = strlen(value);
  if ((required && length == 0) || length >= destinationSize) {
    DEVICE_LOG_INFO(String("[MQTT] Invalid or oversized setting: ") + settingName);
    return false;
  }
  memcpy(destination, value, length + 1);
  return true;
}

static bool isPublishTopicValid(const char *topic)
{
  return topic != NULL && topic[0] != '\0' &&
      strchr(topic, '+') == NULL && strchr(topic, '#') == NULL;
}

#if ENABLE_mTLS
static bool containsPemBlock(const String &pem, const char *beginMarker,
                             const char *endMarker)
{
  const int begin = pem.indexOf(beginMarker);
  return begin >= 0 && pem.indexOf(endMarker, begin + strlen(beginMarker)) >= 0;
}

static bool isCertificatePem(const String &pem)
{
  return containsPemBlock(pem, "-----BEGIN CERTIFICATE-----",
                         "-----END CERTIFICATE-----");
}

static bool isPrivateKeyPem(const String &pem)
{
  if (containsPemBlock(pem, "-----BEGIN ENCRYPTED PRIVATE KEY-----",
                       "-----END ENCRYPTED PRIVATE KEY-----")) {
    return false;
  }
  return containsPemBlock(pem, "-----BEGIN PRIVATE KEY-----",
                          "-----END PRIVATE KEY-----") ||
      containsPemBlock(pem, "-----BEGIN RSA PRIVATE KEY-----",
                       "-----END RSA PRIVATE KEY-----") ||
      containsPemBlock(pem, "-----BEGIN EC PRIVATE KEY-----",
                       "-----END EC PRIVATE KEY-----");
}
#endif

#if ENABLE_ASCON_AEAD128 || ENABLE_MESSAGE_AUTHENTICATION
static const char hexAlphabet[] = "0123456789abcdef";

static void appendHex(String &out, const uint8_t *data, size_t length)
{
    for (size_t i = 0; i < length; i++) {
        out += hexAlphabet[data[i] >> 4];
        out += hexAlphabet[data[i] & 0x0F];
    }
}

static int hexNibble(char c)
{
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static bool hexDecode(const char *hex, uint8_t *out, size_t outLen)
{
    for (size_t i = 0; i < outLen; i++) {
        int hi = hexNibble(hex[2 * i]);
        int lo = hi < 0 ? -1 : hexNibble(hex[2 * i + 1]);
        if (lo < 0) {
            return false;
        }
        out[i] = (uint8_t)((hi << 4) | lo);
    }
    return true;
}
#endif

#if ENABLE_ASCON_AEAD128
static uint8_t currentAsconKey[16] = {0};
static char currentAsconDigits[ASCON_RANDOM_DIGITS + 1] = {0};
static uint32_t asconKeyCreatedMs = 0;
static bool asconKeyReady = false;

static bool readAsconPublicKey(int index, uint8_t key[16])
{
    String hexKey = Memory::GetInstance()->readString(
        ASCON_PUBLIC_KEYS_ADDRESS + index * ASCON_PUBLIC_KEY_ENTRY_LENGTH,
        ASCON_PUBLIC_KEY_HEX_LENGTH);
    return hexKey.length() == ASCON_PUBLIC_KEY_HEX_LENGTH &&
           hexDecode(hexKey.c_str(), key, 16);
}

// The key lives only in RAM: a new one is chosen at boot and every
// ASCON_KEY_ROTATION_MS, and announced to the server by the handshake.
static bool rotateAsconKey()
{
    char digits[ASCON_RANDOM_DIGITS + 1];
    uint8_t result[16] = {0};
    for (int i = 0; i < ASCON_RANDOM_DIGITS; i++) {
        int index = (int)(esp_random() % ASCON_PUBLIC_KEY_COUNT);
        uint8_t key[16];
        if (!readAsconPublicKey(index, key)) {
            DEVICE_LOG_INFO("[ASCON] Key table is missing or invalid in EEPROM");
            return false;
        }
        for (int b = 0; b < 16; b++) {
            result[b] ^= key[b];
        }
        digits[i] = (char)('0' + index);
    }
    digits[ASCON_RANDOM_DIGITS] = '\0';
    memcpy(currentAsconKey, result, sizeof(currentAsconKey));
    memcpy(currentAsconDigits, digits, sizeof(currentAsconDigits));
    asconKeyCreatedMs = millis();
    asconKeyReady = true;
    DEVICE_LOG_INFO("[ASCON] Session key rotated");
    return true;
}

static bool asconRotationDue()
{
    return !asconKeyReady || millis() - asconKeyCreatedMs >= ASCON_KEY_ROTATION_MS;
}

// Envelope: {"com":1,"value":"<hex nonce16 | ciphertext | tag16>"}
static bool asconEncrypt(String &payload)
{
    size_t len = payload.length();
    uint8_t *cipher = new (std::nothrow) uint8_t[len > 0 ? len : 1];
    if (cipher == nullptr) {
        return false;
    }
    uint8_t nonce[16];
    esp_fill_random(nonce, sizeof(nonce));
    uint8_t tag[16];
    asconAead128Encrypt(currentAsconKey, nonce, nullptr, 0,
                        (const uint8_t *)payload.c_str(), len, cipher, tag);
    String wrapped;
    if (!wrapped.reserve(2 * (len + 32) + 24)) {
        delete[] cipher;
        return false;
    }
    wrapped = "{\"com\":1,\"value\":\"";
    appendHex(wrapped, nonce, sizeof(nonce));
    appendHex(wrapped, cipher, len);
    appendHex(wrapped, tag, sizeof(tag));
    wrapped += "\"}";
    delete[] cipher;
    payload = wrapped;
    return true;
}

static bool asconDecrypt(const char *hex, String &plainText)
{
    size_t hexLen = strlen(hex);
    if (!asconKeyReady || hexLen % 2 != 0 || hexLen <= 64) {
        return false;
    }
    size_t packedLen = hexLen / 2;
    size_t cipherLen = packedLen - 32;
    uint8_t *packed = new (std::nothrow) uint8_t[packedLen];
    uint8_t *plain = new (std::nothrow) uint8_t[cipherLen + 1];
    bool ok = packed != nullptr && plain != nullptr &&
              hexDecode(hex, packed, packedLen) &&
              asconAead128Decrypt(currentAsconKey, packed, nullptr, 0,
                                  packed + 16, cipherLen,
                                  packed + 16 + cipherLen, plain);
    if (ok) {
        plain[cipherLen] = '\0';
        ok = strlen((const char *)plain) == cipherLen;
        if (ok) {
            plainText = (const char *)plain;
        }
    }
    delete[] packed;
    delete[] plain;
    return ok;
}

// Replaces an encrypted command with its plaintext JSON. Only the handshake
// request ({"com":7}) may arrive unencrypted.
static bool unwrapEncryptedCommand(JsonDocument &doc)
{
    int com = doc["com"] | 0;
    if (com == COMMAND_TYPE_ASCON_HANDSHAKE) {
        return true;
    }
    const char *hex = doc["value"].as<const char *>();
    if (com != COMMAND_TYPE_CONTROL || hex == nullptr) {
        return false;
    }
    String plainText;
    if (!asconDecrypt(hex, plainText)) {
        return false;
    }
    doc.clear();
    return !deserializeJson(doc, plainText) && doc.is<JsonObject>();
}

String getAsconEncryptedPayload(const String &payload)
{
    String encrypted = payload;
    if (!asconKeyReady || !asconEncrypt(encrypted)) {
        return "{\"error\":\"ascon_key_not_ready\"}";
    }
    return encrypted;
}
#endif

#if ENABLE_MESSAGE_AUTHENTICATION
String messageAuthenticationKeyId;
String messageAuthenticationSecret;
bool messageAuthenticationLoaded = false;

// Mirrors JSON.stringify() for strings so the HMAC input matches the broker.
static void appendJsonString(String &out, const char *value)
{
    out += '"';
    for (const char *p = value; *p != '\0'; ++p) {
        char c = *p;
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if ((uint8_t)c < 0x20) {
                    char escaped[7];
                    snprintf(escaped, sizeof(escaped), "\\u%04x", (uint8_t)c);
                    out += escaped;
                } else {
                    out += c;
                }
        }
    }
    out += '"';
}

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js.
static bool appendCanonicalJson(String &out, JsonVariantConst value)
{
    if (value.is<JsonObjectConst>()) {
        JsonObjectConst object = value.as<JsonObjectConst>();
        const char *keys[MESSAGE_AUTH_MAX_FIELDS];
        size_t count = 0;
        for (JsonPairConst pair : object) {
            if (count == MESSAGE_AUTH_MAX_FIELDS) {
                return false;
            }
            const char *key = pair.key().c_str();
            size_t pos = count++;
            while (pos > 0 && strcmp(keys[pos - 1], key) > 0) {
                keys[pos] = keys[pos - 1];
                --pos;
            }
            keys[pos] = key;
        }
        out += '{';
        for (size_t i = 0; i < count; i++) {
            if (i > 0) out += ',';
            appendJsonString(out, keys[i]);
            out += ':';
            if (!appendCanonicalJson(out, object[keys[i]])) {
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
            if (!first) out += ',';
            first = false;
            if (!appendCanonicalJson(out, item)) {
                return false;
            }
        }
        out += ']';
        return true;
    }
    if (value.is<const char *>()) {
        appendJsonString(out, value.as<const char *>());
        return true;
    }
    String scalar;
    serializeJson(value, scalar);
    out += scalar;
    return true;
}

static bool calculateHmacSha256(const String &data, char signature[65])
{
    const mbedtls_md_info_t *mdInfo = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    unsigned char digest[32];
    if (mdInfo == NULL ||
        mbedtls_md_hmac(mdInfo,
            (const unsigned char *)messageAuthenticationSecret.c_str(),
            messageAuthenticationSecret.length(),
            (const unsigned char *)data.c_str(), data.length(), digest) != 0) {
        return false;
    }
    for (size_t i = 0; i < sizeof(digest); ++i) {
        signature[2 * i] = hexAlphabet[digest[i] >> 4];
        signature[2 * i + 1] = hexAlphabet[digest[i] & 0x0F];
    }
    signature[64] = '\0';
    return true;
}

// The broker drops "signature" and "keyId" before computing the HMAC.
static bool canonicalSignature(JsonDocument &document, char signature[65])
{
    document.remove("signature");
    document.remove("keyId");
    String canonical;
    return appendCanonicalJson(canonical, document.as<JsonVariantConst>()) &&
           calculateHmacSha256(canonical, signature);
}

static bool signMqttPayload(String &payload)
{
    if (!messageAuthenticationLoaded) {
        DEVICE_LOG_INFO("[MQTT Auth] Publish blocked: credentials are not loaded");
        return false;
    }
    DynamicJsonDocument document(payload.length() * 2 + 256);
    if (deserializeJson(document, payload) || !document.is<JsonObject>()) {
        DEVICE_LOG_INFO("[MQTT Auth] Cannot sign a non-JSON payload");
        return false;
    }
    char signature[65];
    if (!canonicalSignature(document, signature)) {
        DEVICE_LOG_INFO("[MQTT Auth] HMAC calculation failed");
        return false;
    }
    document["keyId"] = messageAuthenticationKeyId;
    document["signature"] = signature;
    String signedPayload;
    if (serializeJson(document, signedPayload) == 0 || document.overflowed()) {
        return false;
    }
    payload = signedPayload;
    return true;
}

static bool verifyMqttPayload(JsonDocument &document)
{
    if (!messageAuthenticationLoaded) {
        return false;
    }
    const char *keyId = document["keyId"] | "";
    const char *received = document["signature"] | "";
    if (messageAuthenticationKeyId != keyId || strlen(received) != 64) {
        return false;
    }
    char receivedCopy[65];
    strlcpy(receivedCopy, received, sizeof(receivedCopy));
    char expected[65];
    if (!canonicalSignature(document, expected)) {
        return false;
    }
    unsigned char difference = 0;
    for (size_t i = 0; i < 64; ++i) {
        difference |= (unsigned char)(tolower(receivedCopy[i]) ^ expected[i]);
    }
    return difference == 0;
}
#endif

static bool clockIsValid()
{
  return time(NULL) >= 1704067200;
}

static bool ensureBrokerClockSynced()
{
  static bool ntpConfigured = false;
  if (!ntpConfigured) {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    ntpConfigured = true;
  }
  for (uint8_t attempt = 0; attempt < 50; ++attempt) {
    if (clockIsValid()) {
      return true;
    }
    delay(100);
  }
  return false;
}

#if ENABLE_REPLAY_PROTECTION
// Fields read by verifyReplayProtection() in MqttBroker1885.js.
static bool addBrokerReplayMetadata(String& payload)
{
  DynamicJsonDocument document(payload.length() * 2 + 256);
  if (deserializeJson(document, payload) || !document.is<JsonObject>()) {
    DEVICE_LOG_INFO("[MQTT] Publish blocked: MQTT JSON payload must be an object");
    return false;
  }
  if (!clockIsValid()) {
    DEVICE_LOG_INFO("[MQTT] Publish blocked: system clock is not synchronized");
    return false;
  }

  char nonce[17];
  snprintf(nonce, sizeof(nonce), "%08lx%08lx",
      (unsigned long)esp_random(), (unsigned long)esp_random());
  document["timestamp"] = (uint64_t)time(NULL) * 1000ULL;
  document["nonce"] = nonce;

  String protectedPayload;
  if (serializeJson(document, protectedPayload) == 0 || document.overflowed()) {
    DEVICE_LOG_INFO("[MQTT] Publish blocked: failed to serialize replay metadata");
    return false;
  }
  payload = protectedPayload;
  return true;
}
#endif

static bool publishSecured(String payload, bool encrypt = true);

#if ENABLE_ASCON_AEAD128
// Sends the key digits in plaintext, rotating the key first if it is due.
static bool announceAsconKey()
{
  if (asconRotationDue() && !rotateAsconKey()) {
    return false;
  }
  return publishSecured(String("{\"co\":6,\"va\":\"") + currentAsconDigits + "\"}", false);
}
#endif

// Single publish path. Order: encrypt -> replay metadata -> sign, so the
// broker can check replay fields and the signature without the Ascon key.
static bool publishSecured(String payload, bool encrypt)
{
  if (!MqttClient.connected()) {
    return false;
  }
#if ENABLE_ASCON_AEAD128
  if (encrypt) {
    // The server learns a new key only from the handshake; if that publish
    // fails, retry the rotation instead of using a key it does not know.
    if (asconRotationDue() && !announceAsconKey()) {
      asconKeyReady = false;
      DEVICE_LOG_INFO("[ASCON] Publish blocked: session key is not available");
      return false;
    }
    if (!asconEncrypt(payload)) {
      DEVICE_LOG_INFO("[ASCON] Publish blocked: encryption failed");
      return false;
    }
  }
#else
  (void)encrypt;
#endif
#if ENABLE_REPLAY_PROTECTION
  if (!addBrokerReplayMetadata(payload)) {
    return false;
  }
#endif
#if ENABLE_MESSAGE_AUTHENTICATION
  if (!signMqttPayload(payload)) {
    return false;
  }
#endif
  if (payload.length() >= MQTT_PACKET_SIZE) {
    DEVICE_LOG_INFO("[MQTT] Publish blocked: payload too large");
    return false;
  }
  // Never retained: a retained copy would be replayed to later subscribers.
  if (!MqttClient.publish(Settings.public_topic, payload.c_str(), false)) {
    DEVICE_LOG_INFO("[MQTT] Publish failed");
    return false;
  }
  return true;
}

static void sendMessageInfoPublish(const String &data)
{
  publishSecured(data);
}

#if ENABLE_MQTT_CONNECT_RATE_LIMIT
// Keeps failed CONNECTs below the broker's brute-force threshold.
static uint32_t connectFailureTimes[MQTT_CONNECT_MAX_FAILURES] = {0};
static uint8_t connectFailureCount = 0;
static uint8_t connectFailureOldest = 0;

static bool connectAttemptAllowed()
{
  return connectFailureCount < MQTT_CONNECT_MAX_FAILURES ||
         millis() - connectFailureTimes[connectFailureOldest] >= MQTT_CONNECT_FAILURE_WINDOW_MS;
}

static void recordConnectResult(bool connected)
{
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
    connectFailureCount++;
  }
  connectFailureTimes[slot] = millis();
}
#endif

static bool parseHighSpeedMode(const char* mode, HighSpeedMode& result)
{
  if (strcmp(mode, "adc") == 0) {
    result = HS_MODE_ADC_10KHZ;
  } else if (strcmp(mode, "imu") == 0) {
    result = HS_MODE_ICM32K;
  } else if (strcmp(mode, "ads") == 0) {
    result = HS_MODE_ADS100K;
  } else if (strcmp(mode, "all") == 0) {
    result = HS_MODE_ALL;
  } else {
    return false;
  }
  return true;
}

static void publishHighSpeedReply(const char* event, const char* reason = NULL)
{
  StaticJsonDocument<160> response;
  response["event"] = event;
  response["active"] = HighSpeedSampler::GetInstance().isSamplingActive();
  if (reason != NULL) {
    response["reason"] = reason;
  }
  String payload;
  serializeJson(response, payload);
  sendMessageInfoPublish(payload);
}

static bool handleHighSpeedCommand(JsonDocument& doc)
{
  const char* command = doc["cmd"] | "";
  if (strcmp(command, "capture.start") == 0) {
    const char* modeName = doc["mode"] | "";
    const char* targetHost = doc["udp_host"] | "";
    const uint32_t targetPort = doc["udp_port"] | 0;
    const uint32_t durationMs = doc["duration_ms"] | 10000;

    HighSpeedConfig config;
    if (!parseHighSpeedMode(modeName, config.mode)) {
      publishHighSpeedReply("capture.error", "invalid_mode");
      return true;
    }
    if (!config.udpTargetIP.fromString(targetHost) || targetPort == 0 ||
        targetPort > 65535 || config.udpTargetIP[0] == 0 ||
        config.udpTargetIP[0] >= 224) {
      publishHighSpeedReply("capture.error", "invalid_udp_target");
      return true;
    }
    if (durationMs == 0 || durationMs > HS_CAPTURE_MAX_DURATION_MS) {
      publishHighSpeedReply("capture.error", "invalid_duration");
      return true;
    }
    config.udpTargetPort = static_cast<uint16_t>(targetPort);
    config.durationMs = durationMs;
    HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
    if (sampler.isSamplingActive()) {
      publishHighSpeedReply("capture.error", "capture_busy");
      return true;
    }
    if (!sampler.isModeAvailable(config.mode)) {
      publishHighSpeedReply("capture.error", "sensor_or_sampler_unavailable");
      return true;
    }
    if (!sampler.startSampling(config)) {
      publishHighSpeedReply("capture.error", "capture_start_failed");
      return true;
    }
    publishHighSpeedReply("capture.started");
    return true;
  }

  if (strcmp(command, "capture.stop") == 0) {
    HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
    const bool wasActive = sampler.isSamplingActive();
    sampler.stopSampling();
    publishHighSpeedReply(wasActive ? "capture.stopping" : "capture.stopped");
    return true;
  }

  if (strcmp(command, "capture.status") == 0) {
    publishHighSpeedReply("capture.status");
    return true;
  }
  return false;
}

static void publishScheduleReply(const char* event)
{
  const String payload = SystemTask::schedulerJson(event);
  if (payload.length() > 0) {
    sendMessageInfoPublish(payload);
  }
}

static bool handleScheduleCommand(JsonDocument& doc)
{
  const char* command = doc["cmd"] | "";
  if (strcmp(command, "schedule.status") == 0) {
    publishScheduleReply("schedule.status");
    return true;
  }

  const int slot = doc["id"] | -1;
  if (strcmp(command, "schedule.clear") == 0) {
    if (slot < 0 || slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES ||
        !SystemTask::clearSchedule(static_cast<uint8_t>(slot))) {
      publishScheduleReply("schedule.error");
    } else {
      publishScheduleReply("schedule.cleared");
    }
    return true;
  }

  if (strcmp(command, "schedule.set") != 0) {
    return false;
  }

  // A schedule never accepts a GPIO or port selector: it controls only the
  // fixed pump bit declared by SYSTEM_TASK_SCHEDULE_PORT_MASK.
  if (doc.containsKey("port") || slot < 0 || slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES) {
    publishScheduleReply("schedule.error");
    return true;
  }

  const char* periodName = doc["period"] | "";
  const char* actionName = doc["action"] | "";
  const int hour = doc["hour"] | -1;
  const int minute = doc["minute"] | -1;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 ||
      (strcmp(actionName, "on") != 0 && strcmp(actionName, "off") != 0)) {
    publishScheduleReply("schedule.error");
    return true;
  }

  SystemControlSchedule rule = {};
  rule.enabled = 1;
  rule.hour = static_cast<uint8_t>(hour);
  rule.minute = static_cast<uint8_t>(minute);
  rule.turnOn = strcmp(actionName, "on") == 0 ? 1 : 0;

  if (strcmp(periodName, "weekly") == 0) {
    const int weekday = doc["weekday"] | -1;
    if (weekday < 0 || weekday > 6) {
      publishScheduleReply("schedule.error");
      return true;
    }
    rule.period = SYSTEM_SCHEDULE_WEEKLY;
    rule.weekday = static_cast<uint8_t>(weekday);
  } else if (strcmp(periodName, "monthly") == 0) {
    const int day = doc["day"] | -1;
    if (day < 1 || day > 31) {
      publishScheduleReply("schedule.error");
      return true;
    }
    rule.period = SYSTEM_SCHEDULE_MONTHLY;
    rule.day = static_cast<uint8_t>(day);
  } else if (strcmp(periodName, "yearly") == 0) {
    const int month = doc["month"] | -1;
    const int day = doc["day"] | -1;
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      publishScheduleReply("schedule.error");
      return true;
    }
    rule.period = SYSTEM_SCHEDULE_YEARLY;
    rule.month = static_cast<uint8_t>(month);
    rule.day = static_cast<uint8_t>(day);
  } else {
    publishScheduleReply("schedule.error");
    return true;
  }

  publishScheduleReply(SystemTask::configureSchedule(static_cast<uint8_t>(slot), rule)
      ? "schedule.saved" : "schedule.error");
  return true;
}

DeviceCommand cmd;
void MqttDataCallback(char* topic, byte* data, unsigned int data_len)
{
    (void)topic;
    if (data_len == 0 || data_len >= MQTT_PACKET_SIZE) {
        DEVICE_LOG_INFO("[MQTT] Rejected empty or oversized message");
        return;
    }
    // Copy mode: signature checks remove fields and decryption reuses the document.
    DynamicJsonDocument doc(MQTT_JSON_DOC_SIZE + data_len);
    DeserializationError err = deserializeJson(doc, (const char*)data, data_len);
    if (err || !doc.is<JsonObject>()) {
        DEVICE_LOG_INFO("[MQTT] JSON parse error");
        return;
    }
#if ENABLE_MESSAGE_AUTHENTICATION
    if (!verifyMqttPayload(doc)) {
        DEVICE_LOG_INFO("[MQTT Auth] Rejected message with invalid signature");
        return;
    }
#endif
#if ENABLE_ASCON_AEAD128
    if (!unwrapEncryptedCommand(doc)) {
        DEVICE_LOG_INFO("[ASCON] Rejected unencrypted or undecryptable command");
        return;
    }
#endif

    if (handleHighSpeedCommand(doc)) {
        return;
    }
    if (handleScheduleCommand(doc)) {
        return;
    }

    int com = doc["com"] | 0;
#if ENABLE_ASCON_AEAD128
    if (com == COMMAND_TYPE_ASCON_HANDSHAKE) {
        if (!announceAsconKey()) {
            DEVICE_LOG_INFO("[ASCON] Handshake reply failed");
        }
        return;
    }
#endif

    cmd.commandType = com;
    cmd.commandValue = doc["value"] | 0;

    if(cmd.commandType == COMMAND_TYPE_OTHER) {
        cmd.reserved = COMMAND_RESERVED_NONE;
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
    } else if(cmd.commandType == COMMAND_TYPE_CONTROL)  {
        cmd.reserved = COMMAND_RESERVED_CONTROL;
        #if SUPPORT_RTOS
            if (deviceCommandQueue == NULL) return;
            if (xQueueSend(deviceCommandQueue, &cmd, pdMS_TO_TICKS(50)) != pdTRUE) {
                  DEVICE_LOG_INFO("[MQTT] Failed to queue device command");
            }
        #else
            MemoryData::GetInstance().deviceCommand_ = &cmd;
        #endif
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
    }
}


bool parseJsonToSettings(const String &json) {
  DynamicJsonDocument document(json.length() + JSON_SMALL_BUFFER_SIZE);
  DeserializationError error = deserializeJson(document, json);
  if (error) {
    DEVICE_LOG_INFO("[MQTT] Settings JSON invalid: " + String(error.c_str()));
    return false;
  }

  SYSCFG parsedSettings = {};
  const long mqttPort = document["mqtt_port"] | 0L;
  if (mqttPort <= 0 || mqttPort > 65535 ||
      !copyMqttSetting(document["mqtt_host"], parsedSettings.mqtt_host,
                       sizeof(parsedSettings.mqtt_host), true, "mqtt_host") ||
      !copyMqttSetting(document["mqtt_client"], parsedSettings.mqtt_client,
                       sizeof(parsedSettings.mqtt_client), true, "mqtt_client") ||
#if ENABLE_MQTT_USER_AUTH
      !copyMqttSetting(document["mqtt_user"], parsedSettings.mqtt_user,
                       sizeof(parsedSettings.mqtt_user), false, "mqtt_user") ||
      !copyMqttSetting(document["mqtt_pwd"], parsedSettings.mqtt_pwd,
                       sizeof(parsedSettings.mqtt_pwd), false, "mqtt_pwd") ||
#endif
      !copyMqttSetting(document["public_topic"], parsedSettings.public_topic,
                       sizeof(parsedSettings.public_topic), true, "public_topic") ||
      !copyMqttSetting(document["subcribe_topic"], parsedSettings.subcribe_topic,
                       sizeof(parsedSettings.subcribe_topic), true, "subcribe_topic") ||
      !isPublishTopicValid(parsedSettings.public_topic)) {
    DEVICE_LOG_INFO("[MQTT] Invalid MQTT configuration; connection disabled");
    return false;
  }

  parsedSettings.mqtt_port = static_cast<uint16_t>(mqttPort);
  Settings = parsedSettings;
  return true;
}

void NetWork_Mqtt::setupInfoMQTT()
{
    mqttConfigurationReady = false;
#if ENABLE_mTLS
    mtlsCredentialsLoaded = false;
#endif

    if(!parseJsonToSettings(Memory::GetInstance()->readString(WIFI_SETUP_JSON, WIFI_SETUP_JSON_MAX_LENGTH))){
      DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT skipped: invalid broker configuration");
      return;
    }

    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT  mqtt_host ==>"+String(Settings.mqtt_host));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_port ==>"+String(Settings.mqtt_port));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT  mqtt_client ==>"+String(Settings.mqtt_client));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT subcribe_topic ==>"+String(Settings.subcribe_topic));

#if ENABLE_mTLS
    Memory *memory = Memory::GetInstance();
    const bool caRead = memory->readBoundedString(
        MTLS_CA_CERT_ADDRESS, MTLS_CA_CERT_MAX_LENGTH, tlsCaCertificate);
    const bool clientCertificateRead = memory->readBoundedString(
        MTLS_CLIENT_CERT_ADDRESS, MTLS_CLIENT_CERT_MAX_LENGTH, mtlsClientCertificate);
    const bool privateKeyRead = memory->readBoundedString(
        MTLS_PRIVATE_KEY_ADDRESS, MTLS_PRIVATE_KEY_MAX_LENGTH, mtlsPrivateKey);

    if (!caRead || !clientCertificateRead || !privateKeyRead ||
        !isCertificatePem(tlsCaCertificate) ||
        !isCertificatePem(mtlsClientCertificate) ||
        !isPrivateKeyPem(mtlsPrivateKey)) {
        DEVICE_LOG_INFO("[MQTT mTLS] Missing, unterminated, or invalid PEM credentials; connection disabled");
        return;
    }

    // Keep PEM storage alive: WiFiClientSecure retains pointers to these buffers.
    EspClient.setCACert(tlsCaCertificate.c_str());
    EspClient.setCertificate(mtlsClientCertificate.c_str());
    EspClient.setPrivateKey(mtlsPrivateKey.c_str());
    mtlsCredentialsLoaded = true;
    DEVICE_LOG_INFO("[MQTT mTLS] CA, client certificate, and private key loaded");
#endif

#if ENABLE_MESSAGE_AUTHENTICATION
    messageAuthenticationKeyId = Memory::GetInstance()->readLargeString(
        MESSAGE_AUTH_KEY_ID_ADDRESS, MESSAGE_AUTH_KEY_ID_MAX_LENGTH);
    messageAuthenticationSecret = Memory::GetInstance()->readLargeString(
        MESSAGE_AUTH_SECRET_ADDRESS, MESSAGE_AUTH_SECRET_MAX_LENGTH);
    messageAuthenticationLoaded = messageAuthenticationKeyId.length() > 0 &&
        messageAuthenticationSecret.length() > 0;
    if (messageAuthenticationLoaded) {
        DEVICE_LOG_INFO("[MQTT Auth] HMAC credentials loaded from ROM/EEPROM");
    } else {
        DEVICE_LOG_INFO("[MQTT Auth] Missing HMAC keyId or secret in ROM/EEPROM");
    }
#endif
    MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);
    if (!MqttClient.setBufferSize(MQTT_PACKET_SIZE)) {
        DEVICE_LOG_INFO("[MQTT] Failed to enlarge packet buffer for capture commands");
    }
    MqttClient.setCallback(MqttDataCallback);
    mqttConfigurationReady = true;
    DEVICE_LOG_INFO("end NetWork_Mqtt::setupInfoMQTT");
}


void NetWork_Mqtt::getAllDataSetup(){
}


void NetWork_Mqtt::disconnetMqtt(){
   MqttClient.disconnect();
}

void NetWork_Mqtt::connectMqtt(){
  DEVICE_LOG_INFO("start NetWork_Mqtt::connectMqtt");
  if (!mqttConfigurationReady) {
    DEVICE_LOG_INFO("[MQTT] Connection blocked: configuration or TLS credentials are not ready");
    return;
  }
#if ENABLE_mTLS
  if (!mtlsCredentialsLoaded) {
    DEVICE_LOG_INFO("[MQTT mTLS] Connection blocked: credentials are not loaded");
    return;
  }
#endif
  if (MqttClient.connected()) {
    return;
  }
#if ENABLE_MQTT_CONNECT_RATE_LIMIT
  if (!connectAttemptAllowed()) {
    DEVICE_LOG_INFO("[MQTT] Connection deferred: broker brute-force limit");
    return;
  }
#endif
  if (!ensureBrokerClockSynced()) {
    DEVICE_LOG_INFO("[MQTT TLS] Connection blocked: system clock synchronization failed");
    return;
  }
  DEVICE_LOG_INFO("Attempting MQTT connection...");
#if ENABLE_MQTT_USER_AUTH
  bool connected = MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd);
#else
  // With mTLS the broker identifies the device by clientId + certificate.
  bool connected = MqttClient.connect(Settings.mqtt_client);
#endif
#if ENABLE_MQTT_CONNECT_RATE_LIMIT
  recordConnectResult(connected);
#endif
  if (!connected) {
    DEVICE_LOG_INFO("failed, rc="+String(MqttClient.state()));
    return;
  }
  DEVICE_LOG_INFO("connected");
  if (!MqttClient.subscribe(Settings.subcribe_topic, MQTT_PUBLISH_QOS)) {
    DEVICE_LOG_INFO("[MQTT] Subscribe rejected (check mqtt_acl.json); closing connection");
    MqttClient.disconnect();
    return;
  }
#if ENABLE_ASCON_AEAD128
  // Re-announce on every connect: the server may have lost the session key.
  if (!announceAsconKey()) {
    DEVICE_LOG_INFO("[ASCON] Handshake publish failed");
  }
#else
  publishSecured("{\"test\":\"mqtt connect\"}");
#endif
  DEVICE_LOG_INFO("end NetWork_Mqtt::connectMqtt");
}


unsigned char  NetWork_Mqtt::checkStatusMqtt(){
  return (MqttClient.connected() ? 1 : 0);
}

void NetWork_Mqtt::sendMessageInfo(char * data){
  if (data != NULL) {
    publishSecured(String(data));
  }
}

void NetWork_Mqtt::MqttSubscribe(char *topic)
{
  MqttClient.subscribe(topic);
  MqttClient.loop();  // Solve LmacRxBlk:1 messages
}

void NetWork_Mqtt::lisenMqtt(){
  MqttClient.loop();
}

void NetWork_Mqtt::MqttReconnect()
{
  this->connectMqtt();
}
