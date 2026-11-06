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

#include <WiFi.h>
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
#include "ScheduleEngine.h"
#include "OnTimer.h"
#include "Countdown.h"
#include "ThresholdControl.h"
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

#if ENABLE_LAN_CONTROL
// Set while a LAN command runs: replies go into the HTTP response instead of MQTT.
static String* lanReplies = nullptr;

static void appendLanReply(const String& payload)
{
  if (lanReplies->length() + payload.length() + 1 > LAN_REPLY_MAX_LENGTH) {
    DEVICE_LOG_INFO("[LAN] Reply dropped: response too large");
    return;
  }
  if (lanReplies->length() > 0) {
    *lanReplies += ',';
  }
  *lanReplies += payload;
}
#endif

#if ENABLE_ASCON_AEAD128
// Sends the key digits in plaintext, rotating the key first if it is due.
static bool announceAsconKey()
{
  if (asconRotationDue() && !rotateAsconKey()) {
    return false;
  }
  // Reply to {"com":7} (also sent on connect and on key rotation).
  return publishSecured(String("{\"rc\":") + COMMAND_TYPE_ASCON_HANDSHAKE + ",\"rs\":0,\"ky\":\"" +
                        currentAsconDigits + "\"}", false);
}
#endif

// Single publish path. Order: encrypt -> replay metadata -> sign, so the
// broker can check replay fields and the signature without the Ascon key.
static bool publishSecured(String payload, bool encrypt)
{
#if ENABLE_LAN_CONTROL
  if (lanReplies == nullptr && !MqttClient.connected()) {
    return false;
  }
#else
  if (!MqttClient.connected()) {
    return false;
  }
#endif
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
#if ENABLE_LAN_CONTROL
  if (lanReplies != nullptr) {
    // Replay fields and the signature are for the broker; a LAN reply is
    // answered directly (encrypted like MQTT when Ascon is on).
    appendLanReply(payload);
    return true;
  }
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

// "mode" of {"com":15}: 1 ADC 10 kHz, 2 IMU 32 kHz, 3 ADS 100 kHz, 4 all.
static bool parseHighSpeedMode(long mode, HighSpeedMode& result)
{
  switch (mode) {
    case 1: result = HS_MODE_ADC_10KHZ; return true;
    case 2: result = HS_MODE_ICM32K; return true;
    case 3: result = HS_MODE_ADS100K; return true;
    case 4: result = HS_MODE_ALL; return true;
    default: return false;
  }
}

// {"rc":15,"rs":<result>,"act":<1 = sampling>}.
static void publishHighSpeedReply(int result, const char* reason = nullptr)
{
  if (reason != nullptr) {
    DEVICE_LOG_INFO(String("[HighSpeed] ") + reason);
  }
  char reply[48];
  snprintf(reply, sizeof(reply), "{\"rc\":%d,\"rs\":%d,\"act\":%d}", COMMAND_TYPE_HIGH_SPEED_CAPTURE, result,
           HighSpeedSampler::GetInstance().isSamplingActive() ? 1 : 0);
  sendMessageInfoPublish(reply);
}

// {"com":15,"value":<duration ms>,"mode":1..4,"udp_host":"..","udp_port":n} starts,
// {"com":15,"value":0} stops, {"com":15} only reports. Results: 0 ok,
// 2 invalid (mode, UDP target or duration), 5 sensor / sampler not ready, 7 busy.
static bool handleHighSpeedCommand(JsonDocument& doc)
{
  if ((doc["com"] | 0) != COMMAND_TYPE_HIGH_SPEED_CAPTURE) {
    return false;
  }
  HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
  JsonVariantConst value = doc["value"];
  if (value.isNull()) {
    publishHighSpeedReply(ScheduleEngine::STATUS_SUCCESS);
    return true;
  }
  if (!value.is<long>() || value.as<long>() < 0 ||
      static_cast<uint32_t>(value.as<long>()) > HS_CAPTURE_MAX_DURATION_MS) {
    publishHighSpeedReply(ScheduleEngine::STATUS_INVALID, "invalid_duration");
    return true;
  }
  const uint32_t durationMs = static_cast<uint32_t>(value.as<long>());
  if (durationMs == 0) {
    sampler.stopSampling();
    publishHighSpeedReply(ScheduleEngine::STATUS_SUCCESS);
    return true;
  }

  const char* targetHost = doc["udp_host"] | "";
  const uint32_t targetPort = doc["udp_port"] | 0;
  HighSpeedConfig config;
  if (!doc["mode"].is<long>() || !parseHighSpeedMode(doc["mode"].as<long>(), config.mode)) {
    publishHighSpeedReply(ScheduleEngine::STATUS_INVALID, "invalid_mode");
    return true;
  }
  if (!config.udpTargetIP.fromString(targetHost) || targetPort == 0 ||
      targetPort > 65535 || config.udpTargetIP[0] == 0 ||
      config.udpTargetIP[0] >= 224) {
    publishHighSpeedReply(ScheduleEngine::STATUS_INVALID, "invalid_udp_target");
    return true;
  }
  config.udpTargetPort = static_cast<uint16_t>(targetPort);
  config.durationMs = durationMs;
  if (sampler.isSamplingActive()) {
    publishHighSpeedReply(COMMAND_RESULT_BUSY, "capture_busy");
    return true;
  }
  if (!sampler.isModeAvailable(config.mode)) {
    publishHighSpeedReply(ScheduleEngine::STATUS_NOT_READY, "sensor_or_sampler_unavailable");
    return true;
  }
  if (!sampler.startSampling(config)) {
    publishHighSpeedReply(ScheduleEngine::STATUS_NOT_READY, "capture_start_failed");
    return true;
  }
  publishHighSpeedReply(ScheduleEngine::STATUS_SUCCESS);
  return true;
}

static void publishStatusReport(int replyTo = 0, int id = 0,
                                const ScheduleEngine::Result* result = nullptr);

static ScheduleEngine::Result invalidSchedule(const char* message)
{
  return ScheduleEngine::Result{ScheduleEngine::STATUS_INVALID, 0, 0, message};
}

// Reads one integer field; a missing field takes fallback, -1 marks it required.
static bool readScheduleField(JsonDocument& doc, const char* key, long fallback,
                              long minimum, long maximum, long& value)
{
  JsonVariantConst field = doc[key];
  if (field.isNull()) {
    value = fallback;
    return fallback >= 0;
  }
  if (!field.is<long>()) {
    return false;
  }
  value = field.as<long>();
  return value >= minimum && value <= maximum;
}

static bool parseScheduleEntry(JsonDocument& doc, schedule::Entry& entry,
                               ScheduleEngine::Result& error)
{
  long hour, minute, weekday, portMask, portState, autoOff;
  if (!readScheduleField(doc, "ho", -1, 0, 23, hour) ||
      !readScheduleField(doc, "mi", -1, 0, 59, minute)) {
    error = invalidSchedule("ho (0-23) and mi (0-59) are required");
    return false;
  }
  if (!readScheduleField(doc, "we", -1, 0, 127, weekday)) {
    error = invalidSchedule("we bitmask (0-127, 0 = once) is required");
    return false;
  }
  if (!readScheduleField(doc, "po", SCHEDULE_ALLOWED_PORT_MASK, 1, 255, portMask) ||
      !readScheduleField(doc, "pos", -1, 0, 255, portState)) {
    error = invalidSchedule("pos (0-255) is required; po must be 1-255");
    return false;
  }
  if (!readScheduleField(doc, "au", 0, 0, 65535, autoOff)) {
    error = invalidSchedule("au must be 0-65535 seconds");
    return false;
  }

  entry = {};
  entry.hour = static_cast<uint8_t>(hour);
  entry.minute = static_cast<uint8_t>(minute);
  entry.weekday = static_cast<uint8_t>(weekday);
  entry.portMask = static_cast<uint8_t>(portMask);
  entry.portState = static_cast<uint8_t>(portState);
  entry.autoOff = static_cast<uint16_t>(autoOff);
  entry.flags = (doc["en"].is<bool>() ? doc["en"].as<bool>() : (doc["en"] | 1) != 0) ? schedule::kFlagEnabled : 0;

  if (entry.weekday == schedule::kWeekdayOnce) {
    long year, month, day;
    if (!readScheduleField(doc, "ye", -1, 2024, 2149, year) ||
        !readScheduleField(doc, "mo", -1, 1, 12, month) ||
        !readScheduleField(doc, "da", -1, 1, 31, day) ||
        !schedule::isValidDate(year, month, day)) {
      error = invalidSchedule("once schedule (we 0) needs a valid ye/mo/da");
      return false;
    }
    entry.day = static_cast<uint16_t>(schedule::daysFromCivil(year, month, day));
  }
  return true;
}

// Schedule commands (spec_v1.txt §4), numeric "com" and short fields:
//   {"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600}  add
//   {"com":9,...same fields...} update, {"com":10,"id":1} delete,
//   {"com":11,"id":1,"value":1|0} enable/disable, {"com":12} clear,
//   {"com":13,"fr":1} list (one page, see ScheduleEngine::listJson).
// Optional: "en":0 (saved disabled), "ye"/"mo"/"da" for a once schedule (we 0).
// Every command except list is answered with the status report (rc/rs/id).
// All commands are idempotent, so a QoS 1 redelivery is safe.
static bool handleScheduleEngineCommand(JsonDocument& doc)
{
  const int com = doc["com"] | 0;
  if (com < COMMAND_TYPE_SCHEDULE_ADD || com > COMMAND_TYPE_SCHEDULE_LIST) {
    return false;
  }
  if (com == COMMAND_TYPE_SCHEDULE_LIST) {
    long firstId = 1;
    if (!readScheduleField(doc, "fr", 1, 1, SCHEDULE_MAX_COUNT, firstId)) {
      firstId = 1;
    }
    const String payload = ScheduleEngine::listJson(static_cast<uint8_t>(firstId));
    if (payload.length() > 0) {
      sendMessageInfoPublish(payload);
    }
    return true;
  }

  ScheduleEngine::Result result;
  long id = 0;
  if (com == COMMAND_TYPE_SCHEDULE_CLEAR) {
    result = ScheduleEngine::clear();
  } else {
    if (!readScheduleField(doc, "id", -1, 1, SCHEDULE_MAX_COUNT, id)) {
      id = 0;  // ScheduleEngine rejects id 0.
    }
    const uint8_t scheduleId = static_cast<uint8_t>(id);
    if (com == COMMAND_TYPE_SCHEDULE_ADD || com == COMMAND_TYPE_SCHEDULE_UPDATE) {
      schedule::Entry entry;
      if (parseScheduleEntry(doc, entry, result)) {
        result = com == COMMAND_TYPE_SCHEDULE_ADD ? ScheduleEngine::add(scheduleId, entry)
                                                  : ScheduleEngine::update(scheduleId, entry);
      }
    } else if (com == COMMAND_TYPE_SCHEDULE_DELETE) {
      result = ScheduleEngine::remove(scheduleId);
    } else {
      long enabled = 0;
      result = readScheduleField(doc, "value", -1, 0, 1, enabled)
          ? ScheduleEngine::setEnabled(scheduleId, enabled == 1)
          : invalidSchedule("value must be 1 (enable) or 0 (disable)");
    }
  }
  if (result.status != ScheduleEngine::STATUS_SUCCESS) {
    DEVICE_LOG_INFO("[Schedule] com:" + String(com) + " id=" + String(id) + " " + result.message);
  }
  publishStatusReport(com, static_cast<int>(id), &result);
  return true;
}

// {"com":5,"value":N}: auto OFF on-timer, independent of schedules, N seconds
// (1-86400, 0 = off); without "value" only reports. Answered with the status
// report ("tim" = the value in force).
static bool handleOnTimerCommand(JsonDocument& doc)
{
  if ((doc["com"] | 0) != COMMAND_TYPE_ON_TIMER) {
    return false;
  }
  ScheduleEngine::Result result{ScheduleEngine::STATUS_SUCCESS, 0, 0, "On-timer"};
  long seconds = 0;
  if (!doc["value"].isNull() &&
      (!readScheduleField(doc, "value", -1, 0, on_timer::kMaxSeconds, seconds) ||
       !OnTimer::set(static_cast<uint32_t>(seconds)))) {
    result = invalidSchedule("value must be 0 (off) or 1-86400 seconds");
    DEVICE_LOG_INFO(String("[OnTimer] ") + result.message);
  }
  publishStatusReport(COMMAND_TYPE_ON_TIMER, 0, &result);
  return true;
}

// {"com":14,"id":1|2,"value":N}: sensor threshold rule (4 bytes packed in N,
// see ThresholdControl.h); value 0 deletes, without "value" (and "id") only
// reports. Answered with the status report ("th" = both rules).
static bool handleThresholdCommand(JsonDocument& doc)
{
  if ((doc["com"] | 0) != COMMAND_TYPE_THRESHOLD) {
    return false;
  }
  ScheduleEngine::Result result{ScheduleEngine::STATUS_SUCCESS, 0, 0, "Threshold"};
  long id = 0;
  long value = 0;
  if (!doc["id"].isNull() || !doc["value"].isNull()) {
    if (!readScheduleField(doc, "id", -1, 1, threshold::kRuleCount, id)) {
      id = 0;
      result = invalidSchedule("id must be 1 or 2");
    } else if (!doc["value"].isNull() &&
               (!readScheduleField(doc, "value", -1, 0, 0x7FFFFFFFL, value) ||
                !ThresholdControl::set(static_cast<uint8_t>(id), static_cast<uint32_t>(value)))) {
      result = invalidSchedule("invalid threshold rule (sensor, ports or flags)");
    }
  }
  if (result.status != ScheduleEngine::STATUS_SUCCESS) {
    DEVICE_LOG_INFO(String("[Threshold] ") + result.message);
  }
  publishStatusReport(COMMAND_TYPE_THRESHOLD, static_cast<int>(id), &result);
  return true;
}

// {"com":4,"value":N}: switch the ports on after N seconds (1-86400), once,
// independent of schedules; value 0 cancels, no value only reports. Optional
// "mask" (default: every output). Lost on reboot. Reply: the status report
// with "rc":4, "rs", "cd" (seconds left, 0 = idle), "cm" (ports), "cs" (last N).
static bool handleCountdownCommand(JsonDocument& doc)
{
  if ((doc["com"] | 0) != COMMAND_TYPE_COUNTDOWN) {
    return false;
  }
  ScheduleEngine::Result result{ScheduleEngine::STATUS_SUCCESS, 0, 0, "Countdown"};
  long seconds = 0;
  long mask = 0;
  if (doc["value"].isNull()) {
    // Status request only.
  } else if (!readScheduleField(doc, "value", -1, 0, countdown::kMaxSeconds, seconds) ||
             !readScheduleField(doc, "mask", SCHEDULE_ALLOWED_PORT_MASK, 1, 255, mask) ||
             (mask & ~SCHEDULE_ALLOWED_PORT_MASK) != 0) {
    result = invalidSchedule("value must be 0 (cancel) or 1-86400 s; mask must only contain output ports");
  } else if (seconds == 0) {
    Countdown::cancel();
    result.message = "Countdown cancelled";
  } else if (Countdown::start(static_cast<uint32_t>(seconds), static_cast<uint8_t>(mask))) {
    result.message = "Countdown started";
  } else {
    result.status = ScheduleEngine::STATUS_NOT_READY;
    result.message = "countdown not ready";
  }
  DEVICE_LOG_INFO(String("[Countdown] ") + result.message);
  publishStatusReport(COMMAND_TYPE_COUNTDOWN, 0, &result);
  return true;
}

// The reply to {"com":2} (full status) and to com:4 / com:5 / com:8-12 / com:14:
// {"se":..,"va":..,"co":..,"set":["8,20,1,4,5",...],"tim":1800,"cd":0,"cm":3,"cs":600,"ip":"..","th":[n,n]}:
// the periodic status message plus every active schedule as its 6-byte record
// "hour,minute,weekday,port_state,auto_off", ordered by time, the on-timer
// in seconds (0 = off), the countdown seconds left (0 = idle), its ports
// ("cm") and last length ("cs"), and the LAN IP.
// A command reply adds "rc" (the com answered), "rs" (result: 0 ok,
// 1 conflict, 2 invalid, 3 not found, 4 id exists, 5 not ready), "id" (the
// schedule) and on conflict "ci"/"cp" (conflicting schedule id / ports). RAM only.
static void publishStatusReport(int replyTo, int id, const ScheduleEngine::Result* result)
{
  // Pool, not text size: 20 "set" strings plus their slots need ~1 KB.
  DynamicJsonDocument report(MQTT_PAYLOAD_SIZE + 512);
  if (deserializeJson(report, getInfoDevice(sensorValue, statusDevice)) || !report.is<JsonObject>()) {
    report.clear();
  }
  ScheduleEngine::addSettings(report.createNestedArray("set"));
  report["tim"] = OnTimer::seconds();
  report["cd"] = Countdown::remaining();
  report["cm"] = Countdown::mask();
  report["cs"] = Countdown::lastSeconds();
  // LAN address, so web_manager can reach the device without the broker.
  report["ip"] = WiFi.localIP().toString();
  // Sensor threshold rules (ThresholdControl.h), 0 = empty.
  JsonArray thresholds = report.createNestedArray("th");
  for (uint8_t id = 1; id <= threshold::kRuleCount; ++id) {
    thresholds.add(ThresholdControl::value(id));
  }
  if (replyTo != 0) {
    report["rc"] = replyTo;
    report["rs"] = static_cast<int>(result != nullptr ? result->status : ScheduleEngine::STATUS_SUCCESS);
    if (id > 0) {
      report["id"] = id;
    }
    if (result != nullptr && result->status == ScheduleEngine::STATUS_CONFLICT) {
      report["ci"] = result->conflictId;
      report["cp"] = result->conflictPorts;
    }
  }
  String payload;
  if (report.overflowed() || serializeJson(report, payload) == 0) {
    DEVICE_LOG_INFO("[Status] STATUS report does not fit its buffer");
    return;
  }
  sendMessageInfoPublish(payload);
}

// {"com":2}: full status report with "rc":2 (replaces {"cmd":"STATUS_GET"}).
static bool handleStatusCommand(JsonDocument& doc)
{
  if ((doc["com"] | 0) != COMMAND_TYPE_STATUS) {
    return false;
  }
  publishStatusReport(COMMAND_TYPE_STATUS);
  return true;
}

// Short status message (the periodic one) answering com:1: adds "rc"/"rs".
static void publishShortReply(int replyTo, int result)
{
  String payload = getInfoDevice(sensorValue, statusDevice);
  const int end = payload.lastIndexOf('}');
  if (end < 0) {
    return;
  }
  payload = payload.substring(0, end) + ",\"rc\":" + replyTo + ",\"rs\":" + result + "}";
  sendMessageInfoPublish(payload);
}

#if ENABLE_COMMAND_PASSWORD
// Device password = "mqtt_pwd" of the stored setup JSON, read once (/setup
// restarts the device). Only that field is parsed.
static const char* devicePassword()
{
  static bool loaded = false;
  static char password[33] = "";
  if (!loaded) {
    loaded = true;
    StaticJsonDocument<32> filter;
    filter["mqtt_pwd"] = true;
    StaticJsonDocument<128> stored;
    const String json = Memory::GetInstance()->readString(WIFI_SETUP_JSON, WIFI_SETUP_JSON_MAX_LENGTH);
    if (!deserializeJson(stored, json, DeserializationOption::Filter(filter))) {
      strlcpy(password, stored["mqtt_pwd"] | "", sizeof(password));
    }
  }
  return password;
}

bool commandPasswordMatches(const char* received)
{
  const char* expected = devicePassword();
  const size_t expectedLength = strlen(expected);
  const size_t receivedLength = strlen(received);
  // Runs over the whole received text, so timing does not show how much matched.
  unsigned char difference = expectedLength != receivedLength ? 1 : 0;
  for (size_t i = 0; i < receivedLength; ++i) {
    difference |= static_cast<unsigned char>(received[i] ^ expected[expectedLength ? i % expectedLength : 0]);
  }
  return difference == 0;
}

// Rejects a command whose "pa" is not the device password, answering
// {"rc":<com>,"rs":6} (also over LAN).
static bool rejectWrongPassword(JsonDocument& doc)
{
  if (commandPasswordMatches(doc["pa"] | "")) {
    return false;
  }
  DEVICE_LOG_INFO("[Auth] Rejected command with a wrong password");
  char reply[40];
  snprintf(reply, sizeof(reply), "{\"rc\":%d,\"rs\":%d}", static_cast<int>(doc["com"] | 0),
           COMMAND_RESULT_WRONG_PASSWORD);
  sendMessageInfoPublish(reply);
  return true;
}
#endif

DeviceCommand cmd;
void MqttDataCallback(char* topic, byte* data, unsigned int data_len);

#if ENABLE_LAN_CONTROL
String handleLanCommand(const char* json, size_t length)
{
  String replies;
  lanReplies = &replies;
  // Same path as an MQTT message: size limit, signature, Ascon, handlers.
  MqttDataCallback(nullptr, reinterpret_cast<byte*>(const_cast<char*>(json)),
                   static_cast<unsigned int>(length));
  lanReplies = nullptr;
  return "[" + replies + "]";
}
#endif

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
#if ENABLE_COMMAND_PASSWORD
    // After decryption: "pa" is inside the encrypted command.
    if (rejectWrongPassword(doc)) {
        return;
    }
#endif

    // Every command is {"com":<number>,...}; "cmd" commands are no longer accepted.
    if (handleStatusCommand(doc) || handleHighSpeedCommand(doc) || handleScheduleEngineCommand(doc) ||
        handleOnTimerCommand(doc) || handleCountdownCommand(doc) || handleThresholdCommand(doc)) {
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
    // Optional "mask": only these ports change (and get direct-control
    // priority). Without it, value sets all 8 ports as before.
    cmd.portMask = doc["mask"] | 0;

    if(cmd.commandType == COMMAND_TYPE_CONTROL)  {
        cmd.reserved = COMMAND_RESERVED_CONTROL;
        #if SUPPORT_RTOS
            if (deviceCommandQueue == NULL ||
                xQueueSend(deviceCommandQueue, &cmd, pdMS_TO_TICKS(50)) != pdTRUE) {
                  DEVICE_LOG_INFO("[MQTT] Failed to queue device command");
                  publishShortReply(COMMAND_TYPE_CONTROL, ScheduleEngine::STATUS_NOT_READY);
                  return;
            }
        #else
            MemoryData::GetInstance().deviceCommand_ = &cmd;
        #endif
        // Sent before TaskDevice applies the command: "co" may still show the old ports.
        publishShortReply(COMMAND_TYPE_CONTROL, ScheduleEngine::STATUS_SUCCESS);
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
