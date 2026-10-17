#include "SystemTask.h"

#include <atomic>
#include <string.h>
#include <time.h>

#include <ArduinoJson.h>
#include <Preferences.h>
#include <WiFi.h>
#include <esp_system.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

#include "Common.h"
#include "DebugInfo.h"
#include "HighSpeedSampler.h"
#include "MemoryData.h"
#include "define_All.h"

#if SUPPORT_RTOS
extern TaskHandle_t Task1;
extern TaskHandle_t Task2;
extern TaskHandle_t Task3;
extern QueueHandle_t deviceCommandQueue;
#endif

namespace {

constexpr size_t kSensorTypeCount = 3;
constexpr size_t kTaskCount = 4;
constexpr time_t kMinimumValidEpoch = 1704067200;
constexpr char kScheduleNamespace[] = "systemtask";
constexpr char kScheduleKey[] = "rules_v1";

const char* const kTaskNames[kTaskCount] = {
    "TaskDevice", "TaskSensor", "TaskNetwork", "SystemTask"
};

std::atomic<uint32_t> collectedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> missedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> droppedSamples[kSensorTypeCount] = {};
std::atomic<uint32_t> packetsSent[kSensorTypeCount] = {};
std::atomic<uint32_t> packetErrors[kSensorTypeCount] = {};
std::atomic<uint32_t> bufferFullEvents = 0;
std::atomic<uint32_t> schedulesTriggered = 0;
std::atomic<uint32_t> scheduleCommandFailures = 0;
std::atomic<bool> wifiConnected = false;
std::atomic<bool> mqttConnected = false;
std::atomic<bool> udpAvailable = false;

SystemTaskSnapshot latestSnapshot = {};
SystemControlSchedule schedules[SYSTEM_TASK_SCHEDULE_MAX_RULES] = {};
portMUX_TYPE snapshotMux = portMUX_INITIALIZER_UNLOCKED;
portMUX_TYPE scheduleMux = portMUX_INITIALIZER_UNLOCKED;
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

bool isValidSchedule(const SystemControlSchedule& rule)
{
    if (rule.enabled > 1 || rule.turnOn > 1 || rule.hour > 23 || rule.minute > 59) {
        return false;
    }
    if (rule.enabled == 0) return true;

    switch (rule.period) {
        case SYSTEM_SCHEDULE_WEEKLY:
            return rule.weekday <= 6;
        case SYSTEM_SCHEDULE_MONTHLY:
            return rule.day >= 1 && rule.day <= 31;
        case SYSTEM_SCHEDULE_YEARLY:
            return rule.month >= 1 && rule.month <= 12 &&
                   rule.day >= 1 && rule.day <= 31;
        default:
            return false;
    }
}

void normalizeSchedule(SystemControlSchedule& rule)
{
    if (rule.period == SYSTEM_SCHEDULE_WEEKLY) {
        rule.day = 0;
        rule.month = 0;
    } else if (rule.period == SYSTEM_SCHEDULE_MONTHLY) {
        rule.weekday = 0;
        rule.month = 0;
    } else if (rule.period == SYSTEM_SCHEDULE_YEARLY) {
        rule.weekday = 0;
    }
}

uint8_t enabledScheduleCount()
{
    uint8_t count = 0;
    portENTER_CRITICAL(&scheduleMux);
    for (const SystemControlSchedule& rule : schedules) count += rule.enabled != 0 ? 1 : 0;
    portEXIT_CRITICAL(&scheduleMux);
    return count;
}

void persistSchedules()
{
    SystemControlSchedule persisted[SYSTEM_TASK_SCHEDULE_MAX_RULES] = {};
    portENTER_CRITICAL(&scheduleMux);
    memcpy(persisted, schedules, sizeof(persisted));
    portEXIT_CRITICAL(&scheduleMux);
    for (SystemControlSchedule& rule : persisted) rule.lastTriggeredMinute = 0;

    Preferences preferences;
    if (!preferences.begin(kScheduleNamespace, false)) {
        DEVICE_LOG_INFO("[SystemTask] Cannot open schedule storage");
        return;
    }
    if (preferences.putBytes(kScheduleKey, persisted, sizeof(persisted)) != sizeof(persisted)) {
        DEVICE_LOG_INFO("[SystemTask] Cannot save schedules");
    }
    preferences.end();
}

void loadSchedules()
{
    SystemControlSchedule loaded[SYSTEM_TASK_SCHEDULE_MAX_RULES] = {};
    Preferences preferences;
    if (preferences.begin(kScheduleNamespace, true)) {
        if (preferences.getBytesLength(kScheduleKey) == sizeof(loaded)) {
            (void)preferences.getBytes(kScheduleKey, loaded, sizeof(loaded));
        }
        preferences.end();
    }

    for (SystemControlSchedule& rule : loaded) {
        rule.lastTriggeredMinute = 0;
        if (!isValidSchedule(rule)) rule = {};
        else normalizeSchedule(rule);
    }
    portENTER_CRITICAL(&scheduleMux);
    memcpy(schedules, loaded, sizeof(schedules));
    portEXIT_CRITICAL(&scheduleMux);
}

void synchronizeClockIfNeeded()
{
    if (WiFi.status() != WL_CONNECTED || time(nullptr) >= kMinimumValidEpoch) return;
    const uint32_t nowMs = millis();
    if (!ntpConfigured || nowMs - lastNtpRequestMs >= SYSTEM_TASK_NTP_RETRY_INTERVAL_MS) {
        configTime(SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS, 0, "pool.ntp.org", "time.nist.gov");
        ntpConfigured = true;
        lastNtpRequestMs = nowMs;
    }
}

bool ruleMatches(const SystemControlSchedule& rule, const tm& localTime)
{
    if (rule.enabled == 0 || rule.hour != localTime.tm_hour || rule.minute != localTime.tm_min) {
        return false;
    }
    switch (rule.period) {
        case SYSTEM_SCHEDULE_WEEKLY: return rule.weekday == localTime.tm_wday;
        case SYSTEM_SCHEDULE_MONTHLY: return rule.day == localTime.tm_mday;
        case SYSTEM_SCHEDULE_YEARLY:
            return rule.month == static_cast<uint8_t>(localTime.tm_mon + 1) &&
                   rule.day == localTime.tm_mday;
        default: return false;
    }
}

bool queueScheduleCommand(bool turnOn)
{
    DeviceCommand command = {};
    command.commandType = COMMAND_TYPE_SCHEDULE_CONTROL;
    command.commandValue = turnOn ? 1 : 0;
    command.reserved = COMMAND_RESERVED_CONTROL;
#if SUPPORT_RTOS
    return deviceCommandQueue != nullptr && xQueueSend(deviceCommandQueue, &command, 0) == pdTRUE;
#else
    static DeviceCommand cooperativeCommand = {};
    cooperativeCommand = command;
    MemoryData::GetInstance().deviceCommand_ = &cooperativeCommand;
    return true;
#endif
}

void processSchedules()
{
    const time_t epoch = time(nullptr);
    if (epoch < kMinimumValidEpoch) return;

    tm localTime = {};
    localtime_r(&epoch, &localTime);
    const uint32_t epochMinute = static_cast<uint32_t>(epoch / 60);
    bool hasCommand = false;
    bool commandTurnOn = false;

    portENTER_CRITICAL(&scheduleMux);
    for (SystemControlSchedule& rule : schedules) {
        if (ruleMatches(rule, localTime) && rule.lastTriggeredMinute != epochMinute) {
            rule.lastTriggeredMinute = epochMinute;
            // Higher slot IDs override lower ones when rules collide, so each
            // scheduler cycle emits at most one command for the fixed port.
            commandTurnOn = rule.turnOn != 0;
            hasCommand = true;
        }
    }
    portEXIT_CRITICAL(&scheduleMux);

    if (hasCommand) {
        if (queueScheduleCommand(commandTurnOn)) schedulesTriggered.fetch_add(1);
        else {
            scheduleCommandFailures.fetch_add(1);
            DEVICE_LOG_INFO("[SystemTask] Schedule command queue unavailable");
        }
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
    snapshot.udpQueueDepth = HighSpeedSampler::GetInstance().packetQueueDepth();
    const time_t epoch = time(nullptr);
    snapshot.clockValid = epoch >= kMinimumValidEpoch;
    snapshot.epochSeconds = snapshot.clockValid ? static_cast<uint64_t>(epoch) : 0;
    snapshot.wifiConnected = wifiConnected.load();
    snapshot.mqttConnected = mqttConnected.load();
    snapshot.udpAvailable = udpAvailable.load();
    snapshot.schedulesTriggered = schedulesTriggered.load();
    snapshot.scheduleCommandFailures = scheduleCommandFailures.load();
    snapshot.enabledSchedules = enabledScheduleCount();
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
            snapshot.taskStackHighWater[i] = static_cast<uint32_t>(uxTaskGetStackHighWaterMark(handles[i]));
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
    portENTER_CRITICAL(&snapshotMux);
    latestSnapshot = {};
    portEXIT_CRITICAL(&snapshotMux);
    ntpConfigured = false;
    lastNtpRequestMs = 0;
    loadSchedules();
}

void SystemTask::service()
{
    static uint32_t lastServiceMs = 0;
    static uint32_t scheduleMisses = 0;
    const uint32_t now = millis();
    if (lastServiceMs != 0 && now - lastServiceMs < SYSTEM_TASK_CHECK_INTERVAL_MS) return;
    if (lastServiceMs != 0 && now - lastServiceMs >= SYSTEM_TASK_CHECK_INTERVAL_MS * 2UL) {
        scheduleMisses += (now - lastServiceMs) / SYSTEM_TASK_CHECK_INTERVAL_MS - 1UL;
    }
    lastServiceMs = now;
    collectSnapshot(scheduleMisses);
    processSchedules();
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
        processSchedules();

#if SYSTEM_TASK_DEBUG_LOG
        const uint32_t nowMs = millis();
        if (nowMs - lastDebugLogMs >= SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS) {
            lastDebugLogMs = nowMs;
            SystemTaskSnapshot snapshot;
            portENTER_CRITICAL(&snapshotMux);
            snapshot = latestSnapshot;
            portEXIT_CRITICAL(&snapshotMux);
            DEVICE_LOG_INFO("[SystemTask] heap=" + String(snapshot.freeHeapBytes) +
                " schedules=" + String(snapshot.enabledSchedules) +
                " wifi/mqtt/udp=" + String(snapshot.wifiConnected) + "/" +
                String(snapshot.mqttConnected) + "/" + String(snapshot.udpAvailable));
        }
#endif
    }
#endif
}

bool SystemTask::configureSchedule(uint8_t slot, const SystemControlSchedule& input)
{
    if (slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES || !isValidSchedule(input)) return false;
    SystemControlSchedule rule = input;
    rule.lastTriggeredMinute = 0;
    normalizeSchedule(rule);
    portENTER_CRITICAL(&scheduleMux);
    schedules[slot] = rule;
    portEXIT_CRITICAL(&scheduleMux);
    persistSchedules();
    return true;
}

bool SystemTask::clearSchedule(uint8_t slot)
{
    if (slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES) return false;
    portENTER_CRITICAL(&scheduleMux);
    schedules[slot] = {};
    portEXIT_CRITICAL(&scheduleMux);
    persistSchedules();
    return true;
}

void SystemTask::recordCollectedSamples(UdpPacketType type, uint32_t count)
{
    const int index = sensorIndex(type);
    if (index >= 0) collectedSamples[index].fetch_add(count);
}

void SystemTask::recordMissedSamples(UdpPacketType type, uint32_t count)
{
    const int index = sensorIndex(type);
    if (index >= 0 && count > 0) {
        missedSamples[index].fetch_add(count);
        droppedSamples[index].fetch_add(count);
    }
}

void SystemTask::recordBufferFull(UdpPacketType type, uint32_t droppedCount)
{
    const int index = sensorIndex(type);
    bufferFullEvents.fetch_add(1);
    if (index >= 0) droppedSamples[index].fetch_add(droppedCount);
}

void SystemTask::recordUdpSent(UdpPacketType type)
{
    const int index = sensorIndex(type);
    if (index >= 0) packetsSent[index].fetch_add(1);
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

String SystemTask::schedulerJson(const char* event)
{
    StaticJsonDocument<256> document;
    document["event"] = event == nullptr ? "schedule.status" : event;
    document["port_mask"] = SYSTEM_TASK_SCHEDULE_PORT_MASK;
    document["enabled_rules"] = enabledScheduleCount();
    document["triggered"] = schedulesTriggered.load();
    document["command_failures"] = scheduleCommandFailures.load();
    document["clock_valid"] = time(nullptr) >= kMinimumValidEpoch;
    if (document.overflowed()) return String();
    String payload;
    return serializeJson(document, payload) == 0 ? String() : payload;
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

    JsonObject scheduler = document.createNestedObject("scheduler");
    scheduler["enabled_rules"] = snapshot.enabledSchedules;
    scheduler["triggered"] = snapshot.schedulesTriggered;
    scheduler["command_failures"] = snapshot.scheduleCommandFailures;
    scheduler["port_mask"] = SYSTEM_TASK_SCHEDULE_PORT_MASK;

    JsonArray tasks = document.createNestedArray("tasks");
    for (size_t i = 0; i < kTaskCount; ++i) {
        JsonObject task = tasks.createNestedObject();
        task["name"] = kTaskNames[i];
        task["state"] = taskStateName(snapshot.taskStates[i]);
        task["stack_hwm_units"] = snapshot.taskStackHighWater[i];
    }

    JsonObject counters = document.createNestedObject("capture");
    JsonArray sensorNames = counters.createNestedArray("sensor_order");
    sensorNames.add("adc"); sensorNames.add("imu"); sensorNames.add("ads");
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
