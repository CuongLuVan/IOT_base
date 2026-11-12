// Logic copied unchanged from DeviceIOT8266.

#include "Countdown.h"

#include "Platform.h"

#include "ByteCodec.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "Sync.h"
#include "define_All.h"

static_assert(COUNTDOWN_EEPROM_SIZE == le32::kSize, "countdown stores a uint32");

namespace {
// The network task (start / cancel) and TaskDevice (takeExpired) share the timer.
countdown::Timer timer;
platform_sync::Mutex timerMutex;
// Written by the network task, saved by SystemTask.
platform_sync::AtomicU32 lastStarted;
platform_sync::DirtyFlag dirty;
}  // namespace

void Countdown::setup()
{
    if (!timerMutex.create()) {
        DEVICE_LOG_ERROR("[Countdown] Cannot create mutex; countdown disabled");
    }
    uint8_t bytes[le32::kSize];
    uint32_t value = 0;
    if (Memory::GetInstance()->readBytes(COUNTDOWN_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        value = le32::decode(bytes);
    }
    // Blank (0xFFFFFFFF) or corrupt bytes: no last value.
    if (!countdown::isValid(value)) value = 0;
    lastStarted.store(value);
    (void)dirty.takeIfSet();
    DEVICE_LOGF_INFO("[Countdown] Last countdown %lu s, EEPROM %d..%d\n", static_cast<unsigned long>(value),
                     COUNTDOWN_EEPROM_ADDRESS, COUNTDOWN_EEPROM_END - 1);
}

bool Countdown::start(uint32_t seconds, uint8_t mask)
{
    if (seconds == 0 || !countdown::isValid(seconds) || mask == 0) return false;
    {
        platform_sync::ScopedLock lock(timerMutex);
        if (!lock.locked()) return false;
        timer.start(seconds, mask, millis());
    }
    // Value before flag, so stage() never saves an older value and clears it.
    if (lastStarted.exchange(seconds) != seconds) dirty.set();
    return true;
}

void Countdown::cancel()
{
    platform_sync::ScopedLock lock(timerMutex);
    if (lock.locked()) timer.cancel();
}

uint8_t Countdown::takeExpired()
{
    platform_sync::ScopedLock lock(timerMutex);
    return lock.locked() ? timer.poll(millis()) : 0;
}

uint32_t Countdown::remaining()
{
    platform_sync::ScopedLock lock(timerMutex);
    return lock.locked() ? timer.remaining(millis()) : 0;
}

uint8_t Countdown::mask()
{
    platform_sync::ScopedLock lock(timerMutex);
    return lock.locked() ? timer.mask() : 0;
}

uint32_t Countdown::lastSeconds()
{
    return lastStarted.load();
}

bool Countdown::stage()
{
    if (!dirty.takeIfSet()) return false;
    uint8_t bytes[le32::kSize];
    le32::encode(lastStarted.load(), bytes);
    if (!Memory::GetInstance()->stageBytes(COUNTDOWN_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        DEVICE_LOG_ERROR("[Countdown] EEPROM region unavailable; value not saved");
        return false;
    }
    DEVICE_LOGF_DEBUG("[Countdown] Staged %lu s for EEPROM\n", static_cast<unsigned long>(le32::decode(bytes)));
    return true;
}
