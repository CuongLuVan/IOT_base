#pragma once

#include <Arduino.h>

// EEPROM addresses (WIFI_SSSID, WIFI_PASS, WIFI_SETUP_JSON, ...) live in the
// layout block of define_All.h.
#include "define_All.h"

class Memory {
private:
    static Memory* pinstance_;
    int size_ = 0;
    uint64_t timeStamp_ = 0;
    uint32_t lastTimestampMs_ = 0;

    Memory() = default;
    ~Memory() = default;
    bool validRange(int address, int length) const;

public:
    Memory(Memory&) = delete;
    void operator=(const Memory&) = delete;

    static Memory* GetInstance();
    void initEEPROM(int size);
    void writeInt(int address, int value);
    int readInt(int address);
    void writeLong(int address, long value);
    long readLong(int address);
    void writeDouble(int address, double value);
    double readDouble(int address);
    void writeString(int address, const char* value);
    void writeString(int address, const String& value);
    String readString(int address, int maxLength = 1024);
    String readLargeString(int address, int maxLength);
    void writeChar(int address, char value);
    char readChar(int address);
    bool writeBytes(int address, const uint8_t* value, int length);
    bool readBytes(int address, uint8_t* value, int length);
    void saveWiFiCredentials(int ssidAddress, int passwordAddress,
                             const char* ssid, const char* password);
    void getWiFiCredentials(int ssidAddress, int passwordAddress,
                            String& ssid, String& password);
    uint64_t getTimeStamp();
};
