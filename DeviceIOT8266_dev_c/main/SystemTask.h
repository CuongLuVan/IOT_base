#pragma once

// Supervision task: runs the automation modules (Automation.h) every
// SYSTEM_TASK_CHECK_INTERVAL_MS, checks the task heartbeats and keeps a
// telemetry snapshot that TaskNetwork publishes.

#include <stdint.h>
#include <string>

#include "TaskWatchdog.h"

struct SystemTaskSnapshot {
    uint32_t uptimeMs;
    uint32_t cycleOverruns;  // Monitoring cycles that started at least one interval late.
    uint32_t freeHeapBytes;
    uint64_t epochSeconds;
    bool clockValid;
    bool wifiConnected;
    bool mqttConnected;
    uint32_t schedulesTriggered;
    uint32_t scheduleCommandFailures;
    uint8_t enabledSchedules;
    // Free stack bytes never used, per task_watchdog::Slot.
    uint32_t taskStackHighWater[4];
};

class SystemTask {
public:
    // Sets up the automation modules (schedules, on-timer, countdown,
    // threshold rules). Call from app_main() before any task starts.
    static void setup();
    // FreeRTOS task body: service() in a loop.
    static void taskRun(void* parameter);
    // One step; runs a cycle when SYSTEM_TASK_CHECK_INTERVAL_MS has elapsed.
    static void service();

    static void setNetworkState(bool wifiConnected, bool mqttConnected, bool transportAvailable);
    // Task handle for the telemetry (stack high-water mark). Called by
    // app_main() for each task it creates.
    static void registerTask(task_watchdog::Slot slot, void* handle);
    // "system.status" JSON of the latest snapshot; empty when unavailable.
    static std::string telemetryJson();
};
