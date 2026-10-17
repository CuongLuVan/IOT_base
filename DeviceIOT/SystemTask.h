#ifndef SYSTEM_TASK_H
#define SYSTEM_TASK_H

#include <Arduino.h>
#include "HighSpeedSampler.h"

struct SystemTaskSnapshot {
    uint32_t uptimeMs;
    uint32_t scheduleMisses;
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
    uint32_t samplesCollected[3];
    uint32_t missedSamples[3];
    uint32_t droppedSamples[3];
    uint32_t packetsSent[3];
    uint32_t packetErrors[3];
    uint32_t bufferFullEvents;
    uint32_t schedulesTriggered;
    uint32_t scheduleCommandFailures;
    uint8_t enabledSchedules;
    bool cpuUsageSupported;
};

enum SystemSchedulePeriod : uint8_t {
    SYSTEM_SCHEDULE_WEEKLY = 1,
    SYSTEM_SCHEDULE_MONTHLY = 2,
    SYSTEM_SCHEDULE_YEARLY = 3
};

struct SystemControlSchedule {
    uint8_t enabled;
    uint8_t period;
    uint8_t weekday;  // Sunday = 0 through Saturday = 6; weekly only.
    uint8_t day;      // 1 through 31; monthly/yearly only.
    uint8_t month;    // 1 through 12; yearly only.
    uint8_t hour;     // 0 through 23.
    uint8_t minute;   // 0 through 59.
    uint8_t turnOn;   // 0 = off, 1 = on.
    uint32_t lastTriggeredMinute;
};

class SystemTask {
public:
    static void setup();
    static void taskRun(void* parameter);
    static void service();

    // Rules control only SYSTEM_TASK_SCHEDULE_PORT_MASK.  They run in the
    // configured timezone once the SNTP clock is valid.
    static bool configureSchedule(uint8_t slot, const SystemControlSchedule& rule);
    static bool clearSchedule(uint8_t slot);
    static String schedulerJson(const char* event);

    static void recordCollectedSamples(UdpPacketType type, uint32_t count);
    static void recordMissedSamples(UdpPacketType type, uint32_t count);
    static void recordBufferFull(UdpPacketType type, uint32_t droppedSamples);
    static void recordUdpSent(UdpPacketType type);
    static void recordUdpFailure(UdpPacketType type, uint32_t droppedSamples);
    static void setNetworkState(bool wifiConnected, bool mqttConnected,
                                bool udpAvailable);
    static String telemetryJson();
};

#endif
