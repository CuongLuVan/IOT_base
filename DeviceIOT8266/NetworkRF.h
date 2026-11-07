#pragma once

// SX127x LoRa radio (SUPPORT_LORA), polled from the network task. Pins come
// from board_pins.h.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>

#include "define_All.h"

class NetworkRF {
public:
    bool begin(long frequency = LORA_FREQUENCY_HZ, int csPin = LORA_CS_PIN, int resetPin = LORA_RESET_PIN,
               int irqPin = LORA_IRQ_PIN);
    bool isInitialized() const;

    bool sendData(const uint8_t* data, size_t length);
    bool sendData(const String& payload);

    // Reads the next packet, if any (one parsePacket() per call); an oversized
    // packet is truncated to bufferSize and the rest drained.
    bool receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLength);
    // receiveData() as text: control bytes become '?'. Also kept as lastText().
    bool receiveText(String& text);
    const String& lastText() const;

    // Of the last received packet.
    int packetRssi() const;
    float packetSnr() const;

private:
    bool initialized_ = false;
    String lastText_;
};
