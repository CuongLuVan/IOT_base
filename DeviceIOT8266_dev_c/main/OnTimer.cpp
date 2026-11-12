// Logic copied unchanged from DeviceIOT8266.

#include "OnTimer.h"

#include "Platform.h"

#include "ByteCodec.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "Sync.h"
#include "define_All.h"

static_assert(ON_TIMER_EEPROM_SIZE == le32::kSize, "on-timer stores a uint32");

namespace {
// set() runs in the network task, stage() in SystemTask.
platform_sync::AtomicU32 timerSeconds;
platform_sync::DirtyFlag dirty;
}  // namespace

void OnTimer::setup()
{
    uint8_t bytes[le32::kSize];
    uint32_t value = 0;
    if (Memory::GetInstance()->readBytes(ON_TIMER_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        value = le32::decode(bytes);
    }
    // Blank (0xFFFFFFFF) or corrupt bytes leave the timer off; nothing is
    // written until a new value is set.
    if (!on_timer::isValid(value)) value = 0;
    timerSeconds.store(value);
    (void)dirty.takeIfSet();
    DEVICE_LOGF_INFO("[OnTimer] Auto OFF after %lu s (0 = off), EEPROM %d..%d\n", static_cast<unsigned long>(value),
                     ON_TIMER_EEPROM_ADDRESS, ON_TIMER_EEPROM_END - 1);
}

bool OnTimer::set(uint32_t seconds)
{
    if (!on_timer::isValid(seconds)) return false;
    // Value before flag, so stage() never saves an older value and clears it.
    if (timerSeconds.exchange(seconds) != seconds) dirty.set();
    return true;
}

uint32_t OnTimer::seconds()
{
    return timerSeconds.load();
}

bool OnTimer::stage()
{
    if (!dirty.takeIfSet()) return false;
    uint8_t bytes[le32::kSize];
    le32::encode(timerSeconds.load(), bytes);
    if (!Memory::GetInstance()->stageBytes(ON_TIMER_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        DEVICE_LOG_ERROR("[OnTimer] EEPROM region unavailable; value not saved");
        return false;
    }
    DEVICE_LOGF_DEBUG("[OnTimer] Staged %lu s for EEPROM\n", static_cast<unsigned long>(le32::decode(bytes)));
    return true;
}
