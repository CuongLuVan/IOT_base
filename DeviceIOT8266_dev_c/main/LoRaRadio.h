#pragma once

// SX127x (SX1276/77/78/79, RFM95) LoRa driver, replacing the Arduino "LoRa"
// library by Sandeep Mistry with the same register sequence and defaults:
// explicit header, SF7, 125 kHz, CR 4/5, sync word 0x12, CRC off,
// PA_BOOST output. Receive is polled (no DIO0 / IRQ pin).
//
// SPI is driven on GPIO (mode 0, MSB first) so no SPI driver configuration
// of the SDK is needed; a 255-byte packet takes a few milliseconds.

#include <stddef.h>
#include <stdint.h>

class LoRaRadio {
public:
    struct Pins {
        int sck;
        int miso;
        int mosi;
        int cs;
        int reset;
    };

    // Resets the chip, checks the version register (0x12) and configures it.
    bool begin(const Pins& pins, long frequency);
    // 2..17 dBm on PA_BOOST.
    void setTxPower(int level);

    // Packet API of the Arduino library.
    int beginPacket();
    size_t write(const uint8_t* data, size_t length);
    void endPacketAsync();
    // Polls for a received packet (RX single); returns its size or 0.
    int parsePacket();
    int available();
    int readByte();
    void idle();
    void sleep();
    int packetRssi();
    float packetSnr();

private:
    uint8_t readRegister(uint8_t address);
    void writeRegister(uint8_t address, uint8_t value);
    uint8_t transfer(uint8_t address, uint8_t value);
    bool isTransmitting();
    void setFrequency(long frequency);
    void setOcp(uint8_t milliAmps);
    void explicitHeaderMode();

    Pins pins_ = {-1, -1, -1, -1, -1};
    long frequency_ = 0;
    int packetIndex_ = 0;
    int rxLength_ = 0;
};
