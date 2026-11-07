#pragma once

// Supervision task (docs/SystemTask.md): starts SNTP once Wi-Fi is up, runs
// the automation modules (Automation.h) every SYSTEM_TASK_CHECK_INTERVAL_MS
// and keeps a telemetry snapshot that TaskNetwork publishes.

#include <Arduino.h>

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
    // SUPPORT_RTOS: free stack bytes never used, per task_watchdog::Slot.
    // NON-OS: taskStackHighWater[0] is the free CONT (loop) stack.
    uint32_t taskStackHighWater[4];
};

class SystemTask {
public:
    // Sets up the automation modules (schedules, on-timer, countdown,
    // threshold rules). Call from setup() before any task starts.
    static void setup();
    // SUPPORT_RTOS task body: service() in a loop.
    static void taskRun(void* parameter);
    // One step; runs a cycle when SYSTEM_TASK_CHECK_INTERVAL_MS has elapsed.
    // Called from loop() when SUPPORT_RTOS is 0.
    static void service();

    static void setNetworkState(bool wifiConnected, bool mqttConnected, bool transportAvailable);
    // Task handle for the telemetry (state, stack high-water mark). Called by
    // setup() for each task it creates (SUPPORT_RTOS).
    static void registerTask(task_watchdog::Slot slot, void* handle);
    // "system.status" JSON of the latest snapshot; empty when unavailable.
    static String telemetryJson();
};
