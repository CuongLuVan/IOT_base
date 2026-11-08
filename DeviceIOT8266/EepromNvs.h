#pragma once

// EEPROM-compatible RAM copy stored in NVS, for the esp8266RTOS core (it has
// no EEPROM library). Same EEPROM-compatible behavior: one blob
// "eeprom" in namespace "eeprom"; write() marks the copy dirty only when a
// byte changes and commit() rewrites the blob only when dirty. NVS writes are
// atomic, so a reset during commit() keeps the previous copy.
// nvs_flash_init() is called by the core before setup() (initArduino()).
//
// Used by Memory.cpp only when defined(ESP8266) && SUPPORT_RTOS.

#include <nvs.h>
#include <nvs_flash.h>
#include <stddef.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

class EepromNvs {
public:
    bool begin(size_t size)
    {
        if (data_ != nullptr) return size == size_;
        if (size == 0) return false;
        if (nvs_open(kNamespace, NVS_READWRITE, &handle_) != ESP_OK) return false;
        data_ = static_cast<uint8_t*>(malloc(size));
        if (data_ == nullptr) {
            nvs_close(handle_);
            return false;
        }
        memset(data_, 0xFF, size);
        size_ = size;
        loadStored();
        dirty_ = false;
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
        dirty_ = true;
    }

    bool commit()
    {
        if (data_ == nullptr) return false;
        if (!dirty_) return true;
        if (nvs_set_blob(handle_, kKey, data_, size_) != ESP_OK || nvs_commit(handle_) != ESP_OK) return false;
        dirty_ = false;
        return true;
    }

private:
    static constexpr const char* kNamespace = "eeprom";
    static constexpr const char* kKey = "eeprom";

    // Copies the stored blob (first boot: none, the copy stays 0xFF). A blob
    // of another size keeps its common part.
    void loadStored()
    {
        size_t stored = 0;
        if (nvs_get_blob(handle_, kKey, nullptr, &stored) != ESP_OK || stored == 0) return;
        if (stored <= size_) {
            (void)nvs_get_blob(handle_, kKey, data_, &stored);
            return;
        }
        uint8_t* buffer = static_cast<uint8_t*>(malloc(stored));
        if (buffer == nullptr) return;
        if (nvs_get_blob(handle_, kKey, buffer, &stored) == ESP_OK) memcpy(data_, buffer, size_);
        free(buffer);
    }

    nvs_handle_t handle_ = 0;
    uint8_t* data_ = nullptr;
    size_t size_ = 0;
    bool dirty_ = false;
};
