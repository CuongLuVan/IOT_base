#include "SystemTask.h"

#include <time.h>

#include <ArduinoJson.h>
#include <WiFi.h>
#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

#include "define_All.h"
#include "DebugInfo.h"

#if SUPPORT_RTOS
extern TaskHandle_t Task1;
extern TaskHandle_t Task2;
extern TaskHandle_t Task3;
#endif

namespace {

constexpr size_t kSensorTypeCount = 3;
constexpr size_t kTaskCount = 4;
constexpr time_t kMinimumValidEpoch = 1704067200;

const char* const kTaskNames[kTaskCount] = {
    "TaskDevice", "TaskSensor", "TaskNetwork", "SystemTask"
};

std::atomic<uint32_t> collectedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> missedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> droppedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> packetsSent[kSensorTypeCount] = {};
std::atomic<uint32_t> packetErrors[kSensorTypeCount] = {};
std::atomic<uint32_t> bufferFullEvents = 0;
std::atomic<bool> wifiConnected = false;
std::atomic<bool> mqttConnected = false;
std::atomic<bool> udpAvailable = false;

SystemTaskSnapshot latestSnapshot = {};
portMUX_TYPE snapshotMux = portMUX_INITIALIZER_UNLOCKED;
bool ntpConfigured = false;
uint32_t lastNtpRequestMs = 0;
TaskHandle_t systemTaskHandle = nullptr;

int sensorIndex(UdpPacketType type)
{
    switch (type) {
        case UDP_PACKET_ADC: return 0;
        case UDP_PACKET_IMU: return 1;
        case UDP_PACKET_ADS: return 2;
        default: return -1;
    }
}

const char* taskStateName(uint8_t state)
{
    switch (static_cast<eTaskState>(state)) {
        case eRunning: return "running";
        case eReady: return "ready";
        case eBlocked: return "blocked";
        case eSuspended: return "suspended";
        case eDeleted: return "deleted";
        default: return "invalid";
    }
}

void synchronizeClockIfNeeded()
{
    if (WiFi.status() != WL_CONNECTED || time(nullptr) >= kMinimumValidEpoch) {
        return;
    }
    const uint32_t nowMs = millis();
    if (!ntpConfigured ||
        nowMs - lastNtpRequestMs >= SYSTEM_TASK_NTP_RETRY_INTERVAL_MS) {
        configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        ntpConfigured = true;
        lastNtpRequestMs = nowMs;
    }
}

void collectSnapshot(uint32_t scheduleMisses)
{
    synchronizeClockIfNeeded();

    SystemTaskSnapshot snapshot = {};
    snapshot.uptimeMs = millis();
    snapshot.scheduleMisses = scheduleMisses;
    snapshot.freeHeapBytes = ESP.getFreeHeap();
    snapshot.minFreeHeapBytes = ESP.getMinFreeHeap();
    snapshot.udpQueueDepth =
        HighSpeedSampler::GetInstance().packetQueueDepth();
    const time_t epoch = time(nullptr);
    snapshot.clockValid = epoch >= kMinimumValidEpoch;
    snapshot.epochSeconds = snapshot.clockValid ? static_cast<uint64_t>(epoch) : 0;
    snapshot.wifiConnected = wifiConnected.load();
    snapshot.mqttConnected = mqttConnected.load();
    snapshot.udpAvailable = udpAvailable.load();
    snapshot.cpuUsageSupported = false;

    for (size_t i = 0; i < kSensorTypeCount; ++i) {
        snapshot.samplesCollected[i] = collectedSamples[i].load();
        snapshot.missedSamples[i] = missedSamples[i].load();
        snapshot.droppedSamples[i] = droppedSamples[i].load();
        snapshot.packetsSent[i] = packetsSent[i].load();
        snapshot.packetErrors[i] = packetErrors[i].load();
    }
    snapshot.bufferFullEvents = bufferFullEvents.load();

#if SUPPORT_RTOS
    TaskHandle_t handles[kTaskCount] = {Task1, Task2, Task3, systemTaskHandle};
    for (size_t i = 0; i < kTaskCount; ++i) {
        if (handles[i] != nullptr) {
            snapshot.taskStates[i] = static_cast<uint8_t>(eTaskGetState(handles[i]));
            snapshot.taskStackHighWater[i] =
                static_cast<uint32_t>(uxTaskGetStackHighWaterMark(handles[i]));
        }
    }
#endif

    portENTER_CRITICAL(&snapshotMux);
    latestSnapshot = snapshot;
    portEXIT_CRITICAL(&snapshotMux);
}

} // namespace

void SystemTask::setup()
{
    latestSnapshot = {};
}

void SystemTask::taskRun(void* parameter)
{
    (void)parameter;
#if SUPPORT_RTOS
    systemTaskHandle = xTaskGetCurrentTaskHandle();
    TickType_t lastWake = xTaskGetTickCount();
    const TickType_t period = pdMS_TO_TICKS(SYSTEM_TASK_CHECK_INTERVAL_MS);
    uint32_t scheduleMisses = 0;
    uint32_t lastDebugLogMs = 0;

    for (;;) {
        vTaskDelayUntil(&lastWake, period);
        const TickType_t now = xTaskGetTickCount();
        if (period > 0 && now - lastWake >= period) {
            scheduleMisses += static_cast<uint32_t>((now - lastWake) / period);
        }
        collectSnapshot(scheduleMisses);

#if SYSTEM_TASK_DEBUG_LOG
        const uint32_t nowMs = millis();
        if (nowMs - lastDebugLogMs >= SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS) {
            lastDebugLogMs = nowMs;
            SystemTaskSnapshot snapshot;
            portENTER_CRITICAL(&snapshotMux);
            snapshot = latestSnapshot;
            portEXIT_CRITICAL(&snapshotMux);
            DEVICE_LOG_INFO("[SystemTask] heap=" + String(snapshot.freeHeapBytes) +
                " min_heap=" + String(snapshot.minFreeHeapBytes) +
                " wifi/mqtt/udp=" + String(snapshot.wifiConnected) + "/" +
                String(snapshot.mqttConnected) + "/" +
                String(snapshot.udpAvailable));
        }
#endif
    }
#else
    (void)parameter;
#endif
}

void SystemTask::recordCollectedSamples(UdpPacketType type, uint32_t count)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
        collectedSamples[index].fetch_add(count);
    }
}

void SystemTask::recordMissedSamples(UdpPacketType type, uint32_t count)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
        if (count == 0) {
            return;
        }
        missedSamples[index].fetch_add(count);
        droppedSamples[index].fetch_add(count);
    }
}

void SystemTask::recordBufferFull(UdpPacketType type, uint32_t droppedCount)
{
    const int index = sensorIndex(type);
    bufferFullEvents.fetch_add(1);
    if (index >= 0) {
        droppedSamples[index].fetch_add(droppedCount);
    }
}

void SystemTask::recordUdpSent(UdpPacketType type)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
        packetsSent[index].fetch_add(1);
    }
}

void SystemTask::recordUdpFailure(UdpPacketType type, uint32_t droppedCount)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
        packetErrors[index].fetch_add(1);
        droppedSamples[index].fetch_add(droppedCount);
    }
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool udp)
{
    wifiConnected.store(wifi);
    mqttConnected.store(mqtt);
    udpAvailable.store(udp);
}

String SystemTask::telemetryJson()
{
    SystemTaskSnapshot snapshot;
    portENTER_CRITICAL(&snapshotMux);
    snapshot = latestSnapshot;
    portEXIT_CRITICAL(&snapshotMux);

    StaticJsonDocument<1024> document;
    document["event"] = "system.status";
    document["uptime_ms"] = snapshot.uptimeMs;
    document["epoch_s"] = snapshot.epochSeconds;
    document["clock_valid"] = snapshot.clockValid;
    document["schedule_misses"] = snapshot.scheduleMisses;
    document["heap_free_bytes"] = snapshot.freeHeapBytes;
    document["heap_min_free_bytes"] = snapshot.minFreeHeapBytes;
    document["udp_queue_depth"] = snapshot.udpQueueDepth;
    document["cpu_usage_supported"] = snapshot.cpuUsageSupported;

    JsonObject network = document.createNestedObject("network");
    network["wifi"] = snapshot.wifiConnected;
    network["mqtt"] = snapshot.mqttConnected;
    network["udp_tx"] = snapshot.udpAvailable;

    JsonArray tasks = document.createNestedArray("tasks");
    for (size_t i = 0; i < kTaskCount; ++i) {
        JsonObject task = tasks.createNestedObject();
        task["name"] = kTaskNames[i];
        task["state"] = taskStateName(snapshot.taskStates[i]);
        task["stack_hwm_units"] = snapshot.taskStackHighWater[i];
    }

    JsonObject counters = document.createNestedObject("capture");
    JsonArray sensorNames = counters.createNestedArray("sensor_order");
    sensorNames.add("adc");
    sensorNames.add("imu");
    sensorNames.add("ads");
    JsonArray samples = counters.createNestedArray("samples_collected");
    JsonArray missed = counters.createNestedArray("missed_samples");
    JsonArray dropped = counters.createNestedArray("dropped_samples");
    JsonArray sent = counters.createNestedArray("udp_packets_sent");
    JsonArray errors = counters.createNestedArray("udp_packet_errors");
    for (size_t i = 0; i < kSensorTypeCount; ++i) {
        samples.add(snapshot.samplesCollected[i]);
        missed.add(snapshot.missedSamples[i]);
        dropped.add(snapshot.droppedSamples[i]);
        sent.add(snapshot.packetsSent[i]);
        errors.add(snapshot.packetErrors[i]);
    }
    counters["buffer_full_events"] = snapshot.bufferFullEvents;

    if (document.overflowed()) {
        DEVICE_LOG_INFO("[SystemTask] Telemetry JSON document overflowed");
        return String();
    }
    String payload;
    if (serializeJson(document, payload) == 0) {
        DEVICE_LOG_INFO("[SystemTask] Telemetry JSON serialization failed");
        return String();
    }
    return payload;
}
