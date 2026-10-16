#ifndef SYSTEM_TASK_H
#define SYSTEM_TASK_H

#include <Arduino.h>
#include "define_All.h"
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
    bool cpuUsageSupported;
};

class SystemTask {
public:
    static void setup();
    static void taskRun(void* parameter);

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
