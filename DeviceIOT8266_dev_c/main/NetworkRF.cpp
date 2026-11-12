#include "NetworkRF.h"

#if SUPPORT_LORA

#include "LoRaRadio.h"
#include "Platform.h"

namespace {
constexpr int kTxPowerDbm = 17;
LoRaRadio radio;
}  // namespace

bool NetworkRF::begin(long frequency)
{
    if (initialized_) {
        return true;
    }
    const LoRaRadio::Pins pins = {LORA_SCK_PIN, LORA_MISO_PIN, LORA_MOSI_PIN, LORA_CS_PIN, LORA_RESET_PIN};
    if (!radio.begin(pins, frequency)) {
        return false;
    }
    radio.setTxPower(kTxPowerDbm);
    initialized_ = true;
    return true;
}

bool NetworkRF::isInitialized() const
{
    return initialized_;
}

bool NetworkRF::sendData(const uint8_t* data, size_t length)
{
    if (!initialized_ || data == nullptr || length == 0 || length > LORA_MAX_PAYLOAD_SIZE) {
        return false;
    }
    if (radio.beginPacket() == 0) {
        return false;
    }
    if (radio.write(data, length) != length) {
        radio.idle();
        return false;
    }
    // Wait for TX done with a timeout: beginPacket() returns 0 while the
    // radio is still transmitting.
    radio.endPacketAsync();
    const uint32_t startMs = millis();
    while (radio.beginPacket() == 0) {
        if (millis() - startMs >= LORA_TX_TIMEOUT_MS) {
            radio.idle();
            return false;
        }
        delayMs(1);
    }
    radio.idle();
    return true;
}

bool NetworkRF::sendData(const std::string& payload)
{
    return sendData(reinterpret_cast<const uint8_t*>(payload.data()), payload.size());
}

bool NetworkRF::receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLength)
{
    receivedLength = 0;
    if (!initialized_ || buffer == nullptr || bufferSize == 0) {
        return false;
    }
    const int packetSize = radio.parsePacket();
    if (packetSize <= 0) {
        return false;
    }
    const size_t limit = static_cast<size_t>(packetSize) < bufferSize ? static_cast<size_t>(packetSize) : bufferSize;
    while (radio.available() > 0 && receivedLength < limit) {
        const int value = radio.readByte();
        if (value < 0) {
            break;
        }
        buffer[receivedLength++] = static_cast<uint8_t>(value);
    }
    while (radio.available() > 0) {
        (void)radio.readByte();
    }
    return receivedLength > 0;
}

bool NetworkRF::receiveText(std::string& text)
{
    uint8_t buffer[LORA_BUFFER_SIZE];
    size_t length = 0;
    if (!receiveData(buffer, sizeof(buffer), length)) {
        return false;
    }
    text.clear();
    text.reserve(length);
    for (size_t i = 0; i < length; ++i) {
        text += buffer[i] >= 0x20 ? static_cast<char>(buffer[i]) : '?';
    }
    lastText_ = text;
    return true;
}

const std::string& NetworkRF::lastText() const
{
    return lastText_;
}

int NetworkRF::packetRssi()
{
    return initialized_ ? radio.packetRssi() : 0;
}

float NetworkRF::packetSnr()
{
    return initialized_ ? radio.packetSnr() : 0.0f;
}

#endif  // SUPPORT_LORA
