#pragma once

#include <Arduino.h>
#include <IPAddress.h>

// High-speed capture and its IMU/ADS peripherals were removed from the ESP8266
// build. This small compatibility surface keeps older callers linkable while
// reporting the feature as unavailable.
enum HighSpeedMode : uint8_t {
    HS_MODE_OFF = 0,
    HS_MODE_ADC_10KHZ = 1,
    HS_MODE_ICM32K = 2,
    HS_MODE_ADS100K = 3,
    HS_MODE_ALL = 4
};

enum UdpPacketType : uint8_t {
    UDP_PACKET_ADC = 0x01,
    UDP_PACKET_IMU = 0x02,
    UDP_PACKET_ADS = 0x03
};

struct HighSpeedConfig {
    HighSpeedMode mode = HS_MODE_OFF;
    IPAddress udpTargetIP;
    uint16_t udpTargetPort = 0;
    uint32_t durationMs = 0;
};

struct HighSpeedUdpPacket {
    uint16_t length = 0;
    IPAddress targetIP;
    uint16_t targetPort = 0;
    uint8_t bytes[1] = {0};
};

class HighSpeedSampler {
public:
    static HighSpeedSampler& GetInstance();
    bool setup();
    bool startSampling(const HighSpeedConfig& config);
    void stopSampling();
    bool isSamplingActive() const;
    bool isModeAvailable(HighSpeedMode mode) const;
    bool processSensorTask();
    bool receivePacket(HighSpeedUdpPacket& packet);
    uint32_t packetQueueDepth() const;

private:
    HighSpeedSampler() = default;
};
