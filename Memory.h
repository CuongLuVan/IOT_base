#ifndef MEMORY_H
#define MEMORY_H

#include "Config.h"

#if SIMULATION_MODE
#include <cstdint>
#include <map>
#include <fstream>
#include <string>
#else
#include <Arduino.h>
#include <EEPROM.h>
#endif

class Memory {
public:
    static Memory* GetInstance();

    void initStorage(int size);

    void writeInt(int address, int value);
    int readInt(int address);

    void writeLong(int address, long value);
    long readLong(int address);

    void writeDouble(int address, double value);
    double readDouble(int address);

    void writeString(int address, const std::string& str);
    std::string readString(int address, int maxLen = 1024);

    void writeChar(int address, char value);
    char readChar(int address);

    void saveWiFiCredentials(int ssidAddr, int passAddr, const std::string& ssid, const std::string& pass);
    void getWiFiCredentials(int ssidAddr, int passAddr, std::string &ssid, std::string &pass);

    uint64_t getTimeStamp();

private:
    Memory();
    ~Memory();

    Memory(const Memory&) = delete;
    Memory& operator=(const Memory&) = delete;

#if SIMULATION_MODE
    void loadFromDisk();
    void saveToDisk();

    std::map<int, uint8_t> storage;
    std::string storageFile = "memory_store.bin";
    int _size = 0;
    uint64_t time_stamp = 0;
    uint32_t startTime = 0;
#else
    int _size = 0;
    uint64_t time_stamp = 0;
    uint32_t startTime = 0;
#endif
};

#endif // MEMORY_H