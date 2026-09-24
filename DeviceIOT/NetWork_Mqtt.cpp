#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include "Common.h"
#include "define_All.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>

#if ENABLE_MESSAGE_AUTHENTICATION
#include <mbedtls/md.h>
#endif

#if MQTT_NO_TLS || ENABLE_TLS_SSL || ENABLE_mTLS
#include <WiFiClientSecure.h>
using MqttWiFiClient = WiFiClientSecure;
#else
#include <WiFiClient.h>
using MqttWiFiClient = WiFiClient;
#endif

#include <StreamString.h>                   // Webserver, Updater                  // WifiManager
#include "Memory.h"
#include "MemoryData.h"
#include "DebugInfo.h"
#if ENABLE_ASCON_AEAD128
#include "AsconAead128.h"
#endif

MqttWiFiClient EspClient;
PubSubClient MqttClient(EspClient);         // MQTT Client

extern InfoSensor sensorValue;
extern InfoDeviceControl statusDevice;
StaticJsonDocument<512> jsonBufferMqtt;

#if ENABLE_TLS_SSL || ENABLE_mTLS
String tlsCaCertificate;
#endif

#if ENABLE_mTLS
String mtlsClientCertificate;
String mtlsPrivateKey;
bool mtlsCredentialsLoaded = false;
#endif

#if ENABLE_ASCON_AEAD128
static uint8_t currentAsconKey[16] = {0};
static String currentAsconDigits;
static uint64_t currentAsconKeyTimestamp = 0;
static bool asconKeyReady = false;

static const char hexAlphabet[] = "0123456789abcdef";

static String hexEncode(const uint8_t *data, size_t length)
{
    String result;
    result.reserve(length * 2);
    for (size_t i = 0; i < length; i++) {
        uint8_t b = data[i];
        result += hexAlphabet[b >> 4];
        result += hexAlphabet[b & 0x0F];
    }
    return result;
}

static bool hexDecode(const String &hex, uint8_t *out, size_t outLen)
{
    if (hex.length() != (int)(outLen * 2)) {
        return false;
    }
    for (size_t i = 0; i < outLen; i++) {
        char hi = hex.charAt(2 * i);
        char lo = hex.charAt(2 * i + 1);
        auto decodeNibble = [](char c) -> int {
            if (c >= '0' && c <= '9') return c - '0';
            if (c >= 'a' && c <= 'f') return c - 'a' + 10;
            if (c >= 'A' && c <= 'F') return c - 'A' + 10;
            return -1;
        };
        int hiVal = decodeNibble(hi);
        int loVal = decodeNibble(lo);
        if (hiVal < 0 || loVal < 0) {
            return false;
        }
        out[i] = (uint8_t)((hiVal << 4) | loVal);
    }
    return true;
}

static bool readAsconPublicKey(int index, uint8_t key[16])
{
    if (index < 0 || index >= ASCON_PUBLIC_KEY_COUNT) {
        return false;
    }
    int address = ASCON_PUBLIC_KEYS_ADDRESS + index * ASCON_PUBLIC_KEY_ENTRY_LENGTH;
    String hexKey = Memory::GetInstance()->readString(address, ASCON_PUBLIC_KEY_HEX_LENGTH);
    if (hexKey.length() != ASCON_PUBLIC_KEY_HEX_LENGTH) {
        return false;
    }
    return hexDecode(hexKey, key, 16);
}

static String generateAsconDigits()
{
    randomSeed(ESP.getCycleCount());
    String digits;
    digits.reserve(ASCON_RANDOM_DIGITS);
    for (int i = 0; i < ASCON_RANDOM_DIGITS; i++) {
        digits += String(random(0, 10));
    }
    return digits;
}

static bool generateAsconKeyFromDigits(const String &digits)
{
    if (digits.length() != ASCON_RANDOM_DIGITS) {
        return false;
    }
    uint8_t result[16] = {0};
    for (int i = 0; i < ASCON_RANDOM_DIGITS; i++) {
        int index = digits.charAt(i) - '0';
        uint8_t key[16];
        if (!readAsconPublicKey(index, key)) {
            return false;
        }
        for (int b = 0; b < 16; b++) {
            result[b] ^= key[b];
        }
    }
    memcpy(currentAsconKey, result, 16);
    return true;
}

void ensureAsconKeyReady()
{
    uint64_t now = Memory::GetInstance()->getTimeStamp();
    uint64_t lastRotation = (uint64_t)Memory::GetInstance()->readLong(ASCON_KEY_ROTATION_TIME_ADDRESS);
    String savedDigits = Memory::GetInstance()->readString(ASCON_HANDSHAKE_DIGITS_ADDRESS, ASCON_HANDSHAKE_DIGITS_MAX_LENGTH);

    if (!asconKeyReady || savedDigits.length() != ASCON_RANDOM_DIGITS ||
        lastRotation == 0 || now - lastRotation >= ASCON_KEY_ROTATION_MS) {
        currentAsconDigits = generateAsconDigits();
        if (!generateAsconKeyFromDigits(currentAsconDigits)) {
            DEVICE_LOG_INFO("[ASCON] Failed to generate key from public key store");
            return;
        }
        Memory::GetInstance()->writeString(ASCON_HANDSHAKE_DIGITS_ADDRESS, currentAsconDigits);
        Memory::GetInstance()->writeLong(ASCON_KEY_ROTATION_TIME_ADDRESS, (long)now);
        currentAsconKeyTimestamp = now;
        asconKeyReady = true;
        DEVICE_LOG_INFO("[ASCON] New key generated from digits: " + currentAsconDigits);
    } else {
        currentAsconDigits = savedDigits;
        if (!generateAsconKeyFromDigits(currentAsconDigits)) {
            DEVICE_LOG_INFO("[ASCON] Failed to restore key from saved digits");
            return;
        }
        asconKeyReady = true;
    }
}

String getAsconEncryptedPayload(const String &payload)
{
    ensureAsconKeyReady();
    if (!asconKeyReady) {
        return payload;
    }
    size_t len = payload.length();
    uint8_t *cipher = new uint8_t[len];
    if (cipher == nullptr) {
        return payload;
    }
    uint8_t nonce[16];
    uint64_t t = millis();
    uint32_t r0 = random(0, 0x7FFFFFFF);
    uint32_t r1 = random(0, 0x7FFFFFFF);
    memcpy(nonce, &t, sizeof(t));
    memcpy(nonce + 8, &r0, sizeof(r0));
    memcpy(nonce + 12, &r1, sizeof(r1));
    uint8_t tag[16];
    if (!asconAead128Encrypt(currentAsconKey, nonce, nullptr, 0,
                              (const uint8_t *)payload.c_str(), len,
                              cipher, tag)) {
        delete[] cipher;
        return payload;
    }

    String packed = hexEncode(nonce, 16) + hexEncode(cipher, len) + hexEncode(tag, 16);
    delete[] cipher;

    StaticJsonDocument<128> doc;
    doc["com"] = 1;
    doc["value"] = packed;
    String wrapped;
    serializeJson(doc, wrapped);
    return wrapped;
}

bool tryAsconDecryptPayload(const String &payload, String &plainText)
{
    ensureAsconKeyReady();
    if (!asconKeyReady) {
        return false;
    }
    uint8_t *packed = nullptr;
    size_t packedLen = payload.length() / 2;
    if (packedLen < 48) {
        return false;
    }
    packed = new uint8_t[packedLen];
    if (!hexDecode(payload, packed, packedLen)) {
        delete[] packed;
        return false;
    }
    size_t nonceLen = 16;
    size_t tagLen = 16;
    size_t cipherLen = packedLen - nonceLen - tagLen;
    uint8_t *plain = new uint8_t[cipherLen];
    bool ok = asconAead128Decrypt(currentAsconKey, packed, nullptr, 0,
                                  packed + nonceLen, cipherLen,
                                  packed + nonceLen + cipherLen,
                                  plain);
    if (ok) {
        plainText = String((const char *)plain, cipherLen);
    }
    delete[] packed;
    delete[] plain;
    return ok;
}

static bool payloadIsAsconHandshake(const String &payload)
{
    StaticJsonDocument<64> doc;
    if (deserializeJson(doc, payload)) {
        return false;
    }
    int co = doc["co"] | 0;
    int com = doc["com"] | 0;
    return co == 6 || com == 7;
}

static String maybeEncryptPayload(const String &payload)
{
    if (payloadIsAsconHandshake(payload)) {
        return payload;
    }
    if (payload.startsWith("{\"com\":1") || payload.startsWith("{\"co\":6")) {
        return payload;
    }
    return getAsconEncryptedPayload(payload);
}

static String buildAsconHandshakePayload()
{
    ensureAsconKeyReady();
    StaticJsonDocument<64> doc;
    doc["co"] = 6;
    doc["va"] = currentAsconDigits;
    String handshake;
    serializeJson(doc, handshake);
    return handshake;
}
#endif

#if ENABLE_MESSAGE_AUTHENTICATION
String messageAuthenticationKeyId;
String messageAuthenticationSecret;
bool messageAuthenticationLoaded = false;

bool calculateHmacSha256(const String &data, String &signature)
{
    const mbedtls_md_info_t *mdInfo = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    if (mdInfo == NULL) {
        return false;
    }

    unsigned char digest[32];
    mbedtls_md_context_t context;
    mbedtls_md_init(&context);
    int result = mbedtls_md_setup(&context, mdInfo, 1);
    if (result == 0) result = mbedtls_md_hmac_starts(&context,
        (const unsigned char *)messageAuthenticationSecret.c_str(), messageAuthenticationSecret.length());
    if (result == 0) result = mbedtls_md_hmac_update(&context,
        (const unsigned char *)data.c_str(), data.length());
    if (result == 0) result = mbedtls_md_hmac_finish(&context, digest);
    mbedtls_md_free(&context);
    if (result != 0) {
        return false;
    }

    char hexDigest[65];
    for (size_t i = 0; i < sizeof(digest); ++i) {
        sprintf(&hexDigest[i * 2], "%02x", digest[i]);
    }
    hexDigest[64] = '\0';
    signature = hexDigest;
    return true;
}

bool signaturesMatch(const char *first, const String &second)
{
    if (first == NULL || strlen(first) != second.length()) {
        return false;
    }
    unsigned char difference = 0;
    for (size_t i = 0; i < second.length(); ++i) {
        difference |= ((unsigned char)first[i] ^ (unsigned char)second[i]);
    }
    return difference == 0;
}

bool signMqttPayload(const char *payload, String &signedPayload)
{
    DynamicJsonDocument document(strlen(payload) + 256);
    if (deserializeJson(document, payload)) {
        DEVICE_LOG_INFO("[MQTT Auth] Cannot sign a non-JSON payload");
        return false;
    }

    document.remove("signature");
    document["keyId"] = messageAuthenticationKeyId;
    String dataToSign;
    serializeJson(document, dataToSign);

    String signature;
    if (!calculateHmacSha256(dataToSign, signature)) {
        DEVICE_LOG_INFO("[MQTT Auth] HMAC calculation failed");
        return false;
    }
    document["signature"] = signature;
    serializeJson(document, signedPayload);
    return true;
}

bool verifyMqttPayload(const char *payload)
{
    DynamicJsonDocument document(strlen(payload) + 256);
    if (deserializeJson(document, payload)) {
        DEVICE_LOG_INFO("[MQTT Auth] Rejected non-JSON payload");
        return false;
    }
    const char *keyId = document["keyId"];
    const char *receivedSignature = document["signature"];
    if (keyId == NULL || messageAuthenticationKeyId != keyId || receivedSignature == NULL) {
        DEVICE_LOG_INFO("[MQTT Auth] Rejected message with missing or unknown keyId/signature");
        return false;
    }

    document.remove("signature");
    String dataToSign;
    serializeJson(document, dataToSign);
    String expectedSignature;
    return calculateHmacSha256(dataToSign, expectedSignature) &&
        signaturesMatch(receivedSignature, expectedSignature);
}
#endif

struct SYSCFG {
  char          mqtt_fingerprint[60];      // 1AD To be freed by binary fingerprint
  char          mqtt_host[128];             // 1E9
  uint16_t      mqtt_port;                 // 20A
  char          mqtt_client[33];           // 20C
  char          mqtt_user[33];             // 22D
  char          mqtt_pwd[33];              // 24E
  char          public_topic[33];            // 26F
  char          subcribe_topic[33];          // 290
  char          mqtt_grptopic[33];         // 2B1
  char          web_password[33];          // 4A9
} Settings;
extern QueueHandle_t deviceCommandQueue;

void sendMessageInfoPublish(String data){
  String publishPayload = data;
#if ENABLE_ASCON_AEAD128
  publishPayload = maybeEncryptPayload(data);
#endif
#if ENABLE_MESSAGE_AUTHENTICATION
  if (!messageAuthenticationLoaded) {
    DEVICE_LOG_INFO("[MQTT Auth] Publish blocked: credentials are not loaded");
    return;
  }
  String signedData;
  if (!signMqttPayload(publishPayload.c_str(), signedData)) {
    return;
  }
  publishPayload = signedData;
#endif
  char *p = new char[publishPayload.length() + 1];
  strcpy(p, publishPayload.c_str());
  if (MqttClient.publish(Settings.public_topic, p, 1)) {
  }
  delete[] p;
}
DeviceCommand cmd;
void MqttDataCallback(char* topic, byte* data, unsigned int data_len)
{
    String payload = String((char*)data).substring(0, data_len);
#if ENABLE_MESSAGE_AUTHENTICATION
    if (!messageAuthenticationLoaded || !verifyMqttPayload(payload.c_str())) {
        DEVICE_LOG_INFO("[MQTT Auth] Rejected message with invalid signature");
        return;
    }
#endif
#if ENABLE_ASCON_AEAD128
    String decryptedPayload;
    if (!tryAsconDecryptPayload(payload, decryptedPayload)) {
        decryptedPayload = payload;
    }
    payload = decryptedPayload;
#endif
    DEVICE_LOG_INFO("MqttDataCallback................................:" + payload);
#if ENABLE_MESSAGE_AUTHENTICATION
    StaticJsonDocument<256> doc;
#else
    StaticJsonDocument<128> doc; // smaller docs for commands
#endif
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
         DEVICE_LOG_INFO("[MQTT] JSON parse error:" + String(err.f_str()));
        return;
    }

    int com = doc["com"] | 0;
    if (com == 7) {
        String handshake = buildAsconHandshakePayload();
        sendMessageInfoPublish(handshake);
        return;
    }

    cmd.commandType = com;
    cmd.commandValue = doc["value"] | 0;

    if(cmd.commandType == 0x02) {
        cmd.reserved = 0;
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
    } else if(cmd.commandType == 0x01)  {
        cmd.reserved = 1;
        #if SUPPORT_RTOS
            if (deviceCommandQueue == NULL) return;
            if (xQueueSend(deviceCommandQueue, &cmd, pdMS_TO_TICKS(50)) != pdTRUE) {
                  DEVICE_LOG_INFO("[MQTT] Failed to queue device command");
            } else {
                 //DEVICE_LOG_INFO("[MQTT] Queued command type=%d value=%d\n", cmd.commandType, cmd.commandValue);
            }
        #else
            MemoryData::GetInstance().deviceCommand_ = &cmd;
            // DEVICE_LOG_INFO("[MQTT] Queued (non-RTOS) command type=%d value=%d\n", cmd.commandType, cmd.commandValue);
        #endif
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
    }


}


bool parseJsonToSettings(String json) {
  DEVICE_LOG_INFO("start NetWork_Mqtt::parseJsonToSettings");
  DEVICE_LOG_INFO(json);
  DeserializationError error = deserializeJson(jsonBufferMqtt, json);
  if (error) {
     DEVICE_LOG_INFO(F("deserializeJson() failed: "));
      DEVICE_LOG_INFO(error.f_str());
    return false;
  }

  strlcpy(Settings.mqtt_fingerprint, jsonBufferMqtt["mqtt_fingerprint"] | "", sizeof(Settings.mqtt_fingerprint));
  strlcpy(Settings.mqtt_host,       jsonBufferMqtt["mqtt_host"] | "",       sizeof(Settings.mqtt_host));
  Settings.mqtt_port =              jsonBufferMqtt["mqtt_port"] | 0;
  strlcpy(Settings.mqtt_client,     jsonBufferMqtt["mqtt_client"] | "",     sizeof(Settings.mqtt_client));
  strlcpy(Settings.mqtt_user,       jsonBufferMqtt["mqtt_user"] | "",       sizeof(Settings.mqtt_user));
  strlcpy(Settings.mqtt_pwd,        jsonBufferMqtt["mqtt_pwd"] | "",        sizeof(Settings.mqtt_pwd));
  strlcpy(Settings.public_topic,    jsonBufferMqtt["public_topic"] | "",    sizeof(Settings.public_topic));
  strlcpy(Settings.subcribe_topic,  jsonBufferMqtt["subcribe_topic"] | "",  sizeof(Settings.subcribe_topic));
  strlcpy(Settings.mqtt_grptopic,   jsonBufferMqtt["mqtt_grptopic"] | "",   sizeof(Settings.mqtt_grptopic));
  strlcpy(Settings.web_password,    jsonBufferMqtt["web_password"] | "",    sizeof(Settings.web_password));
  DEVICE_LOG_INFO("end NetWork_Mqtt::parseJsonToSettings");
  return true;
}

void NetWork_Mqtt::setupInfoMQTT()
{

    String payload = Memory::GetInstance()->readString(WIFI_SETUP_JSON);
    if(!parseJsonToSettings(payload)){
      DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT skipped due parseJsonToSettings failure");
      return;
    }
    
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT  mqtt_host ==>"+String(Settings.mqtt_host));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_port ==>"+String(Settings.mqtt_port));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_client ==>"+String(Settings.mqtt_client));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_user ==>"+String(Settings.mqtt_user));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_pwd ==>"+String(Settings.mqtt_pwd));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT subcribe_topic ==>"+String(Settings.subcribe_topic));

#if ENABLE_mTLS
    // All three PEM strings are stored as null-terminated data in ROM/EEPROM.
    // Keep them in global Strings because WiFiClientSecure retains their pointers.
    tlsCaCertificate = Memory::GetInstance()->readLargeString(
        MTLS_CA_CERT_ADDRESS, MTLS_CA_CERT_MAX_LENGTH);
    mtlsClientCertificate = Memory::GetInstance()->readLargeString(
        MTLS_CLIENT_CERT_ADDRESS, MTLS_CLIENT_CERT_MAX_LENGTH);
    mtlsPrivateKey = Memory::GetInstance()->readLargeString(
        MTLS_PRIVATE_KEY_ADDRESS, MTLS_PRIVATE_KEY_MAX_LENGTH);

    mtlsCredentialsLoaded = false;
    if (tlsCaCertificate.length() == 0 || mtlsClientCertificate.length() == 0 ||
        mtlsPrivateKey.length() == 0) {
        DEVICE_LOG_INFO("[MQTT mTLS] Missing CA certificate, client certificate, or private key");
    } else {
        EspClient.setCACert(tlsCaCertificate.c_str());
        EspClient.setCertificate(mtlsClientCertificate.c_str());
        EspClient.setPrivateKey(mtlsPrivateKey.c_str());
        mtlsCredentialsLoaded = true;
        DEVICE_LOG_INFO("[MQTT mTLS] Credentials loaded from ROM/EEPROM");
    }
#elif ENABLE_TLS_SSL
    // Dữ liệu tại TLS_SSL_DATA_ADDRESS phải là CA certificate PEM, kết thúc bằng '\0'.
    // Không dùng setInsecure() khi ENABLE_TLS_SSL để bắt buộc xác thực chứng chỉ server.
    tlsCaCertificate = Memory::GetInstance()->readLargeString(
        TLS_SSL_DATA_ADDRESS, TLS_SSL_DATA_MAX_LENGTH);
    if (tlsCaCertificate.length() == 0) {
        DEVICE_LOG_INFO("[MQTT TLS] Missing CA certificate in ROM/EEPROM");
    } else {
        EspClient.setCACert(tlsCaCertificate.c_str());
        DEVICE_LOG_INFO("[MQTT TLS] CA certificate loaded from ROM/EEPROM");
    }
#elif MQTT_NO_TLS
    EspClient.setInsecure();
    if (strlen(Settings.mqtt_fingerprint) > 0) {
        EspClient.setCACert(Settings.mqtt_fingerprint);
    }
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
    MqttClient.setCallback(MqttDataCallback);
    //if (MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd, Settings.subcribe_topic, 1, true, "")) {

    //}
    DEVICE_LOG_INFO("end NetWork_Mqtt::setupInfoMQTT");
}


void NetWork_Mqtt::getAllDataSetup(){
   DEVICE_LOG_INFO("start NetWork_Mqtt::getAllDataSetup");
   DEVICE_LOG_INFO("end NetWork_Mqtt::getAllDataSetup");
}



void NetWork_Mqtt::disconnetMqtt(){
   MqttClient.disconnect();
}

void NetWork_Mqtt::connectMqtt(){
  DEVICE_LOG_INFO("start NetWork_Mqtt::connectMqtt");
#if ENABLE_mTLS
  if (!mtlsCredentialsLoaded) {
    DEVICE_LOG_INFO("[MQTT mTLS] Connection blocked: credentials are not loaded");
    return;
  }
#endif
  MqttClient.setCallback(MqttDataCallback);
  MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);
  if (!MqttClient.connected())
  {
         DEVICE_LOG_INFO("Attempting MQTT connection...");
        if (MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd)) {
            DEVICE_LOG_INFO("connected");
            MqttClient.subscribe(Settings.subcribe_topic);
#if ENABLE_ASCON_AEAD128
            sendMessageInfoPublish(buildAsconHandshakePayload());
#else
            this->sendMessageInfo("{\"test\":\"mqtt connect\"}");
#endif
        } else {
             DEVICE_LOG_INFO("failed, rc="+String(MqttClient.state()));
             DEVICE_LOG_INFO(" try again in 5 seconds");
        }
  }


  DEVICE_LOG_INFO("end NetWork_Mqtt::connectMqtt");
}


unsigned char  NetWork_Mqtt::checkStatusMqtt(){
  return (MqttClient.connected() ? 1 : 0);
}
void NetWork_Mqtt::sendMessageInfo(char * data){
  String payload = String(data);
  DEVICE_LOG_INFO("start NetWork_Mqtt::sendMessageInfo"+ payload);
#if ENABLE_ASCON_AEAD128
  payload = maybeEncryptPayload(payload);
#endif
#if ENABLE_MESSAGE_AUTHENTICATION
  if (!messageAuthenticationLoaded) {
    DEVICE_LOG_INFO("[MQTT Auth] Publish blocked: credentials are not loaded");
    return;
  }
  String signedData;
  if (!signMqttPayload(payload, signedData)) {
    return;
  }
  payload = signedData;
#endif
  char *p = new char[payload.length() + 1];
  strcpy(p, payload.c_str());
  if (MqttClient.publish(Settings.public_topic, p, 1)) {
  }
  delete[] p;
  DEVICE_LOG_INFO("end NetWork_Mqtt::sendMessageInfo");
}



void NetWork_Mqtt::MqttSubscribe(char *topic)
{
  MqttClient.subscribe(topic);
  MqttClient.loop();  // Solve LmacRxBlk:1 messages
}

void NetWork_Mqtt::lisenMqtt(){
  DEVICE_LOG_INFO("start NetWork_Mqtt::lisenMqtt");
  MqttClient.loop(); 
  DEVICE_LOG_INFO("end NetWork_Mqtt::lisenMqtt");
}

void NetWork_Mqtt::MqttReconnect()
{
  DEVICE_LOG_INFO("start NetWork_Mqtt::MqttReconnect");
/*
  EspClient.stop();
  if (!EspClient.connect(Settings.mqtt_host, Settings.mqtt_port)) {
    return;
  }

  EspClient.stop();
  yield();*/
  
  this->connectMqtt();
  DEVICE_LOG_INFO("end NetWork_Mqtt::MqttReconnect");
}


