#ifndef NETWORK_RF_H
#define NETWORK_RF_H

#include "Arduino.h"
#include "define_All.h"

class NetWork_RF {
public:
    NetWork_RF();

    // Initialize the LoRa radio; returns true on success.
    bool begin(long frequency = 915E6L, int csPin = 5, int resetPin = 14, int irqPin = 2);

    // Send raw bytes via LoRa.
    bool sendData(const uint8_t* data, size_t len);

    // Send a string payload via LoRa.
    bool sendData(const String& payload);

    // Receive the next LoRa packet into buffer.
    // receivedLen will contain the number of bytes read.
    bool receiveData(uint8_t* buffer, size_t bufferSize, size_t& receivedLen);

    // Return true when a packet is available for reading.
    bool available();

    // Get RSSI and SNR for the last received packet.
    int packetRssi() const;
    float packetSnr() const;

private:
    bool initialized;
    long frequency;
    int csPin;
    int resetPin;
    int irqPin;
};

#endif // NETWORK_RF_H
