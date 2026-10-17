#include "TaskNetWork.h"

#include <ArduinoJson.h>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "NetWork_Mqtt.h"
#include "NetWork_RF.h"
#include "NetWork_Wifi.h"
#include "PlatformCompat.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "TaskSensor.h"
#include "define_All.h"

NetWork_Wifi netWork_Wifi;
NetWork_Mqtt netWork_Mqtt;
NetWork_RF netWork_RF;
InfoSensor sensorValue = {};
InfoDeviceControl statusDevice = {};
String lastLoraPayload;

#if SUPPORT_RTOS
QueueHandle_t sensorDataQueue = nullptr;
QueueHandle_t deviceStatusQueue = nullptr;
QueueHandle_t deviceCommandQueue = nullptr;
#endif

namespace {
uint8_t modeStatus = WIFI_BLE_SMART_CONFIG;
bool stationServerStarted = false;
bool sensorDirty = false;
bool statusDirty = false;
uint32_t lastSensorSequence = 0;
uint32_t lastMqttAttemptMs = 0;
uint32_t lastTelemetryMs = 0;
uint32_t lastSensorPublishMs = 0;

#if SUPPORT_RTOS
TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif

bool isStationMode(uint8_t mode) {
    return mode == WIFI_START_CONNECT;
}

void publishDeviceState() {
    const String payload = getInfoDevice(sensorValue, statusDevice);
    if (payload.length() == 0) {
        return;
    }
    char buffer[MQTT_PAYLOAD_SIZE];
    payload.toCharArray(buffer, sizeof(buffer));
    netWork_Mqtt.sendMessageInfo(buffer);
}

void receiveLora() {
#if SUPPORT_LORA
    uint8_t buffer[LORA_BUFFER_SIZE + 1] = {};
    size_t receivedLength = 0;
    if (!netWork_RF.receiveData(buffer, LORA_BUFFER_SIZE, receivedLength)) {
        return;
    }
    lastLoraPayload = String();
    lastLoraPayload.reserve(receivedLength);
    for (size_t index = 0; index < receivedLength; ++index) {
        const char character = static_cast<char>(buffer[index]);
        // MQTT/HTTP bridges carry text; retain printable payload bytes only.
        lastLoraPayload += static_cast<uint8_t>(character) >= 0x20 ? character : '?';
    }

    if (netWork_Mqtt.checkStatusMqtt()) {
        StaticJsonDocument<SENSOR_PAYLOAD_SIZE> document;
        document["event"] = "lora.receive";
        document["data"] = lastLoraPayload;
        document["rssi"] = netWork_RF.packetRssi();
        document["snr"] = netWork_RF.packetSnr();
        String payload;
        if (serializeJson(document, payload) > 0 && payload.length() < MQTT_PAYLOAD_SIZE) {
            char mqttBuffer[MQTT_PAYLOAD_SIZE];
            payload.toCharArray(mqttBuffer, sizeof(mqttBuffer));
            netWork_Mqtt.sendMessageInfo(mqttBuffer);
        }
    }
#endif
}

void collectTaskState() {
#if SUPPORT_RTOS
    InfoSensor queuedSensor;
    while (sensorDataQueue != nullptr &&
           xQueueReceive(sensorDataQueue, &queuedSensor, 0) == pdTRUE) {
        sensorValue = queuedSensor;
        sensorDirty = true;
    }
    InfoDeviceControl queuedStatus;
    while (deviceStatusQueue != nullptr &&
           xQueueReceive(deviceStatusQueue, &queuedStatus, 0) == pdTRUE) {
        statusDevice = queuedStatus;
        statusDirty = true;
    }
#else
    InfoSensor latestSensor;
    if (TaskSensor::copyLatest(latestSensor) &&
        latestSensor.sampleSequence != lastSensorSequence) {
        lastSensorSequence = latestSensor.sampleSequence;
        sensorValue = latestSensor;
        sensorDirty = true;
    }
    InfoDeviceControl latestStatus;
    if (TaskDevice::copyStatus(latestStatus)) {
        if (latestStatus.count_info != statusDevice.count_info ||
            latestStatus.button_click != statusDevice.button_click ||
            latestStatus.device_port != statusDevice.device_port) {
            statusDevice = latestStatus;
            statusDirty = true;
        }
    }
#endif
}

void serviceMqtt() {
    if (WiFi.status() != WL_CONNECTED) {
        stationServerStarted = false;
        return;
    }
    if (!stationServerStarted) {
        netWork_Wifi.startWebServer();
        stationServerStarted = true;
    }
    netWork_Wifi.handerClient();

    const uint32_t now = millis();
    if (!netWork_Mqtt.checkStatusMqtt() &&
        (lastMqttAttemptMs == 0 || now - lastMqttAttemptMs >= MQTT_RECONNECT_DELAY_MS)) {
        lastMqttAttemptMs = now;
        netWork_Mqtt.MqttReconnect();
    }
    netWork_Mqtt.lisenMqtt();

    if (netWork_Mqtt.checkStatusMqtt() &&
        (statusDirty || (sensorDirty &&
         (lastSensorPublishMs == 0 || now - lastSensorPublishMs >= 5000UL)))) {
        publishDeviceState();
        if (sensorDirty) {
            lastSensorPublishMs = now;
        }
        sensorDirty = false;
        statusDirty = false;
    }

    if (netWork_Mqtt.checkStatusMqtt() &&
        (lastTelemetryMs == 0 || now - lastTelemetryMs >= SYSTEM_TASK_TELEMETRY_INTERVAL_MS)) {
        lastTelemetryMs = now;
        const String telemetry = SystemTask::telemetryJson();
        if (telemetry.length() > 0 && telemetry.length() < MQTT_PAYLOAD_SIZE) {
            char buffer[MQTT_PAYLOAD_SIZE];
            telemetry.toCharArray(buffer, sizeof(buffer));
            netWork_Mqtt.sendMessageInfo(buffer);
        }
    }
}
} // namespace

void TaskNetWork::setup() {
    Memory::GetInstance()->initEEPROM(EEPROM_SIZE);

#if SUPPORT_RTOS
    // Length one makes these latest-state mailboxes bounded and non-blocking.
    sensorDataQueue = xQueueCreate(1, sizeof(InfoSensor));
    deviceStatusQueue = xQueueCreate(1, sizeof(InfoDeviceControl));
    deviceCommandQueue = xQueueCreate(4, sizeof(DeviceCommand));
    if (sensorDataQueue == nullptr || deviceStatusQueue == nullptr ||
        deviceCommandQueue == nullptr) {
        DEVICE_LOG_ERROR("[Network] FreeRTOS queue creation failed");
    }
#endif

    const uint8_t storedMode = static_cast<uint8_t>(Memory::GetInstance()->readChar(WIFI_MODE));
    modeStatus = storedMode == WIFI_START_CONNECT ? WIFI_START_CONNECT : WIFI_BLE_SMART_CONFIG;

#if SUPPORT_LORA
    if (netWork_RF.begin()) {
        DEVICE_LOG_INFO("[LoRa] Initialized in polling mode");
    } else {
        DEVICE_LOG_WARNING("[LoRa] Initialization failed");
    }
#endif

    if (isStationMode(modeStatus)) {
        netWork_Wifi.connectWifi();
        netWork_Mqtt.getAllDataSetup();
        netWork_Mqtt.setupInfoMQTT();
    } else {
        netWork_Wifi.setupAP();
        netWork_Wifi.startWebserverAP();
    }
    SystemTask::setup();
}

void TaskNetWork::loopNetWork() {
    collectTaskState();

    if (isStationMode(modeStatus)) {
        netWork_Wifi.maintainConnection();
        if (netWork_Wifi.checkModeHostPost()) {
            netWork_Wifi.loopAP();
        } else {
            serviceMqtt();
        }
    } else {
        netWork_Wifi.loopAP();
    }

    receiveLora();
    SystemTask::setNetworkState(WiFi.status() == WL_CONNECTED,
                                netWork_Mqtt.checkStatusMqtt() != 0,
                                WiFi.status() == WL_CONNECTED);
#if !SUPPORT_RTOS
    SystemTask::service();
#endif
}

void TaskNetWork::taskRun(void* parameter) {
    (void)parameter;
#if SUPPORT_RTOS
    for (;;) {
        loopNetWork();
        vTaskDelay(delayTicks(20));
    }
#else
    loopNetWork();
#endif
}

