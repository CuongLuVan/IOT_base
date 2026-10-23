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

#if MQTT_NO_TLS || ENABLE_TLS_SSL || ENABLE_mTLS
  #include <WiFiClientSecure.h>
  using MqttWiFiClient = WiFiClientSecure;
#else
  using MqttWiFiClient = WiFiClient;
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
    char user[33] = {};
    char password[33] = {};
    char publishTopic[64] = {};
    char subscribeTopic[64] = {};
};

MqttSettings settings;
MqttWiFiClient mqttTransport;
PubSubClient mqttClient(mqttTransport);
StaticJsonDocument<MQTT_JSON_DOC_SIZE> settingsDocument;
DeviceCommand pendingCommand = {};
bool settingsLoaded = false;
bool clockRequested = false;
#if ENABLE_TLS_SSL || ENABLE_mTLS
String caCertificate;
#endif
#if ENABLE_mTLS
String clientCertificate;
String privateKey;
bool mtlsCredentialsLoaded = false;
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
    settingsDocument.clear();
    if (deserializeJson(settingsDocument, json)) {
        return false;
    }
    strlcpy(settings.host, settingsDocument["mqtt_host"] | "", sizeof(settings.host));
    settings.port = settingsDocument["mqtt_port"] | 0;
    strlcpy(settings.client, settingsDocument["mqtt_client"] | "", sizeof(settings.client));
    strlcpy(settings.user, settingsDocument["mqtt_user"] | "", sizeof(settings.user));
    strlcpy(settings.password, settingsDocument["mqtt_pwd"] | "", sizeof(settings.password));
    strlcpy(settings.publishTopic, settingsDocument["public_topic"] | "", sizeof(settings.publishTopic));
    strlcpy(settings.subscribeTopic, settingsDocument["subcribe_topic"] | "", sizeof(settings.subscribeTopic));

    return settings.host[0] != '\0' && settings.port != 0 &&
           settings.client[0] != '\0' && settings.publishTopic[0] != '\0' &&
           settings.subscribeTopic[0] != '\0';
}

bool addReplayMetadata(String& payload) {
    DynamicJsonDocument document(payload.length() + 192);
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

bool publishPayload(const String& data) {
    if (!mqttClient.connected() || settings.publishTopic[0] == '\0') {
        return false;
    }
    String payload = data;
    if (!addReplayMetadata(payload)) {
        return false;
    }
    if (payload.length() >= MQTT_PAYLOAD_SIZE) {
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
    if (length == 0 || length >= MQTT_PAYLOAD_SIZE) {
        DEVICE_LOG_WARNING("[MQTT] Rejected oversized command");
        return;
    }

    StaticJsonDocument<MQTT_COMMAND_DOC_SIZE> document;
    if (deserializeJson(document, data, length)) {
        DEVICE_LOG_WARNING("[MQTT] Rejected invalid command JSON");
        return;
    }

    if (handleScheduleCommand(document)) {
        return;
    }

    const uint8_t commandType = document["com"] | 0;
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

void NetWork_Mqtt::setupInfoMQTT() {
    settingsLoaded = parseSettings(Memory::GetInstance()->readString(WIFI_SETUP_JSON));
    if (!settingsLoaded) {
        DEVICE_LOG_WARNING("[MQTT] Invalid or missing broker configuration");
        return;
    }

#if ENABLE_mTLS
    caCertificate = Memory::GetInstance()->readLargeString(MTLS_CA_CERT_ADDRESS,
                                                            MTLS_CA_CERT_MAX_LENGTH);
    clientCertificate = Memory::GetInstance()->readLargeString(MTLS_CLIENT_CERT_ADDRESS,
                                                                MTLS_CLIENT_CERT_MAX_LENGTH);
    privateKey = Memory::GetInstance()->readLargeString(MTLS_PRIVATE_KEY_ADDRESS,
                                                         MTLS_PRIVATE_KEY_MAX_LENGTH);
    mtlsCredentialsLoaded = caCertificate.length() > 0 && clientCertificate.length() > 0 &&
                            privateKey.length() > 0;
    if (!mtlsCredentialsLoaded) {
        DEVICE_LOG_ERROR("[MQTT] mTLS credentials are missing; insecure fallback is disabled");
        return;
    }
    mqttTransport.setCACert(caCertificate.c_str());
    mqttTransport.setCertificate(clientCertificate.c_str());
    mqttTransport.setPrivateKey(privateKey.c_str());
#elif ENABLE_TLS_SSL
    caCertificate = Memory::GetInstance()->readLargeString(TLS_SSL_DATA_ADDRESS,
                                                            TLS_SSL_DATA_MAX_LENGTH);
    if (caCertificate.length() == 0) {
        DEVICE_LOG_ERROR("[MQTT] CA certificate is missing; insecure fallback is disabled");
        return;
    }
    mqttTransport.setCACert(caCertificate.c_str());
#endif

#if PLATFORM_ESP8266 && !SUPPORT_RTOS
    // BearSSL otherwise allocates large default TLS fragments on an ESP8266.
    mqttTransport.setBufferSizes(512, 512);
#endif

    mqttClient.setServer(settings.host, settings.port);
    mqttClient.setCallback(mqttCallback);
    if (!mqttClient.setBufferSize(MQTT_PAYLOAD_SIZE)) {
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

    bool connected = false;
    if (settings.user[0] != '\0') {
        connected = mqttClient.connect(settings.client, settings.user, settings.password);
    } else {
        connected = mqttClient.connect(settings.client);
    }
    if (!connected) {
        DEVICE_LOG_WARNING(String("[MQTT] Connect failed, state=") + mqttClient.state());
        return;
    }
    if (!mqttClient.subscribe(settings.subscribeTopic)) {
        DEVICE_LOG_WARNING("[MQTT] Subscribe failed");
    }
    DEVICE_LOG_INFO("[MQTT] Connected");
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
