#include "NetWork_RF.h"
#include <SPI.h>
#include <LoRa.h>

#define LORA_DEFAULT_FREQUENCY 915E6L
#define LORA_DEFAULT_CS_PIN 5
#define LORA_DEFAULT_RESET_PIN 14
#define LORA_DEFAULT_IRQ_PIN 2

NetWork_RF::NetWork_RF()
    : initialized(false), frequency(LORA_DEFAULT_FREQUENCY), csPin(LORA_DEFAULT_CS_PIN), resetPin(LORA_DEFAULT_RESET_PIN), irqPin(LORA_DEFAULT_IRQ_PIN) {
}

bool NetWork_RF::begin(long frequency, int csPin, int resetPin, int irqPin) {
    this->frequency = frequency;
    this->csPin = csPin;
    this->resetPin = resetPin;
    this->irqPin = irqPin;

    SPI.begin();
    LoRa.setPins(csPin, resetPin, irqPin);

    if (!LoRa.begin(frequency)) {
        return false;
    }

    initialized = true;
    return true;
}

bool NetWork_RF::sendData(const uint8_t* data, size_t len) {
    if (!initialized || data == nullptr || len == 0) {
        return false;
    }

    LoRa.beginPacket();
    LoRa.write(data, len);
    return LoRa.endPacket() == 1;
}

bool NetWork_RF::sendData(const String& payload) {
    if (!initialized || payload.length() == 0) {
        return false;
    }

    LoRa.beginPacket();
    LoRa.print(payload);
    return LoRa.endPacket() == 1;
}

bool NetWork_RF::available() {
    if (!initialized) {
        return false;
    }
    int packetSize = LoRa.parsePacket();
    return packetSize > 0;
}

bool NetWork_RF::receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLen) {
    receivedLen = 0;
    if (!initialized || buffer == nullptr || bufferSize == 0) {
        return false;
    }

    int packetSize = LoRa.parsePacket();
    if (packetSize <= 0) {
        return false;
    }

    size_t toRead = (size_t)packetSize;
    if (toRead > bufferSize) {
        toRead = bufferSize;
    }

    int readBytes = LoRa.readBytes(buffer, toRead);
    if (readBytes <= 0) {
        return false;
    }

    receivedLen = (size_t)readBytes;
    return true;
}

int NetWork_RF::packetRssi() const {
    return initialized ? LoRa.packetRssi() : 0;
}

float NetWork_RF::packetSnr() const {
    return initialized ? LoRa.packetSnr() : 0.0f;
}

