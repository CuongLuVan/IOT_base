#include "Memory.h"

#include <EEPROM.h>

#include "DebugInfo.h"

Memory* Memory::pinstance_ = nullptr;

Memory* Memory::GetInstance() {
    if (pinstance_ == nullptr) {
        pinstance_ = new Memory();
    }
    return pinstance_;
}

bool Memory::validRange(int address, int length) const {
    return address >= 0 && length >= 0 && size_ > 0 &&
           address <= size_ && length <= size_ - address;
}

void Memory::initEEPROM(int size) {
    if (size <= 0) {
        DEVICE_LOG_ERROR("[Memory] Invalid EEPROM size");
        return;
    }
    if (!EEPROM.begin(size)) {
        DEVICE_LOG_ERROR("[Memory] EEPROM initialization failed");
        size_ = 0;
        return;
    }
    size_ = size;
    lastTimestampMs_ = millis();
}

void Memory::writeInt(int address, int value) {
    if (validRange(address, sizeof(value))) {
        EEPROM.put(address, value);
        EEPROM.commit();
    }
}

int Memory::readInt(int address) {
    int value = 0;
    if (validRange(address, sizeof(value))) {
        EEPROM.get(address, value);
    }
    return value;
}

void Memory::writeLong(int address, long value) {
    if (validRange(address, sizeof(value))) {
        EEPROM.put(address, value);
        EEPROM.commit();
    }
}

long Memory::readLong(int address) {
    long value = 0;
    if (validRange(address, sizeof(value))) {
        EEPROM.get(address, value);
    }
    return value;
}

void Memory::writeDouble(int address, double value) {
    if (validRange(address, sizeof(value))) {
        EEPROM.put(address, value);
        EEPROM.commit();
    }
}

double Memory::readDouble(int address) {
    double value = 0;
    if (validRange(address, sizeof(value))) {
        EEPROM.get(address, value);
    }
    return value;
}

void Memory::writeString(int address, const char* value) {
    if (value == nullptr || address < 0 || address >= size_) {
        return;
    }
    const size_t length = strlen(value);
    if (length > static_cast<size_t>(size_ - address - 1)) {
        DEVICE_LOG_ERROR("[Memory] Refused out-of-range string write");
        return;
    }
    for (size_t index = 0; index < length; ++index) {
        EEPROM.write(address + index, value[index]);
    }
    EEPROM.write(address + length, '\0');
    EEPROM.commit();
}

void Memory::writeString(int address, const String& value) {
    writeString(address, value.c_str());
}

String Memory::readString(int address, int maxLength) {
    if (address < 0 || maxLength <= 0 || address >= size_) {
        return String();
    }
    const int available = size_ - address;
    const int limit = maxLength < available ? maxLength : available;
    String value;
    value.reserve(limit < 128 ? limit : 128);
    for (int index = 0; index < limit; ++index) {
        const char character = static_cast<char>(EEPROM.read(address + index));
        if (character == '\0' || static_cast<uint8_t>(character) == 0xFF) {
            break;
        }
        value += character;
    }
    return value;
}

String Memory::readLargeString(int address, int maxLength) {
    return readString(address, maxLength);
}

void Memory::writeChar(int address, char value) {
    if (validRange(address, 1)) {
        EEPROM.write(address, value);
        EEPROM.commit();
    }
}

char Memory::readChar(int address) {
    return validRange(address, 1) ? static_cast<char>(EEPROM.read(address)) : 0;
}

void Memory::saveWiFiCredentials(int ssidAddress, int passwordAddress,
                                 const char* ssid, const char* password) {
    writeString(ssidAddress, ssid);
    writeString(passwordAddress, password);
}

void Memory::getWiFiCredentials(int ssidAddress, int passwordAddress,
                                String& ssid, String& password) {
    ssid = readString(ssidAddress, 33);
    password = readString(passwordAddress, 64);
}

uint64_t Memory::getTimeStamp() {
    const uint32_t now = millis();
    timeStamp_ += static_cast<uint32_t>(now - lastTimestampMs_);
    lastTimestampMs_ = now;
    return timeStamp_;
}