#include "LoRaRadio.h"

#include "Platform.h"
#include "driver/gpio.h"
#include "rom/ets_sys.h"

namespace {

// Registers.
constexpr uint8_t kRegFifo = 0x00;
constexpr uint8_t kRegOpMode = 0x01;
constexpr uint8_t kRegFrfMsb = 0x06;
constexpr uint8_t kRegFrfMid = 0x07;
constexpr uint8_t kRegFrfLsb = 0x08;
constexpr uint8_t kRegPaConfig = 0x09;
constexpr uint8_t kRegOcp = 0x0B;
constexpr uint8_t kRegLna = 0x0C;
constexpr uint8_t kRegFifoAddrPtr = 0x0D;
constexpr uint8_t kRegFifoTxBaseAddr = 0x0E;
constexpr uint8_t kRegFifoRxBaseAddr = 0x0F;
constexpr uint8_t kRegFifoRxCurrentAddr = 0x10;
constexpr uint8_t kRegIrqFlags = 0x12;
constexpr uint8_t kRegRxNbBytes = 0x13;
constexpr uint8_t kRegPktSnrValue = 0x19;
constexpr uint8_t kRegPktRssiValue = 0x1A;
constexpr uint8_t kRegModemConfig1 = 0x1D;
constexpr uint8_t kRegPayloadLength = 0x22;
constexpr uint8_t kRegModemConfig3 = 0x26;
constexpr uint8_t kRegVersion = 0x42;

// Modes.
constexpr uint8_t kModeLongRange = 0x80;
constexpr uint8_t kModeSleep = 0x00;
constexpr uint8_t kModeStandby = 0x01;
constexpr uint8_t kModeTx = 0x03;
constexpr uint8_t kModeRxSingle = 0x06;

constexpr uint8_t kPaBoost = 0x80;
constexpr uint8_t kIrqTxDone = 0x08;
constexpr uint8_t kIrqPayloadCrcError = 0x20;
constexpr uint8_t kIrqRxDone = 0x40;
constexpr int kMaxPacketLength = 255;

void configureOutput(int pin, uint32_t level)
{
    if (pin < 0) return;
    gpio_config_t config = {};
    config.pin_bit_mask = 1ULL << pin;
    config.mode = GPIO_MODE_OUTPUT;
    config.pull_up_en = GPIO_PULLUP_DISABLE;
    config.pull_down_en = GPIO_PULLDOWN_DISABLE;
    config.intr_type = GPIO_INTR_DISABLE;
    gpio_config(&config);
    gpio_set_level(static_cast<gpio_num_t>(pin), level);
}

void configureInput(int pin)
{
    if (pin < 0) return;
    gpio_config_t config = {};
    config.pin_bit_mask = 1ULL << pin;
    config.mode = GPIO_MODE_INPUT;
    config.pull_up_en = GPIO_PULLUP_DISABLE;
    config.pull_down_en = GPIO_PULLDOWN_DISABLE;
    config.intr_type = GPIO_INTR_DISABLE;
    gpio_config(&config);
}

}  // namespace

// One register access: address byte (bit7 = write), then one data byte.
uint8_t LoRaRadio::transfer(uint8_t address, uint8_t value)
{
    const gpio_num_t sck = static_cast<gpio_num_t>(pins_.sck);
    const gpio_num_t mosi = static_cast<gpio_num_t>(pins_.mosi);
    const gpio_num_t miso = static_cast<gpio_num_t>(pins_.miso);
    gpio_set_level(static_cast<gpio_num_t>(pins_.cs), 0);
    uint8_t received = 0;
    const uint8_t bytes[2] = {address, value};
    for (int index = 0; index < 2; ++index) {
        uint8_t in = 0;
        for (int bit = 7; bit >= 0; --bit) {
            gpio_set_level(mosi, (bytes[index] >> bit) & 0x01);
            ets_delay_us(1);
            gpio_set_level(sck, 1);
            in = static_cast<uint8_t>((in << 1) | (gpio_get_level(miso) != 0 ? 1 : 0));
            ets_delay_us(1);
            gpio_set_level(sck, 0);
        }
        received = in;
    }
    gpio_set_level(static_cast<gpio_num_t>(pins_.cs), 1);
    return received;
}

uint8_t LoRaRadio::readRegister(uint8_t address)
{
    return transfer(static_cast<uint8_t>(address & 0x7F), 0x00);
}

void LoRaRadio::writeRegister(uint8_t address, uint8_t value)
{
    (void)transfer(static_cast<uint8_t>(address | 0x80), value);
}

bool LoRaRadio::begin(const Pins& pins, long frequency)
{
    pins_ = pins;
    if (pins_.sck < 0 || pins_.miso < 0 || pins_.mosi < 0 || pins_.cs < 0) return false;
    configureOutput(pins_.cs, 1);
    configureOutput(pins_.sck, 0);
    configureOutput(pins_.mosi, 0);
    configureInput(pins_.miso);
    if (pins_.reset >= 0) {
        configureOutput(pins_.reset, 0);
        delayMs(10);
        gpio_set_level(static_cast<gpio_num_t>(pins_.reset), 1);
        delayMs(10);
    }
    if (readRegister(kRegVersion) != 0x12) return false;

    sleep();
    setFrequency(frequency);
    writeRegister(kRegFifoTxBaseAddr, 0);
    writeRegister(kRegFifoRxBaseAddr, 0);
    // LNA boost, automatic AGC.
    writeRegister(kRegLna, static_cast<uint8_t>(readRegister(kRegLna) | 0x03));
    writeRegister(kRegModemConfig3, 0x04);
    setTxPower(17);
    idle();
    return true;
}

void LoRaRadio::setFrequency(long frequency)
{
    frequency_ = frequency;
    const uint64_t frf = (static_cast<uint64_t>(frequency) << 19) / 32000000ULL;
    writeRegister(kRegFrfMsb, static_cast<uint8_t>(frf >> 16));
    writeRegister(kRegFrfMid, static_cast<uint8_t>(frf >> 8));
    writeRegister(kRegFrfLsb, static_cast<uint8_t>(frf >> 0));
}

void LoRaRadio::setOcp(uint8_t milliAmps)
{
    uint8_t trim = 27;
    if (milliAmps <= 120) {
        trim = static_cast<uint8_t>((milliAmps - 45) / 5);
    } else if (milliAmps <= 240) {
        trim = static_cast<uint8_t>((milliAmps + 30) / 10);
    }
    writeRegister(kRegOcp, static_cast<uint8_t>(0x20 | (0x1F & trim)));
}

void LoRaRadio::setTxPower(int level)
{
    if (level < 2) level = 2;
    if (level > 17) level = 17;
    setOcp(100);
    writeRegister(kRegPaConfig, static_cast<uint8_t>(kPaBoost | (level - 2)));
}

void LoRaRadio::explicitHeaderMode()
{
    writeRegister(kRegModemConfig1, static_cast<uint8_t>(readRegister(kRegModemConfig1) & 0xFE));
}

void LoRaRadio::idle()
{
    writeRegister(kRegOpMode, kModeLongRange | kModeStandby);
}

void LoRaRadio::sleep()
{
    writeRegister(kRegOpMode, kModeLongRange | kModeSleep);
}

bool LoRaRadio::isTransmitting()
{
    if ((readRegister(kRegOpMode) & kModeTx) == kModeTx) return true;
    if ((readRegister(kRegIrqFlags) & kIrqTxDone) != 0) {
        // Clear the TX done flag.
        writeRegister(kRegIrqFlags, kIrqTxDone);
    }
    return false;
}

int LoRaRadio::beginPacket()
{
    if (isTransmitting()) return 0;
    idle();
    explicitHeaderMode();
    writeRegister(kRegFifoAddrPtr, 0);
    writeRegister(kRegPayloadLength, 0);
    return 1;
}

size_t LoRaRadio::write(const uint8_t* data, size_t length)
{
    const int current = readRegister(kRegPayloadLength);
    if (current + static_cast<int>(length) > kMaxPacketLength) {
        length = static_cast<size_t>(kMaxPacketLength - current);
    }
    for (size_t i = 0; i < length; ++i) writeRegister(kRegFifo, data[i]);
    writeRegister(kRegPayloadLength, static_cast<uint8_t>(current + static_cast<int>(length)));
    return length;
}

void LoRaRadio::endPacketAsync()
{
    writeRegister(kRegOpMode, kModeLongRange | kModeTx);
}

int LoRaRadio::parsePacket()
{
    int packetLength = 0;
    const uint8_t irqFlags = readRegister(kRegIrqFlags);
    explicitHeaderMode();
    // Clear the IRQ flags.
    writeRegister(kRegIrqFlags, irqFlags);
    if ((irqFlags & kIrqRxDone) != 0 && (irqFlags & kIrqPayloadCrcError) == 0) {
        packetIndex_ = 0;
        packetLength = readRegister(kRegRxNbBytes);
        writeRegister(kRegFifoAddrPtr, readRegister(kRegFifoRxCurrentAddr));
        idle();
    } else if (readRegister(kRegOpMode) != (kModeLongRange | kModeRxSingle)) {
        // Not receiving: arm a new single receive.
        writeRegister(kRegFifoAddrPtr, 0);
        writeRegister(kRegOpMode, kModeLongRange | kModeRxSingle);
    }
    rxLength_ = packetLength;
    return packetLength;
}

int LoRaRadio::available()
{
    return rxLength_ - packetIndex_;
}

int LoRaRadio::readByte()
{
    if (available() <= 0) return -1;
    ++packetIndex_;
    return readRegister(kRegFifo);
}

int LoRaRadio::packetRssi()
{
    return readRegister(kRegPktRssiValue) - (frequency_ < 868000000L ? 164 : 157);
}

float LoRaRadio::packetSnr()
{
    return static_cast<int8_t>(readRegister(kRegPktSnrValue)) * 0.25f;
}
