// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "NetworkRF.h"

#if SUPPORT_LORA

#include <LoRa.h>
#include <SPI.h>

namespace {
constexpr int kTxPowerDbm = 17;
}

bool NetworkRF::begin(long frequency, int csPin, int resetPin, int irqPin)
{
    if (initialized_) {
        return true;
    }
    SPI.begin();
    LoRa.setPins(csPin, resetPin, irqPin);
    if (!LoRa.begin(frequency)) {
        return false;
    }
    LoRa.setTxPower(kTxPowerDbm);
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
    if (LoRa.beginPacket() == 0) {
        return false;
    }
    if (LoRa.write(data, length) != length) {
        LoRa.idle();
        return false;
    }
    // endPacket() without async waits for TX done with no timeout; a radio
    // that never reports it would hang the network task. beginPacket()
    // returns 0 while the radio is still transmitting.
    LoRa.endPacket(true);
    const uint32_t startMs = millis();
    while (LoRa.beginPacket() == 0) {
        if (millis() - startMs >= LORA_TX_TIMEOUT_MS) {
            LoRa.idle();
            return false;
        }
        delay(1);
    }
    LoRa.idle();
    return true;
}

bool NetworkRF::sendData(const String& payload)
{
    return sendData(reinterpret_cast<const uint8_t*>(payload.c_str()), payload.length());
}

bool NetworkRF::receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLength)
{
    receivedLength = 0;
    if (!initialized_ || buffer == nullptr || bufferSize == 0) {
        return false;
    }
    const int packetSize = LoRa.parsePacket();
    if (packetSize <= 0) {
        return false;
    }
    const size_t limit = static_cast<size_t>(packetSize) < bufferSize ? static_cast<size_t>(packetSize) : bufferSize;
    while (LoRa.available() && receivedLength < limit) {
        const int value = LoRa.read();
        if (value < 0) {
            break;
        }
        buffer[receivedLength++] = static_cast<uint8_t>(value);
    }
    while (LoRa.available()) {
        (void)LoRa.read();
    }
    return receivedLength > 0;
}

bool NetworkRF::receiveText(String& text)
{
    uint8_t buffer[LORA_BUFFER_SIZE];
    size_t length = 0;
    if (!receiveData(buffer, sizeof(buffer), length)) {
        return false;
    }
    text = String();
    text.reserve(length);
    for (size_t i = 0; i < length; ++i) {
        text += buffer[i] >= 0x20 ? static_cast<char>(buffer[i]) : '?';
    }
    lastText_ = text;
    return true;
}

const String& NetworkRF::lastText() const
{
    return lastText_;
}

int NetworkRF::packetRssi() const
{
    return initialized_ ? LoRa.packetRssi() : 0;
}

float NetworkRF::packetSnr() const
{
    return initialized_ ? LoRa.packetSnr() : 0.0f;
}

#endif  // SUPPORT_LORA
