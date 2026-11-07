#include "HighSpeedSampler.h"

#include <SPI.h>
#include <esp_timer.h>
#include <soc/gpio_reg.h>
#include <string.h>

#include <type_traits>

#include "ByteCodec.h"
#include "DebugInfo.h"
#include "SystemTask.h"
#include "define_All.h"

namespace {

// ~280 B per packet. TaskNetwork drains it between its other work (MQTT,
// HTTP), so it has room for ~100 ms of ADS data at the default rate.
constexpr UBaseType_t kPacketQueueDepth = 64;

constexpr uint8_t kIcmWhoAmIRegister = 0x75;
constexpr uint8_t kIcmDeviceConfigRegister = 0x11;
constexpr uint8_t kIcmPowerManagementRegister = 0x4E;
constexpr uint8_t kIcmGyroConfig0Register = 0x4F;
constexpr uint8_t kIcmAccelConfig0Register = 0x50;
constexpr uint8_t kIcmTemperatureData1Register = 0x1D;
constexpr uint8_t kIcmExpectedWhoAmI = 0x47;
// Temperature, accel xyz, gyro xyz: 7 big-endian int16 registers.
constexpr size_t kImuSampleBytes = 14;
constexpr size_t kMaxSampleBytes = kImuSampleBytes;

static_assert(HS_AUDIO_ADC_SAMPLE_RATE_HZ > 0 && HS_AUDIO_ADC_SAMPLE_RATE_HZ <= 1000000UL,
              "HS_AUDIO_ADC_SAMPLE_RATE_HZ must be between 1 and 1000000");
static_assert(HS_ICM42688_SAMPLE_RATE_HZ > 0, "HS_ICM42688_SAMPLE_RATE_HZ must be greater than zero");
static_assert(HS_ADS8866_SAMPLE_RATE_HZ > 0 && HS_ADS8866_SAMPLE_RATE_HZ <= 100000,
              "HS_ADS8866_SAMPLE_RATE_HZ must be between 1 and 100000");

enum class CaptureCommandType : uint8_t {
    Start,
};

// Queue items are copied with memcpy, so they hold the IPv4 address as a
// number instead of an IPAddress (which is not trivially copyable).
struct CaptureCommand {
    CaptureCommandType type;
    HighSpeedMode mode;
    uint32_t targetIp;
    uint16_t targetPort;
    uint32_t durationMs;
};

struct QueuedPacket {
    uint16_t length;
    uint32_t targetIp;
    uint16_t targetPort;
    uint8_t bytes[HIGH_SPEED_UDP_MAX_DATAGRAM_SIZE];
};

static_assert(std::is_trivially_copyable<CaptureCommand>::value, "queued by memcpy");
static_assert(std::is_trivially_copyable<QueuedPacket>::value, "queued by memcpy");

static_assert(HS_ADS_CNV_PIN < 32, "the ADS CNV pin is driven through GPIO_OUT_W1TS_REG");

// Builds one datagram in place; flush() copies it into the packet queue.
class PacketBuilder {
public:
    void reset(UdpPacketType type, uint32_t sessionId, const CaptureCommand& config)
    {
        type_ = type;
        sessionId_ = sessionId;
        sequence_ = 0;
        dropped_ = 0;
        count_ = 0;
        payloadLength_ = 0;
        packet_.targetIp = config.targetIp;
        packet_.targetPort = config.targetPort;
    }

    void append(const uint8_t* data, size_t size, uint64_t timestampUs)
    {
        if (payloadLength_ + size > HIGH_SPEED_UDP_MAX_PAYLOAD_SIZE) {
            ++dropped_;
            return;
        }
        if (count_ == 0) firstSampleUs_ = timestampUs;
        memcpy(packet_.bytes + capture_udp::kHeaderSize + payloadLength_, data, size);
        payloadLength_ = static_cast<uint16_t>(payloadLength_ + size);
        ++count_;
    }

    bool full(uint16_t batchSize) const
    {
        return count_ >= batchSize;
    }

    void addDropped(uint32_t count)
    {
        dropped_ += count;
    }

    void flush(QueueHandle_t queue)
    {
        if (count_ == 0) return;
        using namespace capture_udp;
        uint8_t* header = packet_.bytes;
        header[kOffMagic] = kMagic0;
        header[kOffMagic + 1] = kMagic1;
        header[kOffVersion] = kVersion;
        header[kOffType] = static_cast<uint8_t>(type_);
        be::put32(header + kOffSession, sessionId_);
        be::put32(header + kOffSequence, sequence_++);
        be::put64(header + kOffFirstSampleUs, firstSampleUs_);
        be::put16(header + kOffSampleCount, count_);
        be::put16(header + kOffPayloadBytes, payloadLength_);
        be::put32(header + kOffDropped, dropped_);
        packet_.length = static_cast<uint16_t>(kHeaderSize + payloadLength_);

        SystemTask::recordCollectedSamples(type_, count_);
        if (xQueueSend(queue, &packet_, 0) == pdTRUE) {
            dropped_ = 0;
        } else {
            SystemTask::recordBufferFull(type_, count_);
            dropped_ += count_;
        }
        count_ = 0;
        payloadLength_ = 0;
    }

private:
    QueuedPacket packet_ = {};
    UdpPacketType type_ = UDP_PACKET_ADC;
    uint32_t sessionId_ = 0;
    uint32_t sequence_ = 0;
    uint32_t dropped_ = 0;
    uint64_t firstSampleUs_ = 0;
    uint16_t count_ = 0;
    uint16_t payloadLength_ = 0;
};

SPIClass icmSPI(HSPI);
SPIClass adsSPI(VSPI);

uint8_t icmReadRegister(uint8_t address)
{
    digitalWrite(HS_ICM_CS_PIN, LOW);
    icmSPI.beginTransaction(SPISettings(HS_ICM_SPI_HZ, MSBFIRST, SPI_MODE0));
    icmSPI.transfer(address | 0x80);
    const uint8_t value = icmSPI.transfer(0);
    icmSPI.endTransaction();
    digitalWrite(HS_ICM_CS_PIN, HIGH);
    return value;
}

void icmWriteRegister(uint8_t address, uint8_t value)
{
    digitalWrite(HS_ICM_CS_PIN, LOW);
    icmSPI.beginTransaction(SPISettings(HS_ICM_SPI_HZ, MSBFIRST, SPI_MODE0));
    icmSPI.transfer(address & 0x7F);
    icmSPI.transfer(value);
    icmSPI.endTransaction();
    digitalWrite(HS_ICM_CS_PIN, HIGH);
}

uint8_t icmOdrRegisterValue(uint32_t rateHz)
{
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

// Sample readers: write one sample (big-endian) to out. The ADS bus belongs
// to TaskSensor alone, so its SPI transaction stays open for the whole
// session (startSession / endSession) and CNV is driven by register writes.
void readAdsSample(uint8_t* out)
{
    *reinterpret_cast<volatile uint32_t*>(GPIO_OUT_W1TS_REG) = 1UL << HS_ADS_CNV_PIN;
    delayMicroseconds(9);
    *reinterpret_cast<volatile uint32_t*>(GPIO_OUT_W1TC_REG) = 1UL << HS_ADS_CNV_PIN;
    const uint16_t sample = adsSPI.transfer16(0);
    be::put16(out, sample);
}

// The ICM registers are already big-endian int16, the wire format.
void readImuSample(uint8_t* out)
{
    digitalWrite(HS_ICM_CS_PIN, LOW);
    icmSPI.beginTransaction(SPISettings(HS_ICM_SPI_HZ, MSBFIRST, SPI_MODE0));
    icmSPI.transfer(kIcmTemperatureData1Register | 0x80);
    for (size_t i = 0; i < kImuSampleBytes; ++i) out[i] = icmSPI.transfer(0);
    icmSPI.endTransaction();
    digitalWrite(HS_ICM_CS_PIN, HIGH);
}

void readAdcSample(uint8_t* out)
{
    be::put16(out, static_cast<uint16_t>(analogRead(HS_ADC_PIN)));
}

bool modeReadsAdc(HighSpeedMode mode)
{
    return mode == HS_MODE_ADC_10KHZ || mode == HS_MODE_ALL;
}

bool modeReadsImu(HighSpeedMode mode)
{
    return mode == HS_MODE_ICM32K || mode == HS_MODE_ALL;
}

bool modeReadsAds(HighSpeedMode mode)
{
    return mode == HS_MODE_ADS100K || mode == HS_MODE_ALL;
}

// One sample stream of a capture session.
struct Channel {
    const UdpPacketType type;
    const char* const name;
    const uint32_t rateHz;
    const uint16_t batchSize;
    const uint8_t sampleBytes;
    bool (*const usedBy)(HighSpeedMode);
    void (*const read)(uint8_t* out);

    PacketBuilder builder;
    bool active;
    uint64_t nextUs;
    uint32_t remainder;  // Sub-microsecond part of the sample period, in 1/rateHz us.
    uint32_t missed;

    void reset(uint32_t sessionId, const CaptureCommand& config, uint64_t startUs)
    {
        builder.reset(type, sessionId, config);
        active = usedBy(config.mode);
        nextUs = startUs;
        remainder = 0;
        missed = 0;
    }

    void advanceOneSample()
    {
        nextUs += 1000000UL / rateHz;
        remainder += 1000000UL % rateHz;
        if (remainder >= rateHz) {
            ++nextUs;
            remainder -= rateHz;
        }
    }

    // Schedules the next sample; deadlines already passed are skipped and
    // returned as missed samples.
    uint32_t skipMissedDeadlines(uint64_t nowUs)
    {
        advanceOneSample();
        uint32_t skipped = 0;
        const uint32_t shortestPeriod = 1000000UL / rateHz;
        while (nowUs >= nextUs + shortestPeriod) {
            advanceOneSample();
            ++skipped;
        }
        missed += skipped;
        return skipped;
    }
};

// Fastest first, so the most demanding stream is served first in each pass.
Channel channels[] = {
    {UDP_PACKET_ADS, "ADS", HS_ADS8866_SAMPLE_RATE_HZ, 64, 2, modeReadsAds, readAdsSample, {}, false, 0, 0, 0},
    {UDP_PACKET_IMU, "IMU", HS_ICM42688_SAMPLE_RATE_HZ, 16, kImuSampleBytes, modeReadsImu, readImuSample, {}, false, 0,
     0, 0},
    {UDP_PACKET_ADC, "ADC", HS_AUDIO_ADC_SAMPLE_RATE_HZ, 64, 2, modeReadsAdc, readAdcSample, {}, false, 0, 0, 0},
};

struct Session {
    bool active = false;
    bool adsTransaction = false;
    uint64_t stopAtUs = 0;
};
Session session;

bool payloadFits(const Channel& channel)
{
    return channel.sampleBytes <= kMaxSampleBytes &&
           static_cast<size_t>(channel.batchSize) * channel.sampleBytes <= HIGH_SPEED_UDP_MAX_PAYLOAD_SIZE;
}

void startSession(const CaptureCommand& config)
{
    const uint64_t startUs = esp_timer_get_time();
    const uint32_t sessionId = static_cast<uint32_t>(startUs) ^ static_cast<uint32_t>(ESP.getEfuseMac());
    for (Channel& channel : channels) channel.reset(sessionId, config, startUs);
    session.adsTransaction = modeReadsAds(config.mode);
    if (session.adsTransaction) adsSPI.beginTransaction(SPISettings(HS_ADS_SPI_HZ, MSBFIRST, SPI_MODE0));
    session.stopAtUs = startUs + static_cast<uint64_t>(config.durationMs) * 1000ULL;
    session.active = true;
    DEVICE_LOGF_INFO("[HighSpeed] Capture started, mode %u, %lu ms\n", config.mode,
                     static_cast<unsigned long>(config.durationMs));
}

void serviceChannel(Channel& channel, QueueHandle_t queue)
{
    if (!channel.active) return;
    const uint64_t sampleTimeUs = esp_timer_get_time();
    if (sampleTimeUs < channel.nextUs) return;
    uint8_t sample[kMaxSampleBytes];
    channel.read(sample);
    channel.builder.append(sample, channel.sampleBytes, sampleTimeUs);
    const uint32_t missed = channel.skipMissedDeadlines(esp_timer_get_time());
    channel.builder.addDropped(missed);
    SystemTask::recordMissedSamples(channel.type, missed);
    if (channel.builder.full(channel.batchSize)) channel.builder.flush(queue);
}

void endSession(QueueHandle_t queue)
{
    for (Channel& channel : channels) channel.builder.flush(queue);
    if (session.adsTransaction) adsSPI.endTransaction();
    session.adsTransaction = false;
    session.active = false;
    for (const Channel& channel : channels) {
        if (channel.active && channel.missed != 0) {
            DEVICE_LOGF_WARNING("[HighSpeed] %s missed %lu samples\n", channel.name,
                                static_cast<unsigned long>(channel.missed));
        }
    }
    DEVICE_LOG_INFO("[HighSpeed] Capture ended");
}

}  // namespace

HighSpeedSampler& HighSpeedSampler::GetInstance()
{
    static HighSpeedSampler instance;
    return instance;
}

bool HighSpeedSampler::setup()
{
    if (initialized) return true;
    for (const Channel& channel : channels) {
        if (!payloadFits(channel)) {
            DEVICE_LOGF_ERROR("[HighSpeed] %s batch exceeds the UDP payload; capture disabled\n", channel.name);
            return false;
        }
    }

    controlQueue = xQueueCreate(1, sizeof(CaptureCommand));
    packetQueue = xQueueCreate(kPacketQueueDepth, sizeof(QueuedPacket));
    if (controlQueue == nullptr || packetQueue == nullptr) {
        DEVICE_LOG_ERROR("[HighSpeed] Cannot create sensor/network queues; capture disabled");
        if (controlQueue != nullptr) vQueueDelete(controlQueue);
        if (packetQueue != nullptr) vQueueDelete(packetQueue);
        controlQueue = nullptr;
        packetQueue = nullptr;
        return false;
    }

    initializeSensors();
    initialized = true;
    return true;
}

void HighSpeedSampler::initializeSensors()
{
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
        DEVICE_LOG_WARNING("[HighSpeed] ICM-42688-P WHO_AM_I mismatch; IMU modes unavailable");
        return;
    }

    const uint8_t odr = icmOdrRegisterValue(HS_ICM42688_SAMPLE_RATE_HZ);
    if (odr == 0) {
        DEVICE_LOG_ERROR("[HighSpeed] Unsupported ICM-42688-P sample rate; IMU modes unavailable");
        return;
    }

    icmAvailable = true;
    icmWriteRegister(kIcmPowerManagementRegister, 0x0F);
    icmWriteRegister(kIcmGyroConfig0Register, (icmReadRegister(kIcmGyroConfig0Register) & 0xF0) | odr);
    icmWriteRegister(kIcmAccelConfig0Register, (icmReadRegister(kIcmAccelConfig0Register) & 0xF0) | odr);
    delay(2);
}

bool HighSpeedSampler::startSampling(const HighSpeedConfig& config)
{
    if (!initialized || config.mode < HS_MODE_ADC_10KHZ || config.mode > HS_MODE_ALL || config.udpTargetPort == 0 ||
        config.durationMs == 0 || config.durationMs > HS_CAPTURE_MAX_DURATION_MS || !isModeAvailable(config.mode)) {
        return false;
    }

    bool expectedInactive = false;
    if (!samplingActive.compare_exchange_strong(expectedInactive, true)) return false;

    const CaptureCommand command = {CaptureCommandType::Start, config.mode, static_cast<uint32_t>(config.udpTargetIP),
                                    config.udpTargetPort, config.durationMs};
    stopRequested.store(false);
    if (xQueueSend(controlQueue, &command, 0) != pdTRUE) {
        samplingActive.store(false);
        return false;
    }
    return true;
}

void HighSpeedSampler::stopSampling()
{
    if (samplingActive.load()) stopRequested.store(true);
}

bool HighSpeedSampler::isSamplingActive() const
{
    return samplingActive.load();
}

bool HighSpeedSampler::isModeAvailable(HighSpeedMode mode) const
{
    return initialized && (!modeReadsImu(mode) || icmAvailable);
}

bool HighSpeedSampler::processSensorTask()
{
    if (!initialized) return false;

    if (!session.active) {
        CaptureCommand command;
        if (xQueueReceive(controlQueue, &command, 0) != pdTRUE || command.type != CaptureCommandType::Start) {
            return false;
        }
        startSession(command);
    }

    if (stopRequested.load() || esp_timer_get_time() >= session.stopAtUs) {
        endSession(packetQueue);
        stopRequested.store(false);
        samplingActive.store(false);
        return false;
    }

    for (Channel& channel : channels) serviceChannel(channel, packetQueue);
    return true;
}

UBaseType_t HighSpeedSampler::packetQueueDepth() const
{
    return packetQueue == nullptr ? 0 : uxQueueMessagesWaiting(packetQueue);
}

bool HighSpeedSampler::receivePacket(HighSpeedUdpPacket& packet)
{
    QueuedPacket queued;
    if (packetQueue == nullptr || xQueueReceive(packetQueue, &queued, 0) != pdTRUE) return false;
    packet.length = queued.length;
    packet.targetIP = IPAddress(queued.targetIp);
    packet.targetPort = queued.targetPort;
    memcpy(packet.bytes, queued.bytes, queued.length);
    return true;
}
