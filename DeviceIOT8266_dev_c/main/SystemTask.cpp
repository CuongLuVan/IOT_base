#include "SystemTask.h"

#include <time.h>

#include "Automation.h"
#include "Clock.h"
#include "DebugInfo.h"
#include "JsonUtil.h"
#include "Platform.h"
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

// Written by app_main() before the tasks run; read by SystemTask.
TaskHandle_t taskHandles[kTaskCount] = {};

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
    snapshot.freeHeapBytes = deviceFreeHeap();
    snapshot.epochSeconds = static_cast<uint64_t>(device_clock::epochOrZero());
    snapshot.clockValid = snapshot.epochSeconds != 0;
    snapshot.wifiConnected = wifiConnected.load() != 0;
    snapshot.mqttConnected = mqttConnected.load() != 0;
    snapshot.schedulesTriggered = ScheduleEngine::triggeredCount();
    snapshot.scheduleCommandFailures = ScheduleEngine::commandFailureCount();
    snapshot.enabledSchedules = ScheduleEngine::activeCount();
    for (size_t i = 0; i < kTaskCount; ++i) {
        if (taskHandles[i] == nullptr) continue;
        snapshot.taskStackHighWater[i] = static_cast<uint32_t>(uxTaskGetStackHighWaterMark(taskHandles[i]));
    }

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
    task_watchdog::add(task_watchdog::Slot::System);
    for (;;) {
        service();
        task_watchdog::reset(task_watchdog::Slot::System);
        vTaskDelay(platform_sync::timeoutTicks(kPollIntervalMs));
    }
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
    const size_t index = static_cast<size_t>(slot);
    if (index < kTaskCount) taskHandles[index] = static_cast<TaskHandle_t>(handle);
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool)
{
    wifiConnected.store(wifi ? 1 : 0);
    mqttConnected.store(mqtt ? 1 : 0);
}

std::string SystemTask::telemetryJson()
{
    SystemTaskSnapshot snapshot;
    if (!readSnapshot(snapshot)) return std::string();

    json::Ptr owner = json::newObject();
    cJSON* document = owner.get();
    if (document == nullptr) return std::string();
    json::setString(document, "event", "system.status");
    json::setNumber(document, "uptime_ms", snapshot.uptimeMs);
    json::setNumber(document, "heap_free_bytes", snapshot.freeHeapBytes);
    json::setNumber(document, "epoch_s", static_cast<double>(snapshot.epochSeconds));
    json::setBool(document, "clock_valid", snapshot.clockValid);
    json::setNumber(document, "schedule_misses", snapshot.cycleOverruns);
    cJSON* network = json::setObject(document, "network");
    json::setBool(network, "wifi", snapshot.wifiConnected);
    json::setBool(network, "mqtt", snapshot.mqttConnected);
    cJSON* scheduler = json::setObject(document, "scheduler");
    json::setNumber(scheduler, "enabled_rules", snapshot.enabledSchedules);
    json::setNumber(scheduler, "triggered", snapshot.schedulesTriggered);
    json::setNumber(scheduler, "command_failures", snapshot.scheduleCommandFailures);
    json::setNumber(scheduler, "port_mask", AUTOMATION_PORT_MASK);
    cJSON* tasks = json::setArray(document, "tasks");
    for (size_t i = 0; tasks != nullptr && i < kTaskCount; ++i) {
        json::Ptr task = json::newObject();
        if (!task) break;
        json::setString(task.get(), "name", kTaskNames[i]);
        json::setNumber(task.get(), "stack_hwm_units", snapshot.taskStackHighWater[i]);
        cJSON_AddItemToArray(tasks, task.release());
    }

    const std::string payload = json::print(document);
    if (payload.empty()) DEVICE_LOG_WARNING("[SystemTask] Telemetry JSON serialization failed");
    return payload;
}
