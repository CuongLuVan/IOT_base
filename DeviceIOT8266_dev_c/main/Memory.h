#pragma once

// EEPROM-compatible storage. Addresses and sizes live in eeprom_layout.h and
// are the same as DeviceIOT8266, so every module keeps its byte layout.
//
// ESP8266_RTOS_SDK has no EEPROM library: a RAM image of EEPROM_SIZE bytes is
// kept in NVS (namespace "eeprom"), split into blobs of kChunkSize bytes
// (NVS blobs must stay well below one 4 KB page). write() marks a chunk dirty
// only when one of its bytes changes, and commit() rewrites only dirty chunks,
// so rewriting unchanged data does not wear the flash. Each nvs_set_blob() is
// atomic: a reset during a commit keeps the previous copy of that chunk.
//
// Every access is bounds-checked against the size granted by begin(), and
// writes commit before returning, except stageBytes(): staged changes are
// saved by the next commitPending() (or any other write), so several settings
// cost one commit. A mutex serialises the tasks that read and write (network
// setup pages, MQTT, SystemTask flushes); nothing is logged while it is held.

#include <stddef.h>
#include <stdint.h>
#include <string>

#include "define_All.h"

class Memory {
public:
    // One string region of a batch write.
    struct StringField {
        int address;
        const char* value;
        size_t maxLength;  // Without the '\0'; the region is maxLength + 1 bytes.
    };

    static constexpr size_t kChunkSize = 1024;

    // Created on the first call; app_main() calls begin() before any task starts.
    static Memory* GetInstance();

    Memory(const Memory&) = delete;
    Memory& operator=(const Memory&) = delete;

    // Opens NVS and loads the image. false (and every later access fails)
    // when NVS is unavailable; the caller decides how to continue.
    bool begin(size_t size);
    size_t size() const
    {
        return size_;
    }

    // 0 when the address is out of range; the second form tells them apart.
    uint8_t readByte(int address);
    bool readByte(int address, uint8_t& value);
    bool writeByte(int address, uint8_t value);

    bool readBytes(int address, uint8_t* data, size_t length);
    bool writeBytes(int address, const uint8_t* data, size_t length);

    // Updates the RAM image only; false when out of range.
    bool stageBytes(int address, const uint8_t* data, size_t length);
    // Commits every staged change (no flash write when nothing changed).
    bool commitPending();

    // Restarts the chip while holding the EEPROM lock, after committing the
    // staged changes, so no task is in the middle of an NVS commit. Waits at
    // most lockTimeoutMs for a write in progress, then restarts anyway.
    static constexpr uint32_t kRestartLockTimeoutMs = 2000;
    [[noreturn]] void restartSafely(uint32_t lockTimeoutMs = kRestartLockTimeoutMs);

    // Reads up to maxLength characters; '\0' or an erased cell (0xFF) ends the string.
    std::string readString(int address, size_t maxLength);
    // Strict variant for credentials: false (and value empty) unless a '\0'
    // terminates the string within maxLength + 1 bytes.
    bool readString(int address, size_t maxLength, std::string& value);

    // Writes value and zero-fills the rest of the maxLength + 1 byte region, so
    // a shorter secret leaves no bytes of the previous one behind. false when
    // value does not fit; nothing is written then.
    bool writeString(int address, const char* value, size_t maxLength);
    bool writeString(int address, const std::string& value, size_t maxLength);
    // All fields or none, with a single commit. Fields must not overlap.
    bool writeStrings(const StringField* fields, size_t count);

    // EEPROM_ADDR_WIFI_SSID / EEPROM_ADDR_WIFI_PASS.
    void readWifiCredentials(std::string& ssid, std::string& password);
    bool writeWifiCredentials(const char* ssid, const char* password);

private:
    Memory() = default;
    ~Memory() = default;

    bool validRange(int address, size_t length) const;
    bool validField(const StringField& field) const;
    bool validFields(const StringField* fields, size_t count) const;
    bool commit();

    size_t size_ = 0;
};
