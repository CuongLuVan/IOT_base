#include "SystemTask.h"

#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <time.h>

#include "Automation.h"
#include "Clock.h"
#include "DebugInfo.h"
#include "HighSpeedSampler.h"
#include "ScheduleEngine.h"
#include "Sync.h"
#include "TaskWatchdog.h"
#include "define_All.h"

namespace {

constexpr size_t kTaskCount = 4;
// How often taskRun() checks whether a cycle is due.
constexpr uint32_t kPollIntervalMs = 100;
// Wait for the snapshot mutex; on timeout the update / read is skipped.
constexpr uint32_t kSnapshotLockTimeoutMs = 10;

// Indexed by task_watchdog::Slot; the names given to xTaskCreatePinnedToCore().
const char* const kTaskNames[kTaskCount] = {"TaskDevice", "TaskSensor", "TaskNetwork", "SystemTask"};
static_assert(kTaskCount == static_cast<size_t>(task_watchdog::Slot::Count), "one name per task slot");

// Written by the capture and network tasks, read by SystemTask.
platform_sync::AtomicU32 collectedSamples[kCaptureTypeCount];
platform_sync::AtomicU32 missedSamples[kCaptureTypeCount];
platform_sync::AtomicU32 droppedSamples[kCaptureTypeCount];
platform_sync::AtomicU32 packetsSent[kCaptureTypeCount];
platform_sync::AtomicU32 packetErrors[kCaptureTypeCount];
platform_sync::AtomicU32 bufferFullEvents;
platform_sync::AtomicU32 wifiConnected;
platform_sync::AtomicU32 mqttConnected;
platform_sync::AtomicU32 udpAvailable;

// Written by SystemTask, read by telemetryJson() in TaskNetwork.
platform_sync::Mutex snapshotMutex;
SystemTaskSnapshot latestSnapshot = {};

// Written by setup() before the tasks run; read by SystemTask.
TaskHandle_t taskHandles[kTaskCount] = {};

// SystemTask only.
uint32_t lastCycleMs = 0;
bool cycleStarted = false;
uint32_t cycleOverruns = 0;
#if SYSTEM_TASK_DEBUG_LOG
uint32_t lastDebugLogMs = 0;
#endif

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

void addTaskStates(SystemTaskSnapshot& snapshot)
{
    for (size_t i = 0; i < kTaskCount; ++i) {
        if (taskHandles[i] == nullptr) continue;
        snapshot.taskStates[i] = static_cast<uint8_t>(eTaskGetState(taskHandles[i]));
        snapshot.taskStackHighWater[i] = static_cast<uint32_t>(uxTaskGetStackHighWaterMark(taskHandles[i]));
    }
}

void refreshSnapshot()
{
    SystemTaskSnapshot snapshot = {};
    snapshot.uptimeMs = millis();
    snapshot.cycleOverruns = cycleOverruns;
    snapshot.freeHeapBytes = ESP.getFreeHeap();
    snapshot.minFreeHeapBytes = ESP.getMinFreeHeap();
    snapshot.udpQueueDepth = HighSpeedSampler::GetInstance().packetQueueDepth();
    snapshot.epochSeconds = static_cast<uint64_t>(device_clock::epochOrZero());
    snapshot.clockValid = snapshot.epochSeconds != 0;
    snapshot.wifiConnected = wifiConnected.load() != 0;
    snapshot.mqttConnected = mqttConnected.load() != 0;
    snapshot.udpAvailable = udpAvailable.load() != 0;
    snapshot.schedulesTriggered = ScheduleEngine::triggeredCount();
    snapshot.scheduleCommandFailures = ScheduleEngine::commandFailureCount();
    snapshot.enabledSchedules = ScheduleEngine::activeCount();
    snapshot.cpuUsageSupported = false;
    for (size_t i = 0; i < kCaptureTypeCount; ++i) {
        snapshot.samplesCollected[i] = collectedSamples[i].load();
        snapshot.missedSamples[i] = missedSamples[i].load();
        snapshot.droppedSamples[i] = droppedSamples[i].load();
        snapshot.packetsSent[i] = packetsSent[i].load();
        snapshot.packetErrors[i] = packetErrors[i].load();
    }
    snapshot.bufferFullEvents = bufferFullEvents.load();
    addTaskStates(snapshot);

    platform_sync::ScopedLock lock(snapshotMutex, kSnapshotLockTimeoutMs);
    if (lock.locked()) latestSnapshot = snapshot;
}

bool readSnapshot(SystemTaskSnapshot& snapshot)
{
    platform_sync::ScopedLock lock(snapshotMutex, kSnapshotLockTimeoutMs);
    if (!lock.locked()) return false;
    snapshot = latestSnapshot;
    return true;
}

void logDebugSummary()
{
#if SYSTEM_TASK_DEBUG_LOG
    const uint32_t nowMs = millis();
    if (nowMs - lastDebugLogMs < SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS) return;
    lastDebugLogMs = nowMs;
    SystemTaskSnapshot snapshot;
    if (!readSnapshot(snapshot)) return;
    DEVICE_LOGF_DEBUG("[SystemTask] heap=%lu schedules=%u wifi/mqtt/udp=%d/%d/%d\n",
                      static_cast<unsigned long>(snapshot.freeHeapBytes), snapshot.enabledSchedules,
                      snapshot.wifiConnected, snapshot.mqttConnected, snapshot.udpAvailable);
#endif
}

void addCount(platform_sync::AtomicU32* counters, UdpPacketType type, uint32_t count)
{
    const int index = captureIndex(type);
    if (index >= 0 && count > 0) counters[index].fetchAdd(count);
}

}  // namespace

void SystemTask::setup()
{
    if (!snapshotMutex.create()) DEVICE_LOG_ERROR("[SystemTask] Cannot create snapshot mutex; telemetry disabled");
    lastCycleMs = 0;
    cycleStarted = false;
    cycleOverruns = 0;
    Automation::setup();
}

void SystemTask::taskRun(void* parameter)
{
    (void)parameter;
#if SUPPORT_RTOS
    task_watchdog::add(task_watchdog::Slot::System);
    for (;;) {
        service();
        task_watchdog::reset(task_watchdog::Slot::System);
        vTaskDelay(platform_sync::timeoutTicks(kPollIntervalMs));
    }
#endif
}

void SystemTask::service()
{
    const uint32_t now = millis();
    if (cycleStarted) {
        const uint32_t elapsed = now - lastCycleMs;
        if (elapsed < SYSTEM_TASK_CHECK_INTERVAL_MS) return;
        // Started a whole interval or more late: count each missed cycle once.
        cycleOverruns += elapsed / SYSTEM_TASK_CHECK_INTERVAL_MS - 1;
    }
    cycleStarted = true;
    lastCycleMs = now;

    task_watchdog::restartIfStalled();
    Automation::runSchedules(time(nullptr));
    // A flash commit stalls both cores (cache disabled): not during a capture.
    Automation::flushSettingsIfDue(now, !HighSpeedSampler::GetInstance().isSamplingActive());
    refreshSnapshot();
    logDebugSummary();
}

void SystemTask::registerTask(task_watchdog::Slot slot, void* handle)
{
    const size_t index = static_cast<size_t>(slot);
    if (index < kTaskCount) taskHandles[index] = static_cast<TaskHandle_t>(handle);
}

void SystemTask::recordCollectedSamples(UdpPacketType type, uint32_t count)
{
    addCount(collectedSamples, type, count);
}

void SystemTask::recordMissedSamples(UdpPacketType type, uint32_t count)
{
    addCount(missedSamples, type, count);
    addCount(droppedSamples, type, count);
}

void SystemTask::recordBufferFull(UdpPacketType type, uint32_t droppedCount)
{
    bufferFullEvents.fetchAdd(1);
    addCount(droppedSamples, type, droppedCount);
}

void SystemTask::recordUdpSent(UdpPacketType type)
{
    addCount(packetsSent, type, 1);
}

void SystemTask::recordUdpFailure(UdpPacketType type, uint32_t droppedCount)
{
    addCount(packetErrors, type, 1);
    addCount(droppedSamples, type, droppedCount);
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool udp)
{
    wifiConnected.store(wifi ? 1 : 0);
    mqttConnected.store(mqtt ? 1 : 0);
    udpAvailable.store(udp ? 1 : 0);
}

String SystemTask::telemetryJson()
{
    SystemTaskSnapshot snapshot;
    if (!readSnapshot(snapshot)) return String();

    JsonDocument document;
    document["event"] = "system.status";
    document["uptime_ms"] = snapshot.uptimeMs;
    document["epoch_s"] = snapshot.epochSeconds;
    document["clock_valid"] = snapshot.clockValid;
    document["schedule_misses"] = snapshot.cycleOverruns;
    document["heap_free_bytes"] = snapshot.freeHeapBytes;
    document["heap_min_free_bytes"] = snapshot.minFreeHeapBytes;
    document["udp_queue_depth"] = snapshot.udpQueueDepth;
    document["cpu_usage_supported"] = snapshot.cpuUsageSupported;

    JsonObject network = document["network"].to<JsonObject>();
    network["wifi"] = snapshot.wifiConnected;
    network["mqtt"] = snapshot.mqttConnected;
    network["udp_tx"] = snapshot.udpAvailable;

    JsonObject scheduler = document["scheduler"].to<JsonObject>();
    scheduler["enabled_rules"] = snapshot.enabledSchedules;
    scheduler["triggered"] = snapshot.schedulesTriggered;
    scheduler["command_failures"] = snapshot.scheduleCommandFailures;
    scheduler["port_mask"] = AUTOMATION_PORT_MASK;

    JsonArray tasks = document["tasks"].to<JsonArray>();
    for (size_t i = 0; i < kTaskCount; ++i) {
        JsonObject task = tasks.add<JsonObject>();
        task["name"] = kTaskNames[i];
        task["state"] = taskStateName(snapshot.taskStates[i]);
        task["stack_hwm_units"] = snapshot.taskStackHighWater[i];
    }

    JsonObject counters = document["capture"].to<JsonObject>();
    JsonArray sensorNames = counters["sensor_order"].to<JsonArray>();
    sensorNames.add("adc");
    sensorNames.add("imu");
    sensorNames.add("ads");
    JsonArray samples = counters["samples_collected"].to<JsonArray>();
    JsonArray missed = counters["missed_samples"].to<JsonArray>();
    JsonArray dropped = counters["dropped_samples"].to<JsonArray>();
    JsonArray sent = counters["udp_packets_sent"].to<JsonArray>();
    JsonArray errors = counters["udp_packet_errors"].to<JsonArray>();
    for (size_t i = 0; i < kCaptureTypeCount; ++i) {
        samples.add(snapshot.samplesCollected[i]);
        missed.add(snapshot.missedSamples[i]);
        dropped.add(snapshot.droppedSamples[i]);
        sent.add(snapshot.packetsSent[i]);
        errors.add(snapshot.packetErrors[i]);
    }
    counters["buffer_full_events"] = snapshot.bufferFullEvents;

    String payload;
    if (document.overflowed() || serializeJson(document, payload) == 0) {
        DEVICE_LOG_WARNING("[SystemTask] Telemetry JSON serialization failed");
        return String();
    }
    return payload;
}
