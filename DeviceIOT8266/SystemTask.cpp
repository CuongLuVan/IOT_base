#include "SystemTask.h"

#include <time.h>

#include <ArduinoJson.h>
#include <WiFi.h>

// =====================================================================
// Platform-specific includes
// =====================================================================
#if PLATFORM_ESP32
#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#elif PLATFORM_ESP8266
  #if SUPPORT_RTOS
    // ESP8266 RTOS SDK provides FreeRTOS headers
    #include <freertos/FreeRTOS.h>
    #include <freertos/task.h>
  #endif
#endif

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

// ESP8266 is single-core, so std::atomic is not needed; use volatile instead.
#if PLATFORM_ESP32
std::atomic<uint32_t> collectedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> missedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> droppedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> packetsSent[kSensorTypeCount] = {};
std::atomic<uint32_t> packetErrors[kSensorTypeCount] = {};
std::atomic<uint32_t> bufferFullEvents = 0;
std::atomic<bool> wifiConnected = false;
std::atomic<bool> mqttConnected = false;
std::atomic<bool> udpAvailable = false;
#else
volatile uint32_t collectedSamples[kSensorTypeCount] = {};
volatile uint32_t missedSamples[kSensorTypeCount] = {};
volatile uint32_t droppedSamples[kSensorTypeCount] = {};
volatile uint32_t packetsSent[kSensorTypeCount] = {};
volatile uint32_t packetErrors[kSensorTypeCount] = {};
volatile uint32_t bufferFullEvents = 0;
volatile bool wifiConnected_v = false;
volatile bool mqttConnected_v = false;
volatile bool udpAvailable_v = false;
#endif

SystemTaskSnapshot latestSnapshot = {};

// ESP8266 does not have portMUX_TYPE; use noInterrupts/interrupts instead.
#if PLATFORM_ESP32
portMUX_TYPE snapshotMux = portMUX_INITIALIZER_UNLOCKED;
#endif

bool ntpConfigured = false;
uint32_t lastNtpRequestMs = 0;

#if SUPPORT_RTOS
TaskHandle_t systemTaskHandle = nullptr;
#endif

int sensorIndex(UdpPacketType type)
{
    switch (type) {
        case UDP_PACKET_ADC: return 0;
        case UDP_PACKET_IMU: return 1;
        case UDP_PACKET_ADS: return 2;
        default: return -1;
    }
}

#if SUPPORT_RTOS
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
#endif

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

// Platform-agnostic critical section helpers
inline void enterCriticalSnapshot() {
#if PLATFORM_ESP32
    portENTER_CRITICAL(&snapshotMux);
#else
    noInterrupts();
#endif
}

inline void exitCriticalSnapshot() {
#if PLATFORM_ESP32
    portEXIT_CRITICAL(&snapshotMux);
#else
    interrupts();
#endif
}

void collectSnapshot(uint32_t scheduleMisses)
{
    synchronizeClockIfNeeded();

    SystemTaskSnapshot snapshot = {};
    snapshot.uptimeMs = millis();
    snapshot.scheduleMisses = scheduleMisses;
    snapshot.freeHeapBytes = ESP.getFreeHeap();

#if PLATFORM_ESP32
    snapshot.minFreeHeapBytes = ESP.getMinFreeHeap();
#else
    // ESP8266 doesn't have getMinFreeHeap; report current free heap instead
    snapshot.minFreeHeapBytes = ESP.getFreeHeap();
#endif

    snapshot.udpQueueDepth =
        HighSpeedSampler::GetInstance().packetQueueDepth();
    const time_t epoch = time(nullptr);
    snapshot.clockValid = epoch >= kMinimumValidEpoch;
    snapshot.epochSeconds = snapshot.clockValid ? static_cast<uint64_t>(epoch) : 0;

#if PLATFORM_ESP32
    snapshot.wifiConnected = wifiConnected.load();
    snapshot.mqttConnected = mqttConnected.load();
    snapshot.udpAvailable = udpAvailable.load();
#else
    snapshot.wifiConnected = wifiConnected_v;
    snapshot.mqttConnected = mqttConnected_v;
    snapshot.udpAvailable = udpAvailable_v;
#endif
    snapshot.cpuUsageSupported = false;

    for (size_t i = 0; i < kSensorTypeCount; ++i) {
#if PLATFORM_ESP32
        snapshot.samplesCollected[i] = collectedSamples[i].load();
        snapshot.missedSamples[i] = missedSamples[i].load();
        snapshot.droppedSamples[i] = droppedSamples[i].load();
        snapshot.packetsSent[i] = packetsSent[i].load();
        snapshot.packetErrors[i] = packetErrors[i].load();
#else
        snapshot.samplesCollected[i] = collectedSamples[i];
        snapshot.missedSamples[i] = missedSamples[i];
        snapshot.droppedSamples[i] = droppedSamples[i];
        snapshot.packetsSent[i] = packetsSent[i];
        snapshot.packetErrors[i] = packetErrors[i];
#endif
    }

#if PLATFORM_ESP32
    snapshot.bufferFullEvents = bufferFullEvents.load();
#else
    snapshot.bufferFullEvents = bufferFullEvents;
#endif

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

    enterCriticalSnapshot();
    latestSnapshot = snapshot;
    exitCriticalSnapshot();
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
            enterCriticalSnapshot();
            snapshot = latestSnapshot;
            exitCriticalSnapshot();
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
#if PLATFORM_ESP32
        collectedSamples[index].fetch_add(count);
#else
        noInterrupts();
        collectedSamples[index] += count;
        interrupts();
#endif
    }
}

void SystemTask::recordMissedSamples(UdpPacketType type, uint32_t count)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
        if (count == 0) {
            return;
        }
#if PLATFORM_ESP32
        missedSamples[index].fetch_add(count);
        droppedSamples[index].fetch_add(count);
#else
        noInterrupts();
        missedSamples[index] += count;
        droppedSamples[index] += count;
        interrupts();
#endif
    }
}

void SystemTask::recordBufferFull(UdpPacketType type, uint32_t droppedCount)
{
    const int index = sensorIndex(type);
#if PLATFORM_ESP32
    bufferFullEvents.fetch_add(1);
    if (index >= 0) {
        droppedSamples[index].fetch_add(droppedCount);
    }
#else
    noInterrupts();
    bufferFullEvents++;
    if (index >= 0) {
        droppedSamples[index] += droppedCount;
    }
    interrupts();
#endif
}

void SystemTask::recordUdpSent(UdpPacketType type)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
#if PLATFORM_ESP32
        packetsSent[index].fetch_add(1);
#else
        noInterrupts();
        packetsSent[index]++;
        interrupts();
#endif
    }
}

void SystemTask::recordUdpFailure(UdpPacketType type, uint32_t droppedCount)
{
    const int index = sensorIndex(type);
    if (index >= 0) {
#if PLATFORM_ESP32
        packetErrors[index].fetch_add(1);
        droppedSamples[index].fetch_add(droppedCount);
#else
        noInterrupts();
        packetErrors[index]++;
        droppedSamples[index] += droppedCount;
        interrupts();
#endif
    }
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool udp)
{
#if PLATFORM_ESP32
    wifiConnected.store(wifi);
    mqttConnected.store(mqtt);
    udpAvailable.store(udp);
#else
    wifiConnected_v = wifi;
    mqttConnected_v = mqtt;
    udpAvailable_v = udp;
#endif
}

String SystemTask::telemetryJson()
{
    SystemTaskSnapshot snapshot;
    enterCriticalSnapshot();
    snapshot = latestSnapshot;
    exitCriticalSnapshot();

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
#if SUPPORT_RTOS
        task["state"] = taskStateName(snapshot.taskStates[i]);
#else
        task["state"] = "cooperative";
#endif
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
