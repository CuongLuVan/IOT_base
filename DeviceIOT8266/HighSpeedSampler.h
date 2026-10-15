#ifndef HIGHSPEEDSAMPLER_H
#define HIGHSPEEDSAMPLER_H

#include <Arduino.h>
#include <atomic>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

constexpr size_t HIGH_SPEED_UDP_MAX_DATAGRAM_SIZE = 28 + 1150;

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
    HighSpeedMode mode;
    IPAddress udpTargetIP;
    uint16_t udpTargetPort;
    uint32_t durationMs;
};

struct HighSpeedUdpPacket {
    uint16_t length;
    IPAddress targetIP;
    uint16_t targetPort;
    uint8_t bytes[HIGH_SPEED_UDP_MAX_DATAGRAM_SIZE];
};

class HighSpeedSampler {
public:
    static HighSpeedSampler& GetInstance();

    bool setup();
    bool startSampling(const HighSpeedConfig& config);
    void stopSampling();
    bool isSamplingActive() const;
    bool isModeAvailable(HighSpeedMode mode) const;

    // Called only by TaskSensor; performs no networking or blocking queue sends.
    bool processSensorTask();
    // Called only by TaskNetWork.
    bool receivePacket(HighSpeedUdpPacket& packet);
    UBaseType_t packetQueueDepth() const;

private:
    HighSpeedSampler();
    HighSpeedSampler(const HighSpeedSampler&) = delete;
    HighSpeedSampler& operator=(const HighSpeedSampler&) = delete;

    void initializeSensors();

    QueueHandle_t controlQueue;
    QueueHandle_t packetQueue;
    std::atomic<bool> samplingActive;
    std::atomic<bool> stopRequested;
    bool initialized;
    bool icmAvailable;
};

#endif
