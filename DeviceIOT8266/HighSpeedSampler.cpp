#include "HighSpeedSampler.h"

#include <SPI.h>
#include "define_All.h"
#include "DebugInfo.h"
#include "SystemTask.h"

// =====================================================================
// ESP32-specific includes
// =====================================================================
#if PLATFORM_ESP32
#include <esp_timer.h>
#endif

namespace {

constexpr uint32_t kAdcRateHz = HS_AUDIO_ADC_SAMPLE_RATE_HZ;
constexpr uint32_t kImuRateHz = HS_ICM42688_SAMPLE_RATE_HZ;
constexpr uint32_t kAdsRateHz = HS_ADS8866_SAMPLE_RATE_HZ;
constexpr size_t kUdpHeaderSize = 28;
constexpr size_t kUdpPayloadMax = 1150;
#if SUPPORT_RTOS
constexpr UBaseType_t kPacketQueueDepth = 24;
#endif
constexpr uint16_t kAdcBatchSize = 64;
constexpr uint16_t kImuBatchSize = 16;
constexpr uint16_t kAdsBatchSize = 64;

constexpr uint8_t kIcmWhoAmIRegister = 0x75;
constexpr uint8_t kIcmDeviceConfigRegister = 0x11;
constexpr uint8_t kIcmPowerManagementRegister = 0x4E;
constexpr uint8_t kIcmGyroConfig0Register = 0x4F;
constexpr uint8_t kIcmAccelConfig0Register = 0x50;
constexpr uint8_t kIcmTemperatureData1Register = 0x1D;
constexpr uint8_t kIcmExpectedWhoAmI = 0x47;

enum class CaptureCommandType : uint8_t {
    Start
};

struct CaptureCommand {
    CaptureCommandType type;
    HighSpeedConfig config;
};

// Platform-agnostic microsecond timer
inline uint64_t platformMicros() {
#if PLATFORM_ESP32
    return esp_timer_get_time();
#else
    return micros();
#endif
}

// Platform-agnostic chip ID for session hashing
inline uint32_t platformChipId() {
#if PLATFORM_ESP32
    return static_cast<uint32_t>(ESP.getEfuseMac());
#else
    return ESP.getChipId();
#endif
}

class PacketBuilder {
public:
    explicit PacketBuilder(UdpPacketType type)
        : type_(type), count_(0), payloadLength_(0), sequence_(0),
          dropped_(0), firstSampleUs_(0), sessionId_(0), targetPort_(0) {}

    void beginSession(uint32_t sessionId, const HighSpeedConfig& config) {
        sessionId_ = sessionId;
        targetIP_ = config.udpTargetIP;
        targetPort_ = config.udpTargetPort;
    }

    void append(const uint8_t* data, size_t size, uint64_t timestampUs) {
        if (count_ == 0) {
            firstSampleUs_ = timestampUs;
        }
        if (payloadLength_ + size > sizeof(payload_)) {
            return;
        }
        memcpy(payload_ + payloadLength_, data, size);
        payloadLength_ += size;
        ++count_;
    }

    bool full(uint16_t batchSize) const {
        return count_ >= batchSize;
    }

    void addDropped(uint32_t count) {
        dropped_ += count;
    }

#if SUPPORT_RTOS
    void flush(QueueHandle_t queue) {
        if (count_ == 0) {
            return;
        }

        const uint16_t flushedSampleCount = count_;
        HighSpeedUdpPacket packet = {};
        packet.targetIP = targetIP_;
        packet.targetPort = targetPort_;
        packet.bytes[0] = 'H';
        packet.bytes[1] = 'S';
        packet.bytes[2] = 1;
        packet.bytes[3] = static_cast<uint8_t>(type_);
        writeU32(packet.bytes + 4, sessionId_);
        writeU32(packet.bytes + 8, sequence_++);
        writeU64(packet.bytes + 12, firstSampleUs_);
        writeU16(packet.bytes + 20, count_);
        writeU16(packet.bytes + 22, payloadLength_);
        writeU32(packet.bytes + 24, dropped_);
        memcpy(packet.bytes + kUdpHeaderSize, payload_, payloadLength_);
        packet.length = static_cast<uint16_t>(kUdpHeaderSize + payloadLength_);

        SystemTask::recordCollectedSamples(type_, flushedSampleCount);
        if (xQueueSend(queue, &packet, 0) != pdTRUE) {
            SystemTask::recordBufferFull(type_, flushedSampleCount);
            dropped_ += count_;
        } else {
            dropped_ = 0;
        }
        count_ = 0;
        payloadLength_ = 0;
    }
#else
    void flush(void* /*unused*/) {
        // In non-RTOS mode, high-speed sampling is effectively disabled.
        count_ = 0;
        payloadLength_ = 0;
    }
#endif

private:
    static void writeU16(uint8_t* out, uint16_t value) {
        out[0] = static_cast<uint8_t>(value >> 8);
        out[1] = static_cast<uint8_t>(value);
    }

    static void writeU32(uint8_t* out, uint32_t value) {
        out[0] = static_cast<uint8_t>(value >> 24);
        out[1] = static_cast<uint8_t>(value >> 16);
        out[2] = static_cast<uint8_t>(value >> 8);
        out[3] = static_cast<uint8_t>(value);
    }

    static void writeU64(uint8_t* out, uint64_t value) {
        for (int i = 7; i >= 0; --i) {
            out[i] = static_cast<uint8_t>(value);
            value >>= 8;
        }
    }

    UdpPacketType type_;
    uint16_t count_;
    uint16_t payloadLength_;
    uint32_t sequence_;
    uint32_t dropped_;
    uint64_t firstSampleUs_;
    uint32_t sessionId_;
    IPAddress targetIP_;
    uint16_t targetPort_;
    uint8_t payload_[kUdpPayloadMax];
};

struct CaptureState {
    CaptureState()
        : adc(UDP_PACKET_ADC), imu(UDP_PACKET_IMU), ads(UDP_PACKET_ADS),
          active(false), sessionId(0), startedAtUs(0), stopAtUs(0),
          nextAdcUs(0), nextImuUs(0), nextAdsUs(0),
          adcRemainder(0), imuRemainder(0), adsRemainder(0),
          missedAdc(0), missedImu(0), missedAds(0) {}

    PacketBuilder adc;
    PacketBuilder imu;
    PacketBuilder ads;
    HighSpeedConfig config;
    bool active;
    uint32_t sessionId;
    uint64_t startedAtUs;
    uint64_t stopAtUs;
    uint64_t nextAdcUs;
    uint64_t nextImuUs;
    uint64_t nextAdsUs;
    uint32_t adcRemainder;
    uint32_t imuRemainder;
    uint32_t adsRemainder;
    uint32_t missedAdc;
    uint32_t missedImu;
    uint32_t missedAds;
};

// =====================================================================
// SPI bus instances – ESP32 has HSPI/VSPI, ESP8266 has single SPI
// =====================================================================
#if PLATFORM_ESP32
SPIClass icmSPI(HSPI);
SPIClass adsSPI(VSPI);
#else
// ESP8266 has only one hardware SPI bus. High-speed multi-sensor
// capture is not practical. We keep the code compilable but
// effectively disabled via isModeAvailable().
#endif

CaptureState captureState;

int16_t readSigned16(const uint8_t* data) {
    return static_cast<int16_t>((static_cast<uint16_t>(data[0]) << 8) | data[1]);
}

void appendBigEndian16(uint8_t* data, int16_t value) {
    const uint16_t bits = static_cast<uint16_t>(value);
    data[0] = static_cast<uint8_t>(bits >> 8);
    data[1] = static_cast<uint8_t>(bits);
}

#if PLATFORM_ESP32
// ICM-42688 SPI helpers – ESP32 only
void icmReadRegister_impl(uint8_t address, uint8_t* value) {
    digitalWrite(HS_ICM_CS_PIN, LOW);
    icmSPI.beginTransaction(SPISettings(HS_ICM_SPI_HZ, MSBFIRST, SPI_MODE0));
    icmSPI.transfer(address | 0x80);
    *value = icmSPI.transfer(0);
    icmSPI.endTransaction();
    digitalWrite(HS_ICM_CS_PIN, HIGH);
}

uint8_t icmReadRegister(uint8_t address) {
    uint8_t val;
    icmReadRegister_impl(address, &val);
    return val;
}

void icmWriteRegister(uint8_t address, uint8_t value) {
    digitalWrite(HS_ICM_CS_PIN, LOW);
    icmSPI.beginTransaction(SPISettings(HS_ICM_SPI_HZ, MSBFIRST, SPI_MODE0));
    icmSPI.transfer(address & 0x7F);
    icmSPI.transfer(value);
    icmSPI.endTransaction();
    digitalWrite(HS_ICM_CS_PIN, HIGH);
}
#endif

uint8_t icmOdrRegisterValue(uint32_t rateHz) {
    switch (rateHz) {
        case 32000: return 0x01;
        case 16000: return 0x02;
        case 8000: return 0x03;
        case 4000: return 0x04;
        case 2000: return 0x05;
        case 1000: return 0x06;
        case 200: return 0x07;
        case 100: return 0x08;
        case 50: return 0x09;
        case 25: return 0x0A;
        case 12500: return 0x0B;
        case 6250: return 0x0C;
        case 3125: return 0x0D;
        case 500: return 0x0F;
        default: return 0;
    }
}

#if PLATFORM_ESP32
void icmReadBurst(uint8_t address, uint8_t* destination, size_t length) {
    digitalWrite(HS_ICM_CS_PIN, LOW);
    icmSPI.beginTransaction(SPISettings(HS_ICM_SPI_HZ, MSBFIRST, SPI_MODE0));
    icmSPI.transfer(address | 0x80);
    for (size_t i = 0; i < length; ++i) {
        destination[i] = icmSPI.transfer(0);
    }
    icmSPI.endTransaction();
    digitalWrite(HS_ICM_CS_PIN, HIGH);
}

void adsConvertAndRead(uint16_t& sample) {
    digitalWrite(HS_ADS_CNV_PIN, HIGH);
    delayMicroseconds(9);
    digitalWrite(HS_ADS_CNV_PIN, LOW);
    adsSPI.beginTransaction(SPISettings(HS_ADS_SPI_HZ, MSBFIRST, SPI_MODE0));
    sample = adsSPI.transfer16(0);
    adsSPI.endTransaction();
}
#endif

void advanceOneSample(uint64_t& nextUs, uint32_t rateHz, uint32_t& remainder) {
    nextUs += 1000000UL / rateHz;
    remainder += 1000000UL % rateHz;
    if (remainder >= rateHz) {
        ++nextUs;
        remainder -= rateHz;
    }
}

uint32_t skipMissedDeadlines(uint64_t nowUs, uint64_t& nextUs, uint32_t rateHz,
                             uint32_t& remainder, uint32_t& missed) {
    advanceOneSample(nextUs, rateHz, remainder);
    uint32_t skipped = 0;
    const uint32_t shortestPeriod = 1000000UL / rateHz;
    while (nowUs >= nextUs + shortestPeriod) {
        advanceOneSample(nextUs, rateHz, remainder);
        ++skipped;
    }
    missed += skipped;
    return skipped;
}

bool modeReadsAdc(HighSpeedMode mode) {
    return mode == HS_MODE_ADC_10KHZ || mode == HS_MODE_ALL;
}

bool modeReadsImu(HighSpeedMode mode) {
    return mode == HS_MODE_ICM32K || mode == HS_MODE_ALL;
}

bool modeReadsAds(HighSpeedMode mode) {
    return mode == HS_MODE_ADS100K || mode == HS_MODE_ALL;
}

#if PLATFORM_ESP32
void encodeAndAppendImu(uint64_t timestampUs) {
    uint8_t raw[14];
    uint8_t encoded[14];
    icmReadBurst(kIcmTemperatureData1Register, raw, sizeof(raw));
    for (size_t i = 0; i < 7; ++i) {
        appendBigEndian16(encoded + i * 2, readSigned16(raw + i * 2));
    }
    captureState.imu.append(encoded, sizeof(encoded), timestampUs);
}
#endif

}  // namespace

HighSpeedSampler::HighSpeedSampler()
    :
#if SUPPORT_RTOS
      controlQueue(nullptr),
      packetQueue(nullptr),
#endif
      samplingActive(false),
      stopRequested(false),
      initialized(false),
      icmAvailable(false) {}

HighSpeedSampler& HighSpeedSampler::GetInstance() {
    static HighSpeedSampler instance;
    return instance;
}

bool HighSpeedSampler::setup() {
    if (initialized) {
        return true;
    }

#if SUPPORT_RTOS
    controlQueue = xQueueCreate(1, sizeof(CaptureCommand));
    packetQueue = xQueueCreate(kPacketQueueDepth, sizeof(HighSpeedUdpPacket));
    if (controlQueue == nullptr || packetQueue == nullptr) {
        DEVICE_LOG_INFO("[HighSpeed] Failed to create sensor/network queues");
        if (controlQueue != nullptr) {
            vQueueDelete(controlQueue);
            controlQueue = nullptr;
        }
        if (packetQueue != nullptr) {
            vQueueDelete(packetQueue);
            packetQueue = nullptr;
        }
        return false;
    }
#endif

#if PLATFORM_ESP32
    initializeSensors();
#else
    // On ESP8266, high-speed sensors (ICM-42688, ADS8866) are not supported.
    DEVICE_LOG_INFO("[HighSpeed] ESP8266: high-speed sensor capture disabled");
#endif
    initialized = true;
    return true;
}

void HighSpeedSampler::initializeSensors() {
#if PLATFORM_ESP32
    static_assert(HS_AUDIO_ADC_SAMPLE_RATE_HZ > 0,
                  "HS_AUDIO_ADC_SAMPLE_RATE_HZ must be greater than zero");
    static_assert(HS_AUDIO_ADC_SAMPLE_RATE_HZ <= 1000000UL,
                  "HS_AUDIO_ADC_SAMPLE_RATE_HZ must not exceed 1000000");
    static_assert(HS_ICM42688_SAMPLE_RATE_HZ > 0,
                  "HS_ICM42688_SAMPLE_RATE_HZ must be greater than zero");
    static_assert(HS_ADS8866_SAMPLE_RATE_HZ > 0 &&
                      HS_ADS8866_SAMPLE_RATE_HZ <= 100000,
                  "HS_ADS8866_SAMPLE_RATE_HZ must be between 1 and 100000");

    pinMode(HS_ADC_PIN, INPUT);
    analogReadResolution(12);
    pinMode(HS_ICM_CS_PIN, OUTPUT);
    digitalWrite(HS_ICM_CS_PIN, HIGH);
    pinMode(HS_ADS_CNV_PIN, OUTPUT);
    digitalWrite(HS_ADS_CNV_PIN, LOW);

    icmSPI.begin(HS_ICM_SCK_PIN, HS_ICM_MISO_PIN, HS_ICM_MOSI_PIN, HS_ICM_CS_PIN);
    adsSPI.begin(HS_ADS_SCK_PIN, HS_ADS_MISO_PIN, -1, -1);

    icmWriteRegister(kIcmDeviceConfigRegister, 0x01);
    delay(2);
    if (icmReadRegister(kIcmWhoAmIRegister) != kIcmExpectedWhoAmI) {
        DEVICE_LOG_INFO("[HighSpeed] ICM-42688-P WHO_AM_I mismatch; IMU modes unavailable");
        return;
    }

    const uint8_t odr = icmOdrRegisterValue(HS_ICM42688_SAMPLE_RATE_HZ);
    if (odr == 0) {
        DEVICE_LOG_INFO("[HighSpeed] Unsupported ICM-42688-P sample rate; IMU modes unavailable");
        return;
    }

    icmAvailable = true;
    icmWriteRegister(kIcmPowerManagementRegister, 0x0F);
    icmWriteRegister(kIcmGyroConfig0Register,
                     (icmReadRegister(kIcmGyroConfig0Register) & 0xF0) | odr);
    icmWriteRegister(kIcmAccelConfig0Register,
                     (icmReadRegister(kIcmAccelConfig0Register) & 0xF0) | odr);
    delay(2);
#endif
}

bool HighSpeedSampler::startSampling(const HighSpeedConfig& config) {
#if !SUPPORT_RTOS
    // High-speed sampling requires RTOS task scheduling
    return false;
#else
    if (!initialized || controlQueue == nullptr || packetQueue == nullptr ||
        config.mode < HS_MODE_ADC_10KHZ || config.mode > HS_MODE_ALL ||
        config.udpTargetPort == 0 || config.durationMs == 0 ||
        config.durationMs > HS_CAPTURE_MAX_DURATION_MS ||
        !isModeAvailable(config.mode)) {
        return false;
    }

#if PLATFORM_ESP32
    bool expectedInactive = false;
    if (!samplingActive.compare_exchange_strong(expectedInactive, true)) {
        return false;
    }
#else
    noInterrupts();
    if (samplingActive) {
        interrupts();
        return false;
    }
    samplingActive = true;
    interrupts();
#endif

    CaptureCommand command = {CaptureCommandType::Start, config};
    stopRequested = false;
    if (xQueueSend(controlQueue, &command, 0) != pdTRUE) {
        samplingActive = false;
        return false;
    }
    return true;
#endif
}

void HighSpeedSampler::stopSampling() {
#if PLATFORM_ESP32
    if (samplingActive.load()) {
        stopRequested.store(true);
    }
#else
    if (samplingActive) {
        stopRequested = true;
    }
#endif
}

bool HighSpeedSampler::isSamplingActive() const {
#if PLATFORM_ESP32
    return samplingActive.load();
#else
    return samplingActive;
#endif
}

bool HighSpeedSampler::isModeAvailable(HighSpeedMode mode) const {
    if (!initialized) {
        return false;
    }
#if PLATFORM_ESP8266
    // ESP8266 cannot do high-speed multi-sensor capture
    (void)mode;
    return false;
#else
    return !modeReadsImu(mode) || icmAvailable;
#endif
}

bool HighSpeedSampler::processSensorTask() {
    if (!initialized) {
        return false;
    }

#if !SUPPORT_RTOS
    // Non-RTOS: no high-speed capture
    return false;
#else

#if PLATFORM_ESP8266
    // ESP8266: high-speed capture not supported, just drain control queue
    CaptureCommand dummyCmd;
    if (controlQueue != nullptr) {
        xQueueReceive(controlQueue, &dummyCmd, 0);
    }
    return false;
#endif

#if PLATFORM_ESP32
    if (!captureState.active) {
        CaptureCommand command;
        if (xQueueReceive(controlQueue, &command, 0) == pdTRUE &&
            command.type == CaptureCommandType::Start) {
            captureState.config = command.config;
            captureState.sessionId = static_cast<uint32_t>(platformMicros()) ^
                platformChipId();
            captureState.startedAtUs = platformMicros();
            captureState.stopAtUs = captureState.startedAtUs +
                static_cast<uint64_t>(command.config.durationMs) * 1000ULL;
            captureState.nextAdcUs = captureState.startedAtUs;
            captureState.nextImuUs = captureState.startedAtUs;
            captureState.nextAdsUs = captureState.startedAtUs;
            captureState.adcRemainder = 0;
            captureState.imuRemainder = 0;
            captureState.adsRemainder = 0;
            captureState.missedAdc = 0;
            captureState.missedImu = 0;
            captureState.missedAds = 0;
            captureState.adc = PacketBuilder(UDP_PACKET_ADC);
            captureState.imu = PacketBuilder(UDP_PACKET_IMU);
            captureState.ads = PacketBuilder(UDP_PACKET_ADS);
            captureState.adc.beginSession(captureState.sessionId, command.config);
            captureState.imu.beginSession(captureState.sessionId, command.config);
            captureState.ads.beginSession(captureState.sessionId, command.config);
            captureState.active = true;
        }
    }

    if (!captureState.active) {
        return false;
    }

    const uint64_t nowUs = platformMicros();
    bool shouldStop = false;
#if PLATFORM_ESP32
    shouldStop = stopRequested.load();
#else
    shouldStop = stopRequested;
#endif
    if (shouldStop || nowUs >= captureState.stopAtUs) {
        captureState.adc.flush(packetQueue);
        captureState.imu.flush(packetQueue);
        captureState.ads.flush(packetQueue);
        captureState.active = false;
        stopRequested = false;
        samplingActive = false;
        DEVICE_LOG_INFO("[HighSpeed] Sensor capture ended; missed ADC/IMU/ADS=" +
            String(captureState.missedAdc) + "/" +
            String(captureState.missedImu) + "/" +
            String(captureState.missedAds));
        return false;
    }

    uint64_t sampleTimeUs = nowUs;
    if (modeReadsAds(captureState.config.mode) &&
        sampleTimeUs >= captureState.nextAdsUs) {
        uint16_t sample = 0;
        adsConvertAndRead(sample);
        const uint8_t encoded[2] = {
            static_cast<uint8_t>(sample >> 8),
            static_cast<uint8_t>(sample)
        };
        captureState.ads.append(encoded, sizeof(encoded), sampleTimeUs);
        const uint32_t missed = skipMissedDeadlines(
            platformMicros(), captureState.nextAdsUs, kAdsRateHz,
            captureState.adsRemainder, captureState.missedAds);
        captureState.ads.addDropped(missed);
        SystemTask::recordMissedSamples(UDP_PACKET_ADS, missed);
        if (captureState.ads.full(kAdsBatchSize)) {
            captureState.ads.flush(packetQueue);
        }
    }

    sampleTimeUs = platformMicros();
    if (modeReadsImu(captureState.config.mode) &&
        sampleTimeUs >= captureState.nextImuUs) {
        encodeAndAppendImu(sampleTimeUs);
        const uint32_t missed = skipMissedDeadlines(
            platformMicros(), captureState.nextImuUs, kImuRateHz,
            captureState.imuRemainder, captureState.missedImu);
        captureState.imu.addDropped(missed);
        SystemTask::recordMissedSamples(UDP_PACKET_IMU, missed);
        if (captureState.imu.full(kImuBatchSize)) {
            captureState.imu.flush(packetQueue);
        }
    }

    sampleTimeUs = platformMicros();
    if (modeReadsAdc(captureState.config.mode) &&
        sampleTimeUs >= captureState.nextAdcUs) {
        const uint16_t sample = static_cast<uint16_t>(analogRead(HS_ADC_PIN));
        const uint8_t encoded[2] = {
            static_cast<uint8_t>(sample >> 8),
            static_cast<uint8_t>(sample)
        };
        captureState.adc.append(encoded, sizeof(encoded), sampleTimeUs);
        const uint32_t missed = skipMissedDeadlines(
            platformMicros(), captureState.nextAdcUs, kAdcRateHz,
            captureState.adcRemainder, captureState.missedAdc);
        captureState.adc.addDropped(missed);
        SystemTask::recordMissedSamples(UDP_PACKET_ADC, missed);
        if (captureState.adc.full(kAdcBatchSize)) {
            captureState.adc.flush(packetQueue);
        }
    }
#endif // PLATFORM_ESP32

    return true;
#endif // SUPPORT_RTOS
}

uint32_t HighSpeedSampler::packetQueueDepth() const {
#if SUPPORT_RTOS
    return packetQueue == nullptr ? 0 : uxQueueMessagesWaiting(packetQueue);
#else
    return 0;
#endif
}

bool HighSpeedSampler::receivePacket(HighSpeedUdpPacket& packet) {
#if SUPPORT_RTOS
    return packetQueue != nullptr &&
        xQueueReceive(packetQueue, &packet, 0) == pdTRUE;
#else
    (void)packet;
    return false;
#endif
}
