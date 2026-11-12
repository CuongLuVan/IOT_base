#include "Memory.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "DebugInfo.h"
#include "Platform.h"
#include "Sync.h"
#include "nvs.h"
#include "nvs_flash.h"

namespace {

// NVS namespace of the image blobs.
const char* const kNvsNamespace = "eeprom";
// At most 32 chunks (dirty bits of a uint32_t).
constexpr size_t kMaxChunks = 32;

// The EEPROM image in RAM, persisted as NVS blobs "eeprom0", "eeprom1", ...
class NvsImage {
public:
    bool begin(size_t size)
    {
        if (data_ != nullptr) return size == size_;
        if (size == 0 || chunkCount(size) > kMaxChunks) return false;
        if (nvs_open(kNvsNamespace, NVS_READWRITE, &handle_) != ESP_OK) return false;
        data_ = static_cast<uint8_t*>(malloc(size));
        if (data_ == nullptr) {
            nvs_close(handle_);
            return false;
        }
        // An erased EEPROM reads 0xFF; the modules treat that as "blank".
        memset(data_, 0xFF, size);
        size_ = size;
        for (size_t chunk = 0; chunk < chunkCount(size_); ++chunk) loadChunk(chunk);
        dirtyMask_ = 0;
        return true;
    }

    size_t length() const
    {
        return size_;
    }

    uint8_t read(int address) const
    {
        return data_ != nullptr && address >= 0 && static_cast<size_t>(address) < size_ ? data_[address] : 0;
    }

    void write(int address, uint8_t value)
    {
        if (data_ == nullptr || address < 0 || static_cast<size_t>(address) >= size_) return;
        if (data_[address] == value) return;
        data_[address] = value;
        dirtyMask_ |= 1u << (static_cast<size_t>(address) / Memory::kChunkSize);
    }

    bool commit()
    {
        if (data_ == nullptr) return false;
        if (dirtyMask_ == 0) return true;
        uint32_t written = 0;
        for (size_t chunk = 0; chunk < chunkCount(size_); ++chunk) {
            if ((dirtyMask_ & (1u << chunk)) == 0) continue;
            char key[16];
            chunkKey(chunk, key, sizeof(key));
            if (nvs_set_blob(handle_, key, data_ + chunk * Memory::kChunkSize, chunkLength(chunk)) != ESP_OK) {
                break;
            }
            written |= 1u << chunk;
        }
        if (written == 0 || nvs_commit(handle_) != ESP_OK) return false;
        dirtyMask_ &= ~written;
        return dirtyMask_ == 0;
    }

private:
    static size_t chunkCount(size_t size)
    {
        return (size + Memory::kChunkSize - 1) / Memory::kChunkSize;
    }

    size_t chunkLength(size_t chunk) const
    {
        const size_t start = chunk * Memory::kChunkSize;
        return size_ - start < Memory::kChunkSize ? size_ - start : Memory::kChunkSize;
    }

    static void chunkKey(size_t chunk, char* key, size_t size)
    {
        snprintf(key, size, "eeprom%u", static_cast<unsigned>(chunk));
    }

    // First boot: no blob, the chunk stays 0xFF. A blob of another length
    // (EEPROM_SIZE changed) keeps its common part.
    void loadChunk(size_t chunk)
    {
        char key[16];
        chunkKey(chunk, key, sizeof(key));
        size_t stored = 0;
        if (nvs_get_blob(handle_, key, nullptr, &stored) != ESP_OK || stored == 0) return;
        uint8_t* buffer = static_cast<uint8_t*>(malloc(stored));
        if (buffer == nullptr) return;
        if (nvs_get_blob(handle_, key, buffer, &stored) == ESP_OK) {
            const size_t length = chunkLength(chunk);
            memcpy(data_ + chunk * Memory::kChunkSize, buffer, stored < length ? stored : length);
        }
        free(buffer);
    }

    nvs_handle handle_ = 0;
    uint8_t* data_ = nullptr;
    size_t size_ = 0;
    uint32_t dirtyMask_ = 0;
};

platform_sync::Mutex eepromMutex;
NvsImage EEPROM;

bool initNvsFlash()
{
    esp_err_t result = nvs_flash_init();
#ifdef ESP_ERR_NVS_NEW_VERSION_FOUND
    if (result == ESP_ERR_NVS_NO_FREE_PAGES || result == ESP_ERR_NVS_NEW_VERSION_FOUND) {
#else
    if (result == ESP_ERR_NVS_NO_FREE_PAGES) {
#endif
        DEVICE_LOG_WARNING("[Memory] NVS partition is full or outdated; erasing it");
        if (nvs_flash_erase() != ESP_OK) return false;
        result = nvs_flash_init();
    }
    return result == ESP_OK;
}

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
    if (!initNvsFlash()) {
        DEVICE_LOG_ERROR("[Memory] NVS flash initialization failed");
        return false;
    }
    {
        platform_sync::ScopedLock lock(eepromMutex);
        size_ = EEPROM.begin(size) ? size : 0;
    }
    if (size_ == 0) {
        DEVICE_LOG_ERROR("[Memory] EEPROM (NVS image) initialization failed");
        return false;
    }
    DEVICE_LOGF_INFO("[Memory] EEPROM image of %u bytes loaded from NVS\n", static_cast<unsigned>(size_));
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
    delayMs(100);
    deviceRestartNow();
}

std::string Memory::readString(int address, size_t maxLength)
{
    platform_sync::ScopedLock lock(eepromMutex);
    std::string value;
    if (address < 0 || static_cast<size_t>(address) >= size_) return value;
    const size_t available = size_ - static_cast<size_t>(address);
    const size_t limit = maxLength < available ? maxLength : available;
    size_t length = 0;
    while (length < limit) {
        const uint8_t character = EEPROM.read(address + static_cast<int>(length));
        if (character == '\0' || character == 0xFF) break;
        ++length;
    }
    value.reserve(length);
    for (size_t i = 0; i < length; ++i) value += static_cast<char>(EEPROM.read(address + static_cast<int>(i)));
    return value;
}

bool Memory::readString(int address, size_t maxLength, std::string& value)
{
    platform_sync::ScopedLock lock(eepromMutex);
    value.clear();
    if (maxLength == 0 || !validRange(address, maxLength + 1)) return false;
    size_t length = 0;
    while (length <= maxLength && EEPROM.read(address + static_cast<int>(length)) != '\0') ++length;
    if (length > maxLength) return false;
    value.reserve(length);
    for (size_t i = 0; i < length; ++i) value += static_cast<char>(EEPROM.read(address + static_cast<int>(i)));
    return true;
}

bool Memory::writeString(int address, const char* value, size_t maxLength)
{
    const StringField field = {address, value, maxLength};
    return writeStrings(&field, 1);
}

bool Memory::writeString(int address, const std::string& value, size_t maxLength)
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
                    EEPROM.write(field.address + static_cast<int>(j),
                                 static_cast<uint8_t>(j < length ? field.value[j] : '\0'));
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

void Memory::readWifiCredentials(std::string& ssid, std::string& password)
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
