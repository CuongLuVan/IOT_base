#pragma once

// SX127x LoRa radio (SUPPORT_LORA), polled from the network task. Pins come
// from board_pins.h. Same API and behaviour as DeviceIOT8266.

#include <stddef.h>
#include <stdint.h>
#include <string>

#include "define_All.h"

class NetworkRF {
public:
    bool begin(long frequency = LORA_FREQUENCY_HZ);
    bool isInitialized() const;

    bool sendData(const uint8_t* data, size_t length);
    bool sendData(const std::string& payload);

    // Reads the next packet, if any (one parsePacket() per call); an oversized
    // packet is truncated to bufferSize and the rest drained.
    bool receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLength);
    // receiveData() as text: control bytes become '?'. Also kept as lastText().
    bool receiveText(std::string& text);
    const std::string& lastText() const;

    // Of the last received packet.
    int packetRssi();
    float packetSnr();

private:
    bool initialized_ = false;
    std::string lastText_;
};
