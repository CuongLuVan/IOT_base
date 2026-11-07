#include "Memory.h"

#include <string.h>

#include "DebugInfo.h"
#include "Sync.h"

#if defined(ESP8266) && SUPPORT_RTOS
#include "EepromNvs.h"
#else
#include <EEPROM.h>
#endif

// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

namespace {
platform_sync::Mutex eepromMutex;
#if defined(ESP8266) && SUPPORT_RTOS
EepromNvs EEPROM;
#endif
}  // namespace

Memory* Memory::GetInstance()
{
    static Memory instance;
    return &instance;
}

bool Memory::begin(size_t size)
{
    if (size == 0) {
        DEVICE_LOG_ERROR("[Memory] Invalid EEPROM size");
        return false;
    }
    if (!eepromMutex.create()) {
        DEVICE_LOG_ERROR("[Memory] Could not create the EEPROM mutex");
        return false;
    }
    {
        platform_sync::ScopedLock lock(eepromMutex);
#if defined(ESP8266) && ESP8266_NONOS_CORE
        // The ESP8266 EEPROM.begin() returns void and clamps the size to one
        // flash sector, so read back what was granted.
        EEPROM.begin(size);
        size_ = static_cast<size_t>(EEPROM.length());
#else
        size_ = EEPROM.begin(size) ? size : 0;
#endif
    }
    if (size_ == 0) {
        DEVICE_LOG_ERROR("[Memory] EEPROM initialization failed");
        return false;
    }
    if (size_ < size) {
        DEVICE_LOGF_WARNING("[Memory] EEPROM provides only %u of %u bytes\n", static_cast<unsigned>(size_),
                            static_cast<unsigned>(size));
    }
    return true;
}

bool Memory::validRange(int address, size_t length) const
{
    return address >= 0 && static_cast<size_t>(address) <= size_ && length <= size_ - static_cast<size_t>(address);
}

bool Memory::validField(const StringField& field) const
{
    return field.value != nullptr && field.maxLength > 0 && validRange(field.address, field.maxLength + 1) &&
           strlen(field.value) <= field.maxLength;
}

// Caller holds eepromMutex and logs a failure after unlocking.
bool Memory::commit()
{
    return EEPROM.commit();
}

uint8_t Memory::readByte(int address)
{
    uint8_t value = 0;
    return readByte(address, value) ? value : 0;
}

bool Memory::readByte(int address, uint8_t& value)
{
    platform_sync::ScopedLock lock(eepromMutex);
    if (!validRange(address, 1)) return false;
    value = EEPROM.read(address);
    return true;
}

bool Memory::writeByte(int address, uint8_t value)
{
    return writeBytes(address, &value, 1);
}

bool Memory::readBytes(int address, uint8_t* data, size_t length)
{
    platform_sync::ScopedLock lock(eepromMutex);
    if (data == nullptr || !validRange(address, length)) return false;
    for (size_t i = 0; i < length; ++i) data[i] = EEPROM.read(address + static_cast<int>(i));
    return true;
}

bool Memory::writeBytes(int address, const uint8_t* data, size_t length)
{
    bool committed = false;
    {
        platform_sync::ScopedLock lock(eepromMutex);
        if (data == nullptr || !validRange(address, length)) return false;
        for (size_t i = 0; i < length; ++i) EEPROM.write(address + static_cast<int>(i), data[i]);
        committed = commit();
    }
    if (!committed) DEVICE_LOG_ERROR("[Memory] EEPROM commit failed");
    return committed;
}

bool Memory::stageBytes(int address, const uint8_t* data, size_t length)
{
    platform_sync::ScopedLock lock(eepromMutex);
    if (data == nullptr || !validRange(address, length)) return false;
    for (size_t i = 0; i < length; ++i) EEPROM.write(address + static_cast<int>(i), data[i]);
    return true;
}

bool Memory::commitPending()
{
    bool committed = false;
    {
        platform_sync::ScopedLock lock(eepromMutex);
        if (size_ == 0) return false;
        committed = commit();
    }
    if (!committed) DEVICE_LOG_ERROR("[Memory] EEPROM commit failed");
    return committed;
}

void Memory::restartSafely(uint32_t lockTimeoutMs)
{
    // Never unlocked: the chip restarts while no other task can write.
    const bool locked = eepromMutex.lock(lockTimeoutMs);
    if (!locked) {
        DEVICE_LOG_WARNING("[Memory] EEPROM busy; restarting without the lock");
    } else if (size_ != 0 && !commit()) {
        DEVICE_LOG_ERROR("[Memory] EEPROM commit before restart failed");
    }
    delay(100);
    ESP.restart();
    for (;;) delay(1000);
}

String Memory::readString(int address, size_t maxLength)
{
    platform_sync::ScopedLock lock(eepromMutex);
    String value;
    if (address < 0 || static_cast<size_t>(address) >= size_) return value;
    const size_t available = size_ - static_cast<size_t>(address);
    const size_t limit = maxLength < available ? maxLength : available;
    size_t length = 0;
    while (length < limit) {
        const uint8_t character = EEPROM.read(address + static_cast<int>(length));
        if (character == '\0' || character == 0xFF) break;
        ++length;
    }
    if (length == 0 || !value.reserve(length)) return value;
    for (size_t i = 0; i < length; ++i) value += static_cast<char>(EEPROM.read(address + static_cast<int>(i)));
    return value;
}

bool Memory::readString(int address, size_t maxLength, String& value)
{
    platform_sync::ScopedLock lock(eepromMutex);
    value = "";
    if (maxLength == 0 || !validRange(address, maxLength + 1)) return false;
    size_t length = 0;
    while (length <= maxLength && EEPROM.read(address + static_cast<int>(length)) != '\0') ++length;
    if (length > maxLength || !value.reserve(length)) return false;
    for (size_t i = 0; i < length; ++i) value += static_cast<char>(EEPROM.read(address + static_cast<int>(i)));
    return true;
}

bool Memory::writeString(int address, const char* value, size_t maxLength)
{
    const StringField field = {address, value, maxLength};
    return writeStrings(&field, 1);
}

bool Memory::writeString(int address, const String& value, size_t maxLength)
{
    return writeString(address, value.c_str(), maxLength);
}

bool Memory::validFields(const StringField* fields, size_t count) const
{
    for (size_t i = 0; i < count; ++i) {
        if (!validField(fields[i])) return false;
        const size_t start = static_cast<size_t>(fields[i].address);
        const size_t end = start + fields[i].maxLength + 1;
        for (size_t j = 0; j < i; ++j) {
            const size_t otherStart = static_cast<size_t>(fields[j].address);
            const size_t otherEnd = otherStart + fields[j].maxLength + 1;
            if (start < otherEnd && otherStart < end) return false;
        }
    }
    return true;
}

bool Memory::writeStrings(const StringField* fields, size_t count)
{
    if (fields == nullptr || count == 0) return false;
    bool valid = false;
    bool committed = false;
    {
        platform_sync::ScopedLock lock(eepromMutex);
        valid = validFields(fields, count);
        if (valid) {
            for (size_t i = 0; i < count; ++i) {
                const StringField& field = fields[i];
                const size_t length = strlen(field.value);
                for (size_t j = 0; j <= field.maxLength; ++j) {
                    EEPROM.write(field.address + static_cast<int>(j), j < length ? field.value[j] : '\0');
                }
            }
            committed = commit();
        }
    }
    if (!valid) {
        DEVICE_LOG_WARNING("[Memory] Refused an oversized, overlapping or out-of-range string write");
    } else if (!committed) {
        DEVICE_LOG_ERROR("[Memory] EEPROM commit failed");
    }
    return committed;
}

void Memory::readWifiCredentials(String& ssid, String& password)
{
    ssid = readString(EEPROM_ADDR_WIFI_SSID, WIFI_SSID_MAX_LENGTH);
    password = readString(EEPROM_ADDR_WIFI_PASS, WIFI_PASS_MAX_LENGTH);
}

bool Memory::writeWifiCredentials(const char* ssid, const char* password)
{
    const StringField fields[] = {
        {EEPROM_ADDR_WIFI_SSID, ssid, WIFI_SSID_MAX_LENGTH},
        {EEPROM_ADDR_WIFI_PASS, password, WIFI_PASS_MAX_LENGTH},
    };
    return writeStrings(fields, sizeof(fields) / sizeof(fields[0]));
}
