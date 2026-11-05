#include "SystemTask.h"

#include <ArduinoJson.h>
#include <string.h>
#include <time.h>

#include "Common.h"
#include "DebugInfo.h"
#include "PlatformCompat.h"
#include "ScheduleEngine.h"
#include "OnTimer.h"
#include "Countdown.h"
#include "define_All.h"

namespace {
constexpr time_t kMinimumValidEpoch = 1704067200;
SystemTaskSnapshot latestSnapshot = {};
volatile bool wifiConnected = false;
volatile bool mqttConnected = false;
uint32_t lastSnapshotMs = 0;
bool ntpConfigured = false;
uint32_t lastNtpRequestMs = 0;

#if SUPPORT_RTOS
SemaphoreHandle_t snapshotMutex = nullptr;

TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif

void synchronizeClockIfNeeded() {
    if (WiFi.status() != WL_CONNECTED) return;
    const uint32_t nowMs = millis();
    const bool validClock = time(nullptr) >= kMinimumValidEpoch;
    if (!ntpConfigured || (!validClock &&
        nowMs - lastNtpRequestMs >= SYSTEM_TASK_NTP_RETRY_INTERVAL_MS)) {
        configTime(SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS, 0,
                   "pool.ntp.org", "time.nist.gov");
        ntpConfigured = true;
        lastNtpRequestMs = nowMs;
    }
}

// Evaluates due schedules, then saves schedule / on-timer / countdown changes outside
// the MQTT callback.
void processSchedules() {
    ScheduleEngine::process(time(nullptr));
    ScheduleEngine::flush();
    OnTimer::flush();
    Countdown::flush();
}

void refreshSnapshot() {
    synchronizeClockIfNeeded();
    const time_t now = time(nullptr);
    SystemTaskSnapshot snapshot = {};
    snapshot.uptimeMs = millis();
    snapshot.freeHeapBytes = ESP.getFreeHeap();
    snapshot.clockValid = now >= kMinimumValidEpoch;
    snapshot.epochSeconds = snapshot.clockValid ? static_cast<uint64_t>(now) : 0;
    snapshot.wifiConnected = wifiConnected;
    snapshot.mqttConnected = mqttConnected;
    snapshot.schedulesTriggered = ScheduleEngine::triggeredCount();
    snapshot.scheduleCommandFailures = ScheduleEngine::commandFailureCount();
    snapshot.enabledSchedules = ScheduleEngine::activeCount();

#if SUPPORT_RTOS
    if (snapshotMutex != nullptr && xSemaphoreTake(snapshotMutex, delayTicks(10)) == pdTRUE) {
        latestSnapshot = snapshot;
        xSemaphoreGive(snapshotMutex);
    } else {
        latestSnapshot = snapshot;
    }
#else
    latestSnapshot = snapshot;
#endif
}
} // namespace

void SystemTask::setup() {
    latestSnapshot = {};
    lastSnapshotMs = 0;
    ntpConfigured = false;
    lastNtpRequestMs = 0;
#if SUPPORT_RTOS
    if (snapshotMutex == nullptr) snapshotMutex = xSemaphoreCreateMutex();
#endif
    ScheduleEngine::setup();
    OnTimer::setup();
    Countdown::setup();
}

void SystemTask::service() {
    const uint32_t now = millis();
    if (lastSnapshotMs == 0 || now - lastSnapshotMs >= SYSTEM_TASK_CHECK_INTERVAL_MS) {
        lastSnapshotMs = now;
        refreshSnapshot();
        processSchedules();
    }
}

void SystemTask::taskRun(void* parameter) {
    (void)parameter;
#if SUPPORT_RTOS
    for (;;) {
        service();
        vTaskDelay(delayTicks(100));
    }
#endif
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool) {
    wifiConnected = wifi;
    mqttConnected = mqtt;
}

String SystemTask::schedulerJson(const char* event) {
    StaticJsonDocument<256> document;
    document["event"] = event == nullptr ? "schedule.status" : event;
    document["port_mask"] = SCHEDULE_ALLOWED_PORT_MASK;
    document["max_rules"] = SCHEDULE_MAX_COUNT;
    document["enabled_rules"] = ScheduleEngine::activeCount();
    document["triggered"] = ScheduleEngine::triggeredCount();
    document["command_failures"] = ScheduleEngine::commandFailureCount();
    document["clock_valid"] = time(nullptr) >= kMinimumValidEpoch;
    String payload;
    return serializeJson(document, payload) == 0 || document.overflowed() ? String() : payload;
}

String SystemTask::telemetryJson() {
    SystemTaskSnapshot snapshot;
#if SUPPORT_RTOS
    if (snapshotMutex != nullptr && xSemaphoreTake(snapshotMutex, delayTicks(10)) == pdTRUE) {
        snapshot = latestSnapshot;
        xSemaphoreGive(snapshotMutex);
    } else {
        snapshot = latestSnapshot;
    }
#else
    snapshot = latestSnapshot;
#endif

    StaticJsonDocument<JSON_BUFFER_SIZE> document;
    document["event"] = "system.status";
    document["uptime_ms"] = snapshot.uptimeMs;
    document["heap_free_bytes"] = snapshot.freeHeapBytes;
    document["epoch_s"] = snapshot.epochSeconds;
    document["clock_valid"] = snapshot.clockValid;
    JsonObject network = document.createNestedObject("network");
    network["wifi"] = snapshot.wifiConnected;
    network["mqtt"] = snapshot.mqttConnected;
    JsonObject scheduler = document.createNestedObject("scheduler");
    scheduler["enabled_rules"] = snapshot.enabledSchedules;
    scheduler["triggered"] = snapshot.schedulesTriggered;
    scheduler["command_failures"] = snapshot.scheduleCommandFailures;
    scheduler["port_mask"] = SCHEDULE_ALLOWED_PORT_MASK;

    String payload;
    if (serializeJson(document, payload) == 0 || document.overflowed()) return String();
    return payload;
}
