#include "NetWork_RF.h"

#include <LoRa.h>
#include <SPI.h>

NetWork_RF::NetWork_RF() : initialized_(false) {}

bool NetWork_RF::begin(long frequency, int csPin, int resetPin, int irqPin) {
    if (initialized_) {
        return true;
    }

    SPI.begin();
    LoRa.setPins(csPin, resetPin, irqPin);
    if (!LoRa.begin(frequency)) {
        return false;
    }

    // Explicit lengths prevent unexpected dynamic allocations in the LoRa driver.
    LoRa.setTxPower(17);
    initialized_ = true;
    return true;
}

bool NetWork_RF::sendData(const uint8_t* data, size_t length) {
    if (!initialized_ || data == nullptr || length == 0 ||
        length > LORA_MAX_PAYLOAD_SIZE) {
        return false;
    }

    if (LoRa.beginPacket() == 0) {
        return false;
    }
    const size_t written = LoRa.write(data, length);
    return written == length && LoRa.endPacket() == 1;
}

bool NetWork_RF::sendData(const String& payload) {
    return sendData(reinterpret_cast<const uint8_t*>(payload.c_str()),
                    payload.length());
}

bool NetWork_RF::available() {
    return initialized_ && LoRa.parsePacket() > 0;
}

bool NetWork_RF::receiveData(uint8_t* buffer, size_t bufferSize,
                              size_t& receivedLength) {
    receivedLength = 0;
    if (!initialized_ || buffer == nullptr || bufferSize == 0) {
        return false;
    }

    const int packetSize = LoRa.parsePacket();
    if (packetSize <= 0) {
        return false;
    }

    const size_t limit = packetSize < static_cast<int>(bufferSize)
        ? static_cast<size_t>(packetSize) : bufferSize;
    while (LoRa.available() && receivedLength < limit) {
        const int value = LoRa.read();
        if (value < 0) {
            break;
        }
        buffer[receivedLength++] = static_cast<uint8_t>(value);
    }
    // Drain an oversized packet so the next parsePacket() starts cleanly.
    while (LoRa.available()) {
        (void)LoRa.read();
    }
    return receivedLength > 0;
}

bool NetWork_RF::isInitialized() const {
    return initialized_;
}

int NetWork_RF::packetRssi() const {
    return initialized_ ? LoRa.packetRssi() : 0;
}

float NetWork_RF::packetSnr() const {
    return initialized_ ? LoRa.packetSnr() : 0.0f;
}