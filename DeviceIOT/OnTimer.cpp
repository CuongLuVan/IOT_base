#include "OnTimer.h"

#include <Arduino.h>
#include <atomic>

#include "DebugInfo.h"
#include "Memory.h"
#include "define_All.h"

static_assert(ON_TIMER_EEPROM_SIZE == on_timer::kStorageSize, "on-timer stores a uint32");

namespace {
std::atomic<uint32_t> timerSeconds{0};
std::atomic<bool> dirty{false};
}

void OnTimer::setup()
{
    uint8_t bytes[on_timer::kStorageSize];
    uint32_t value = 0;
    if (Memory::GetInstance()->readBytes(ON_TIMER_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        value = on_timer::decode(bytes);
    }
    // Blank (0xFFFFFFFF) or corrupt bytes leave the timer off; nothing is
    // written until a new value is set.
    if (!on_timer::isValid(value)) value = 0;
    timerSeconds.store(value);
    dirty.store(false);
    DEVICE_LOG_INFO("[OnTimer] Auto OFF after " + String(value) + " s (0 = off), EEPROM " +
                    String(ON_TIMER_EEPROM_ADDRESS) + ".." + String(ON_TIMER_EEPROM_ADDRESS + ON_TIMER_EEPROM_SIZE - 1));
}

bool OnTimer::set(uint32_t seconds)
{
    if (!on_timer::isValid(seconds)) return false;
    // Value before flag, so flush() never saves an older value and clears it.
    if (timerSeconds.exchange(seconds) != seconds) dirty.store(true);
    return true;
}

uint32_t OnTimer::seconds()
{
    return timerSeconds.load();
}

void OnTimer::flush()
{
    if (!dirty.exchange(false)) return;
    uint8_t bytes[on_timer::kStorageSize];
    on_timer::encode(timerSeconds.load(), bytes);
    if (!Memory::GetInstance()->writeBytes(ON_TIMER_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        dirty.store(true);
        DEVICE_LOG_INFO("[OnTimer] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG("[OnTimer] Saved " + String(on_timer::decode(bytes)) + " s to EEPROM");
}
