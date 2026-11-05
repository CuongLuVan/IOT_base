#include "OnTimer.h"

#include <Arduino.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "define_All.h"

static_assert(ON_TIMER_EEPROM_SIZE == on_timer::kStorageSize, "on-timer stores a uint32");

namespace {
// set() runs in the MQTT callback, flush() in SystemTask; aligned 32-bit and
// bool accesses are atomic on the lx106.
volatile uint32_t timerSeconds = 0;
volatile bool dirty = false;
} // namespace

void OnTimer::setup()
{
    uint8_t bytes[on_timer::kStorageSize];
    uint32_t value = 0;
    if (Memory::GetInstance()->readBytes(ON_TIMER_EEPROM_ADDRESS, bytes, static_cast<int>(sizeof(bytes)))) {
        value = on_timer::decode(bytes);
    }
    // Blank (0xFFFFFFFF) or corrupt bytes leave the timer off; nothing is
    // written until a new value is set.
    if (!on_timer::isValid(value)) value = 0;
    timerSeconds = value;
    dirty = false;
    DEVICE_LOG_INFO(String("[OnTimer] Auto OFF after ") + value + " s (0 = off), EEPROM " +
                    ON_TIMER_EEPROM_ADDRESS + ".." + (ON_TIMER_EEPROM_ADDRESS + ON_TIMER_EEPROM_SIZE - 1));
}

bool OnTimer::set(uint32_t seconds)
{
    if (!on_timer::isValid(seconds)) return false;
    if (timerSeconds == seconds) return true;
    // Value before flag, so flush() never saves an older value and clears it.
    timerSeconds = seconds;
    dirty = true;
    return true;
}

uint32_t OnTimer::seconds()
{
    return timerSeconds;
}

void OnTimer::flush()
{
    if (!dirty) return;
    dirty = false;
    uint8_t bytes[on_timer::kStorageSize];
    on_timer::encode(timerSeconds, bytes);
    if (!Memory::GetInstance()->writeBytes(ON_TIMER_EEPROM_ADDRESS, bytes, static_cast<int>(sizeof(bytes)))) {
        dirty = true;
        DEVICE_LOG_ERROR("[OnTimer] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG(String("[OnTimer] Saved ") + on_timer::decode(bytes) + " s to EEPROM");
}
