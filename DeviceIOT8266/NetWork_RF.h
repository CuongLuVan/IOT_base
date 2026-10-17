#pragma once

#include <Arduino.h>
#include "define_All.h"

class NetWork_RF {
public:
    NetWork_RF();

    bool begin(long frequency = LORA_FREQUENCY_HZ,
               int csPin = LORA_CS_PIN,
               int resetPin = LORA_RESET_PIN,
               int irqPin = LORA_IRQ_PIN);
    bool sendData(const uint8_t* data, size_t length);
    bool sendData(const String& payload);
    bool receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLength);
    bool available();
    bool isInitialized() const;
    int packetRssi() const;
    float packetSnr() const;

private:
    bool initialized_;
};