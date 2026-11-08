#pragma once

// EEPROM access for both firmwares. Addresses and sizes live in eeprom_layout.h.
//
// Every access is bounds-checked against the size granted by begin(), and
// writes commit before returning, except stageBytes(): staged changes are
// saved by the next commitPending() (or any other write), so several settings
// cost one commit. Under SUPPORT_RTOS a mutex serialises the tasks that read
// and write (network setup pages, MQTT, SystemTask flushes); nothing is logged
// while it is held. EEPROM.write() marks the RAM copy dirty only for changed
// bytes and commit() skips a clean copy, so rewriting unchanged data does not
// wear the flash. The NON-OS core uses one flash sector; esp8266RTOS has no
// EEPROM library, so EepromNvs.h provides the same API on NVS.
//
#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "define_All.h"

class Memory {
public:
    // One string region of a batch write.
    struct StringField {
        int address;
        const char* value;
        size_t maxLength;  // Without the '\0'; the region is maxLength + 1 bytes.
    };

    // Created on the first call; setup() calls it (begin()) before any task starts.
    static Memory* GetInstance();

    Memory(const Memory&) = delete;
    Memory& operator=(const Memory&) = delete;

    // Opens the EEPROM RAM copy. false (and every later access fails) when the
    // core cannot provide it; the caller decides how to continue.
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

    // Updates the RAM copy only; false when out of range.
    bool stageBytes(int address, const uint8_t* data, size_t length);
    // Commits every staged change (no flash write when nothing changed).
    bool commitPending();

    // Restarts the chip while holding the EEPROM lock, after committing the
    // staged changes, so no task is between erase and write of the flash copy.
    // Waits at most lockTimeoutMs for a write in progress, then restarts anyway.
    static constexpr uint32_t kRestartLockTimeoutMs = 2000;
    [[noreturn]] void restartSafely(uint32_t lockTimeoutMs = kRestartLockTimeoutMs);

    // Reads up to maxLength characters; '\0' or an erased cell (0xFF) ends the
    // string. Allocates the String once, at the stored length.
    String readString(int address, size_t maxLength);
    // Strict variant for credentials: false (and value empty) unless a '\0'
    // terminates the string within maxLength + 1 bytes.
    bool readString(int address, size_t maxLength, String& value);

    // Writes value and zero-fills the rest of the maxLength + 1 byte region, so
    // a shorter secret leaves no bytes of the previous one behind. false when
    // value does not fit; nothing is written then.
    bool writeString(int address, const char* value, size_t maxLength);
    bool writeString(int address, const String& value, size_t maxLength);
    // All fields or none, with a single commit. Fields must not overlap.
    bool writeStrings(const StringField* fields, size_t count);

    // EEPROM_ADDR_WIFI_SSID / EEPROM_ADDR_WIFI_PASS.
    void readWifiCredentials(String& ssid, String& password);
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
