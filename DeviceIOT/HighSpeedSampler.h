#pragma once

// High-speed capture (docs/HighSpeedAcquisition.md): TaskSensor samples the
// ADC / ICM-42688 / ADS8866 and queues UDP datagrams (CaptureTypes.h) that
// TaskNetwork sends.

#include <Arduino.h>
#include <IPAddress.h>
#include <atomic>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>

#include "CaptureTypes.h"

// Largest payload: 16 IMU samples x 14 bytes (HighSpeedSampler.cpp checks
// every channel against it).
constexpr size_t HIGH_SPEED_UDP_MAX_PAYLOAD_SIZE = 224;
constexpr size_t HIGH_SPEED_UDP_MAX_DATAGRAM_SIZE = capture_udp::kHeaderSize + HIGH_SPEED_UDP_MAX_PAYLOAD_SIZE;

enum HighSpeedMode : uint8_t {
    HS_MODE_OFF = 0,
    HS_MODE_ADC_10KHZ = 1,
    HS_MODE_ICM32K = 2,
    HS_MODE_ADS100K = 3,
    HS_MODE_ALL = 4,
};

struct HighSpeedConfig {
    HighSpeedMode mode;
    IPAddress udpTargetIP;
    uint16_t udpTargetPort;
    uint32_t durationMs;
};

// Filled by receivePacket(); the queues inside the sampler carry plain copies.
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
    // true while a capture runs.
    bool processSensorTask();
    // Called only by TaskNetwork.
    bool receivePacket(HighSpeedUdpPacket& packet);
    UBaseType_t packetQueueDepth() const;

private:
    HighSpeedSampler() = default;
    HighSpeedSampler(const HighSpeedSampler&) = delete;
    HighSpeedSampler& operator=(const HighSpeedSampler&) = delete;

    void initializeSensors();

    QueueHandle_t controlQueue = nullptr;
    QueueHandle_t packetQueue = nullptr;
    std::atomic<bool> samplingActive{false};
    std::atomic<bool> stopRequested{false};
    bool initialized = false;
    bool icmAvailable = false;
};
