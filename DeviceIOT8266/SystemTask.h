#pragma once

#include <Arduino.h>

struct SystemTaskSnapshot {
    uint32_t uptimeMs;
    uint32_t freeHeapBytes;
    uint64_t epochSeconds;
    bool clockValid;
    bool wifiConnected;
    bool mqttConnected;
};

class SystemTask {
public:
    static void setup();
    static void taskRun(void* parameter);
    static void service();
    static void setNetworkState(bool wifiConnected, bool mqttConnected,
                                bool transportAvailable);
    static String telemetryJson();
};