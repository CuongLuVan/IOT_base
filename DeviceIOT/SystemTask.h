#pragma once

// Supervision task (docs/SystemTask.md): runs the automation modules
// (Automation.h) every SYSTEM_TASK_CHECK_INTERVAL_MS, saves their settings,
// checks the task heartbeats (TaskWatchdog.h) and keeps a telemetry snapshot
// that TaskNetwork publishes. SNTP is started by TaskNetwork.

#include <Arduino.h>

#include "CaptureTypes.h"
#include "TaskWatchdog.h"

struct SystemTaskSnapshot {
    uint32_t uptimeMs;
    uint32_t cycleOverruns;  // Monitoring cycles that started at least one interval late.
    uint32_t freeHeapBytes;
    uint32_t minFreeHeapBytes;
    uint64_t epochSeconds;
    uint32_t udpQueueDepth;
    bool clockValid;
    bool wifiConnected;
    bool mqttConnected;
    bool udpAvailable;
    uint8_t taskStates[4];
    uint32_t taskStackHighWater[4];
    uint32_t samplesCollected[kCaptureTypeCount];
    uint32_t missedSamples[kCaptureTypeCount];
    uint32_t droppedSamples[kCaptureTypeCount];
    uint32_t packetsSent[kCaptureTypeCount];
    uint32_t packetErrors[kCaptureTypeCount];
    uint32_t bufferFullEvents;
    uint32_t schedulesTriggered;
    uint32_t scheduleCommandFailures;
    uint8_t enabledSchedules;
    bool cpuUsageSupported;
};

class SystemTask {
public:
    // Sets up the automation modules (schedules, on-timer, countdown,
    // threshold rules). Call from setup() before any task starts.
    static void setup();
    // SUPPORT_RTOS task body: service() in a loop.
    static void taskRun(void* parameter);
    // One step; runs a cycle when SYSTEM_TASK_CHECK_INTERVAL_MS has elapsed.
    static void service();

    // High-speed capture counters (HighSpeedSampler, TaskNetwork).
    static void recordCollectedSamples(UdpPacketType type, uint32_t count);
    static void recordMissedSamples(UdpPacketType type, uint32_t count);
    static void recordBufferFull(UdpPacketType type, uint32_t droppedSamples);
    static void recordUdpSent(UdpPacketType type);
    static void recordUdpFailure(UdpPacketType type, uint32_t droppedSamples);
    static void setNetworkState(bool wifiConnected, bool mqttConnected, bool udpAvailable);
    // Task handle for the telemetry (state, stack high-water mark). Called by
    // setup() for each task it creates (SUPPORT_RTOS).
    static void registerTask(task_watchdog::Slot slot, void* handle);
    // "system.status" JSON of the latest snapshot; empty when unavailable.
    static String telemetryJson();
};
