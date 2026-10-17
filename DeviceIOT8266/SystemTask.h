#pragma once

#include <Arduino.h>

struct SystemTaskSnapshot {
    uint32_t uptimeMs;
    uint32_t freeHeapBytes;
    uint64_t epochSeconds;
    bool clockValid;
    bool wifiConnected;
    bool mqttConnected;
    uint32_t schedulesTriggered;
    uint32_t scheduleCommandFailures;
    uint8_t enabledSchedules;
};

enum SystemSchedulePeriod : uint8_t {
    SYSTEM_SCHEDULE_WEEKLY = 1,
    SYSTEM_SCHEDULE_MONTHLY = 2,
    SYSTEM_SCHEDULE_YEARLY = 3
};

struct SystemControlSchedule {
    uint8_t enabled;
    uint8_t period;
    uint8_t weekday;
    uint8_t day;
    uint8_t month;
    uint8_t hour;
    uint8_t minute;
    uint8_t turnOn;
    uint32_t lastTriggeredMinute;
};

class SystemTask {
public:
    static void setup();
    static void taskRun(void* parameter);
    static void service();
    static bool configureSchedule(uint8_t slot, const SystemControlSchedule& rule);
    static bool clearSchedule(uint8_t slot);
    static String schedulerJson(const char* event);
    static void setNetworkState(bool wifiConnected, bool mqttConnected,
                                bool transportAvailable);
    static String telemetryJson();
};
