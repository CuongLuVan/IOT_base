#include "Memory.h"
#include <cstring>
#include <chrono>

Memory* Memory::GetInstance() {
    static Memory instance;
    return &instance;
}

Memory::Memory() {
#if SIMULATION_MODE
    startTime = 0;
    time_stamp = 0;
#endif
}

Memory::~Memory() {}

void Memory::initStorage(int size) {
#if SIMULATION_MODE
    _size = size;
    loadFromDisk();
#else
    _size = size;
    EEPROM.begin(size);
#endif
}

#if SIMULATION_MODE
void Memory::loadFromDisk() {
    storage.clear();
    std::ifstream in(storageFile, std::ios::binary);
    if (!in.is_open()) return;
    while (true) {
        int addr;
        uint8_t b;
        in.read(reinterpret_cast<char*>(&addr), sizeof(addr));
        if (!in) break;
        in.read(reinterpret_cast<char*>(&b), 1);
        if (!in) break;
        storage[addr] = b;
    }
}

void Memory::saveToDisk() {
    std::ofstream out(storageFile, std::ios::binary | std::ios::trunc);
    if (!out.is_open()) return;
    for (auto &p : storage) {
        out.write(reinterpret_cast<const char*>(&p.first), sizeof(p.first));
        out.write(reinterpret_cast<const char*>(&p.second), 1);
    }
}

static uint8_t readByteFromMap(const std::map<int, uint8_t>& m, int addr) {
    auto it = m.find(addr);
    return it != m.end() ? it->second : 0;
}
#endif

void Memory::writeInt(int address, int value) {
#if SIMULATION_MODE
    for (int i = 0; i < 4; i++) {
        storage[address + i] = static_cast<uint8_t>((value >> (i * 8)) & 0xFF);
    }
    saveToDisk();
#else
    EEPROM.writeInt(address, value);
    EEPROM.commit();
#endif
}

int Memory::readInt(int address) {
#if SIMULATION_MODE
    int result = 0;
    for (int i = 0; i < 4; i++) {
        result |= (static_cast<int>(readByteFromMap(storage, address + i)) << (i * 8));
    }
    return result;
#else
    return EEPROM.readInt(address);
#endif
}

void Memory::writeLong(int address, long value) {
#if SIMULATION_MODE
    for (int i = 0; i < (int)sizeof(long); i++) {
        storage[address + i] = static_cast<uint8_t>((value >> (i * 8)) & 0xFF);
    }
    saveToDisk();
#else
    EEPROM.writeLong(address, value);
    EEPROM.commit();
#endif
}

long Memory::readLong(int address) {
#if SIMULATION_MODE
    long result = 0;
    for (int i = 0; i < (int)sizeof(long); i++) {
        result |= (static_cast<long>(readByteFromMap(storage, address + i)) << (i * 8));
    }
    return result;
#else
    return EEPROM.readLong(address);
#endif
}

void Memory::writeDouble(int address, double value) {
#if SIMULATION_MODE
    uint64_t tmp;
    static_assert(sizeof(tmp) == sizeof(value), "size mismatch");
    std::memcpy(&tmp, &value, sizeof(value));
    for (int i = 0; i < (int)sizeof(tmp); i++) {
        storage[address + i] = static_cast<uint8_t>((tmp >> (i * 8)) & 0xFF);
    }
    saveToDisk();
#else
    EEPROM.writeDouble(address, value);
    EEPROM.commit();
#endif
}

double Memory::readDouble(int address) {
#if SIMULATION_MODE
    uint64_t tmp = 0;
    for (int i = 0; i < (int)sizeof(tmp); i++) {
        tmp |= (static_cast<uint64_t>(readByteFromMap(storage, address + i)) << (i * 8));
    }
    double result;
    std::memcpy(&result, &tmp, sizeof(result));
    return result;
#else
    return EEPROM.readDouble(address);
#endif
}

void Memory::writeString(int address, const std::string &str) {
#if SIMULATION_MODE
    int i = 0;
    for (; i < (int)str.size(); i++) {
        storage[address + i] = static_cast<uint8_t>(str[i]);
    }
    storage[address + i] = '\0';
    saveToDisk();
#else
    const char* c = str.c_str();
    int len = strlen(c);
    for (int i = 0; i < len; i++) {
        EEPROM.write(address + i, c[i]);
    }
    EEPROM.write(address + len, '\0');
    EEPROM.commit();
#endif
}

std::string Memory::readString(int address, int maxLen) {
#if SIMULATION_MODE
    std::string out;
    for (int i = 0; i < maxLen; i++) {
        uint8_t c = readByteFromMap(storage, address + i);
        if (c == '\0') break;
        out += static_cast<char>(c);
    }
    return out;
#else
    char buffer[1025];
    int len = 0;
    while (len < maxLen && len < 1024) {
        char c = EEPROM.read(address + len);
        if (c == '\0') break;
        buffer[len++] = c;
    }
    buffer[len] = '\0';
    return std::string(buffer);
#endif
}

void Memory::writeChar(int address, char value) {
#if SIMULATION_MODE
    storage[address] = static_cast<uint8_t>(value);
    saveToDisk();
#else
    EEPROM.write(address, value);
    EEPROM.commit();
#endif
}

char Memory::readChar(int address) {
#if SIMULATION_MODE
    return static_cast<char>(readByteFromMap(storage, address));
#else
    return EEPROM.read(address);
#endif
}

void Memory::saveWiFiCredentials(int ssidAddr, int passAddr, const std::string &ssid, const std::string &pass) {
    writeString(ssidAddr, ssid);
    writeString(passAddr, pass);
}

void Memory::getWiFiCredentials(int ssidAddr, int passAddr, std::string &ssid, std::string &pass) {
    ssid = readString(ssidAddr);
    pass = readString(passAddr);
}

static uint64_t getCurrentMillis() {
#if SIMULATION_MODE
    // Simulation mode: use high-resolution clock (cross-platform C++), as replacement for std::time(nullptr)
    auto now = std::chrono::high_resolution_clock::now();
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()).count();
    return static_cast<uint64_t>(ms);
#else
    // ESP32/Arduino: millis() provides ms uptime
    return static_cast<uint64_t>(millis());
#endif
}

uint64_t Memory::getTimeStamp() {
    uint64_t curr = getCurrentMillis();
    if (startTime == 0) {
        startTime = static_cast<uint32_t>(curr);
    }
    time_stamp += (curr - startTime);
    startTime = static_cast<uint32_t>(curr);
    return time_stamp;
}
