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

class SystemTask {
public:
    static void setup();
    static void taskRun(void* parameter);
    static void service();
    // Schedules live in ScheduleEngine (EEPROM); SystemTask evaluates them
    // every cycle once the SNTP clock is valid.
    static String schedulerJson(const char* event);
    static void setNetworkState(bool wifiConnected, bool mqttConnected,
                                bool transportAvailable);
    static String telemetryJson();
};
