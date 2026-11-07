#include "SystemTask.h"

#include <ArduinoJson.h>
#include <time.h>

#include "Automation.h"
#include "Clock.h"
#include "DebugInfo.h"
#include "PlatformCompat.h"
#include "ScheduleEngine.h"
#include "Sync.h"
#include "TaskWatchdog.h"
#include "define_All.h"

namespace {

// How often taskRun() checks whether a cycle is due.
constexpr uint32_t kPollIntervalMs = 100;
// Wait for the snapshot mutex; on timeout the update / read is skipped.
constexpr uint32_t kSnapshotLockTimeoutMs = 10;

constexpr size_t kTaskCount = static_cast<size_t>(task_watchdog::Slot::Count);
// Indexed by task_watchdog::Slot; the names given to xTaskCreate().
const char* const kTaskNames[kTaskCount] = {"TaskDevice", "TaskSensor", "TaskNetwork", "SystemTask"};

// Written by the network task, read by SystemTask.
platform_sync::AtomicU32 wifiConnected;
platform_sync::AtomicU32 mqttConnected;

// Written by SystemTask, read by telemetryJson() in TaskNetwork.
platform_sync::Mutex snapshotMutex;
SystemTaskSnapshot latestSnapshot = {};

#if SUPPORT_RTOS
// Written by setup() before the tasks run; read by SystemTask.
TaskHandle_t taskHandles[kTaskCount] = {};
#endif

// SystemTask only.
uint32_t lastCycleMs = 0;
bool cycleStarted = false;
uint32_t cycleOverruns = 0;
#if SYSTEM_TASK_DEBUG_LOG
uint32_t lastDebugLogMs = 0;
#endif

void refreshSnapshot()
{
    SystemTaskSnapshot snapshot = {};
    snapshot.uptimeMs = millis();
    snapshot.cycleOverruns = cycleOverruns;
    snapshot.freeHeapBytes = ESP.getFreeHeap();
    snapshot.epochSeconds = static_cast<uint64_t>(device_clock::epochOrZero());
    snapshot.clockValid = snapshot.epochSeconds != 0;
    snapshot.wifiConnected = wifiConnected.load() != 0;
    snapshot.mqttConnected = mqttConnected.load() != 0;
    snapshot.schedulesTriggered = ScheduleEngine::triggeredCount();
    snapshot.scheduleCommandFailures = ScheduleEngine::commandFailureCount();
    snapshot.enabledSchedules = ScheduleEngine::activeCount();
#if SUPPORT_RTOS
    for (size_t i = 0; i < kTaskCount; ++i) {
        if (taskHandles[i] == nullptr) continue;
        snapshot.taskStackHighWater[i] = static_cast<uint32_t>(uxTaskGetStackHighWaterMark(taskHandles[i]));
    }
#else
    snapshot.taskStackHighWater[0] = ESP.getFreeContStack();
#endif

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
    DEVICE_LOGF_DEBUG("[SystemTask] heap=%lu schedules=%u wifi/mqtt=%d/%d\n",
                      static_cast<unsigned long>(snapshot.freeHeapBytes), snapshot.enabledSchedules,
                      snapshot.wifiConnected, snapshot.mqttConnected);
#endif
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
    Automation::flushSettingsIfDue(now, true);
    refreshSnapshot();
    logDebugSummary();
}

void SystemTask::registerTask(task_watchdog::Slot slot, void* handle)
{
#if SUPPORT_RTOS
    const size_t index = static_cast<size_t>(slot);
    if (index < kTaskCount) taskHandles[index] = static_cast<TaskHandle_t>(handle);
#else
    (void)slot;
    (void)handle;
#endif
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool)
{
    wifiConnected.store(wifi ? 1 : 0);
    mqttConnected.store(mqtt ? 1 : 0);
}

String SystemTask::telemetryJson()
{
    SystemTaskSnapshot snapshot;
    if (!readSnapshot(snapshot)) return String();

    JsonDocument document;
    document["event"] = "system.status";
    document["uptime_ms"] = snapshot.uptimeMs;
    document["heap_free_bytes"] = snapshot.freeHeapBytes;
    document["epoch_s"] = snapshot.epochSeconds;
    document["clock_valid"] = snapshot.clockValid;
    document["schedule_misses"] = snapshot.cycleOverruns;
    JsonObject network = document["network"].to<JsonObject>();
    network["wifi"] = snapshot.wifiConnected;
    network["mqtt"] = snapshot.mqttConnected;
    JsonObject scheduler = document["scheduler"].to<JsonObject>();
    scheduler["enabled_rules"] = snapshot.enabledSchedules;
    scheduler["triggered"] = snapshot.schedulesTriggered;
    scheduler["command_failures"] = snapshot.scheduleCommandFailures;
    scheduler["port_mask"] = AUTOMATION_PORT_MASK;
#if SUPPORT_RTOS
    JsonArray tasks = document["tasks"].to<JsonArray>();
    for (size_t i = 0; i < kTaskCount; ++i) {
        JsonObject task = tasks.add<JsonObject>();
        task["name"] = kTaskNames[i];
        task["stack_hwm_units"] = snapshot.taskStackHighWater[i];
    }
#else
    document["cont_stack_free_bytes"] = snapshot.taskStackHighWater[0];
#endif

    String payload;
    if (document.overflowed() || serializeJson(document, payload) == 0) {
        DEVICE_LOG_WARNING("[SystemTask] Telemetry JSON serialization failed");
        return String();
    }
    return payload;
}
