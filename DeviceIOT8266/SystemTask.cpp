#include "SystemTask.h"

#include <ArduinoJson.h>
#include <string.h>
#include <time.h>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MemoryData.h"
#include "PlatformCompat.h"
#include "define_All.h"

#if SUPPORT_RTOS
extern QueueHandle_t deviceCommandQueue;
#endif

namespace {
constexpr time_t kMinimumValidEpoch = 1704067200;
constexpr uint32_t kScheduleStorageMagic = 0x53434831UL; // SCH1

struct StoredSchedules {
    uint32_t magic;
    uint32_t checksum;
    SystemControlSchedule rules[SYSTEM_TASK_SCHEDULE_MAX_RULES];
};

SystemTaskSnapshot latestSnapshot = {};
SystemControlSchedule schedules[SYSTEM_TASK_SCHEDULE_MAX_RULES] = {};
volatile bool wifiConnected = false;
volatile bool mqttConnected = false;
uint32_t lastSnapshotMs = 0;
bool ntpConfigured = false;
uint32_t lastNtpRequestMs = 0;
uint32_t schedulesTriggered = 0;
uint32_t scheduleCommandFailures = 0;

#if SUPPORT_RTOS
SemaphoreHandle_t snapshotMutex = nullptr;
SemaphoreHandle_t scheduleMutex = nullptr;

TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif

uint32_t scheduleChecksum(const SystemControlSchedule* rules) {
    const uint8_t* data = reinterpret_cast<const uint8_t*>(rules);
    uint32_t hash = 2166136261UL;
    for (size_t index = 0; index <
         sizeof(SystemControlSchedule) * SYSTEM_TASK_SCHEDULE_MAX_RULES; ++index) {
        hash ^= data[index];
        hash *= 16777619UL;
    }
    return hash;
}

bool lockSchedules() {
#if SUPPORT_RTOS
    return scheduleMutex == nullptr ||
           xSemaphoreTake(scheduleMutex, delayTicks(10)) == pdTRUE;
#else
    return true;
#endif
}

void unlockSchedules() {
#if SUPPORT_RTOS
    if (scheduleMutex != nullptr) xSemaphoreGive(scheduleMutex);
#endif
}

bool isValidSchedule(const SystemControlSchedule& rule) {
    if (rule.enabled > 1 || rule.turnOn > 1 || rule.hour > 23 || rule.minute > 59) {
        return false;
    }
    if (rule.enabled == 0) return true;
    if (rule.period == SYSTEM_SCHEDULE_WEEKLY) return rule.weekday <= 6;
    if (rule.period == SYSTEM_SCHEDULE_MONTHLY) return rule.day >= 1 && rule.day <= 31;
    return rule.period == SYSTEM_SCHEDULE_YEARLY && rule.month >= 1 &&
           rule.month <= 12 && rule.day >= 1 && rule.day <= 31;
}

void normalizeSchedule(SystemControlSchedule& rule) {
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

uint8_t enabledScheduleCount() {
    if (!lockSchedules()) return 0;
    uint8_t count = 0;
    for (const SystemControlSchedule& rule : schedules) count += rule.enabled != 0 ? 1 : 0;
    unlockSchedules();
    return count;
}

void persistSchedules() {
    if (!lockSchedules()) {
        DEVICE_LOG_WARNING("[SystemTask] Schedule storage is busy");
        return;
    }
    StoredSchedules stored = {};
    stored.magic = kScheduleStorageMagic;
    memcpy(stored.rules, schedules, sizeof(stored.rules));
    unlockSchedules();

    // A reboot may execute the rule once again in its matching minute; ON/OFF
    // is idempotent and this avoids persisting volatile runtime state.
    for (SystemControlSchedule& rule : stored.rules) rule.lastTriggeredMinute = 0;
    stored.checksum = scheduleChecksum(stored.rules);
    if (!Memory::GetInstance()->writeBytes(SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS,
            reinterpret_cast<const uint8_t*>(&stored), sizeof(stored))) {
        DEVICE_LOG_ERROR("[SystemTask] Cannot save schedules");
    }
}

void loadSchedules() {
    StoredSchedules stored = {};
    const bool validStorage = Memory::GetInstance()->readBytes(
        SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS,
        reinterpret_cast<uint8_t*>(&stored), sizeof(stored)) &&
        stored.magic == kScheduleStorageMagic &&
        stored.checksum == scheduleChecksum(stored.rules);

    if (!lockSchedules()) return;
    memset(schedules, 0, sizeof(schedules));
    if (validStorage) {
        for (size_t index = 0; index < SYSTEM_TASK_SCHEDULE_MAX_RULES; ++index) {
            SystemControlSchedule rule = stored.rules[index];
            rule.lastTriggeredMinute = 0;
            if (isValidSchedule(rule)) {
                normalizeSchedule(rule);
                schedules[index] = rule;
            }
        }
    }
    unlockSchedules();
}

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

bool ruleMatches(const SystemControlSchedule& rule, const tm& localTime) {
    if (rule.enabled == 0 || rule.hour != localTime.tm_hour ||
        rule.minute != localTime.tm_min) return false;
    if (rule.period == SYSTEM_SCHEDULE_WEEKLY) return rule.weekday == localTime.tm_wday;
    if (rule.period == SYSTEM_SCHEDULE_MONTHLY) return rule.day == localTime.tm_mday;
    return rule.period == SYSTEM_SCHEDULE_YEARLY &&
           rule.month == static_cast<uint8_t>(localTime.tm_mon + 1) &&
           rule.day == localTime.tm_mday;
}

bool queueScheduleCommand(bool turnOn) {
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

void processSchedules() {
    const time_t epoch = time(nullptr);
    if (epoch < kMinimumValidEpoch) return;
    tm localTime = {};
    localtime_r(&epoch, &localTime);
    const uint32_t epochMinute = static_cast<uint32_t>(epoch / 60);
    bool hasCommand = false;
    bool commandTurnOn = false;

    if (!lockSchedules()) return;
    for (SystemControlSchedule& rule : schedules) {
        if (ruleMatches(rule, localTime) && rule.lastTriggeredMinute != epochMinute) {
            rule.lastTriggeredMinute = epochMinute;
            // Higher IDs override lower IDs if rules collide in one minute.
            commandTurnOn = rule.turnOn != 0;
            hasCommand = true;
        }
    }
    unlockSchedules();

    if (hasCommand) {
        if (queueScheduleCommand(commandTurnOn)) ++schedulesTriggered;
        else {
            ++scheduleCommandFailures;
            DEVICE_LOG_WARNING("[SystemTask] Schedule command queue unavailable");
        }
    }
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
    snapshot.schedulesTriggered = schedulesTriggered;
    snapshot.scheduleCommandFailures = scheduleCommandFailures;
    snapshot.enabledSchedules = enabledScheduleCount();

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
    if (scheduleMutex == nullptr) scheduleMutex = xSemaphoreCreateMutex();
#endif
    loadSchedules();
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

bool SystemTask::configureSchedule(uint8_t slot, const SystemControlSchedule& input) {
    if (slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES || !isValidSchedule(input) || !lockSchedules()) {
        return false;
    }
    SystemControlSchedule rule = input;
    rule.lastTriggeredMinute = 0;
    normalizeSchedule(rule);
    schedules[slot] = rule;
    unlockSchedules();
    persistSchedules();
    return true;
}

bool SystemTask::clearSchedule(uint8_t slot) {
    if (slot >= SYSTEM_TASK_SCHEDULE_MAX_RULES || !lockSchedules()) return false;
    schedules[slot] = {};
    unlockSchedules();
    persistSchedules();
    return true;
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool) {
    wifiConnected = wifi;
    mqttConnected = mqtt;
}

String SystemTask::schedulerJson(const char* event) {
    StaticJsonDocument<256> document;
    document["event"] = event == nullptr ? "schedule.status" : event;
    document["port_mask"] = SYSTEM_TASK_SCHEDULE_PORT_MASK;
    document["enabled_rules"] = enabledScheduleCount();
    document["triggered"] = schedulesTriggered;
    document["command_failures"] = scheduleCommandFailures;
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
    scheduler["port_mask"] = SYSTEM_TASK_SCHEDULE_PORT_MASK;

    String payload;
    if (serializeJson(document, payload) == 0 || document.overflowed()) return String();
    return payload;
}
