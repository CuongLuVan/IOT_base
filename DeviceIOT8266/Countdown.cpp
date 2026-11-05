#include "Countdown.h"

#include <Arduino.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "OnTimer.h"
#include "PlatformCompat.h"
#include "define_All.h"

static_assert(COUNTDOWN_EEPROM_SIZE == on_timer::kStorageSize, "countdown stores a uint32");

namespace {
countdown::Timer timer;
// Written by the MQTT callback, read by SystemTask; aligned 32-bit and bool
// accesses are atomic on the lx106.
volatile uint32_t lastStarted = 0;
volatile bool dirty = false;

#if SUPPORT_RTOS
// The MQTT callback (TaskNetwork) and TaskDevice share the timer.
SemaphoreHandle_t timerMutex = nullptr;

bool createLock()
{
    if (timerMutex == nullptr) timerMutex = xSemaphoreCreateMutex();
    return timerMutex != nullptr;
}

class TimerLock {
public:
    TimerLock()
        : locked_(timerMutex != nullptr && xSemaphoreTake(timerMutex, portMAX_DELAY) == pdTRUE) {}
    ~TimerLock()
    {
        if (locked_) xSemaphoreGive(timerMutex);
    }
    bool locked() const { return locked_; }

private:
    bool locked_;
};
#else
// NON-OS core: the MQTT callback and TaskDevice both run from loop().
bool createLock()
{
    return true;
}

class TimerLock {
public:
    bool locked() const { return true; }
};
#endif
} // namespace

void Countdown::setup()
{
    if (!createLock()) {
        DEVICE_LOG_ERROR("[Countdown] Cannot create mutex; countdown disabled");
    }
    uint8_t bytes[COUNTDOWN_EEPROM_SIZE];
    uint32_t value = 0;
    if (Memory::GetInstance()->readBytes(COUNTDOWN_EEPROM_ADDRESS, bytes, static_cast<int>(sizeof(bytes)))) {
        value = on_timer::decode(bytes);
    }
    // Blank (0xFFFFFFFF) or corrupt bytes: no last value.
    if (value == 0 || !countdown::isValid(value)) value = 0;
    lastStarted = value;
    dirty = false;
    DEVICE_LOG_INFO(String("[Countdown] Last countdown ") + value + " s, EEPROM " +
                    COUNTDOWN_EEPROM_ADDRESS + ".." + (COUNTDOWN_EEPROM_END - 1));
}

bool Countdown::start(uint32_t seconds, uint8_t mask)
{
    if (seconds == 0 || !countdown::isValid(seconds) || mask == 0) return false;
    {
        TimerLock lock;
        if (!lock.locked()) return false;
        timer.start(seconds, mask, millis());
    }
    if (lastStarted != seconds) {
        // Value before flag, so flush() never saves an older value and clears it.
        lastStarted = seconds;
        dirty = true;
    }
    return true;
}

void Countdown::cancel()
{
    TimerLock lock;
    if (lock.locked()) timer.cancel();
}

uint8_t Countdown::takeExpired()
{
    TimerLock lock;
    return lock.locked() ? timer.poll(millis()) : 0;
}

uint32_t Countdown::remaining()
{
    TimerLock lock;
    return lock.locked() ? timer.remaining(millis()) : 0;
}

uint8_t Countdown::mask()
{
    TimerLock lock;
    return lock.locked() ? timer.mask() : 0;
}

uint32_t Countdown::lastSeconds()
{
    return lastStarted;
}

void Countdown::flush()
{
    if (!dirty) return;
    dirty = false;
    uint8_t bytes[COUNTDOWN_EEPROM_SIZE];
    on_timer::encode(lastStarted, bytes);
    if (!Memory::GetInstance()->writeBytes(COUNTDOWN_EEPROM_ADDRESS, bytes, static_cast<int>(sizeof(bytes)))) {
        dirty = true;
        DEVICE_LOG_ERROR("[Countdown] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG(String("[Countdown] Saved ") + on_timer::decode(bytes) + " s to EEPROM");
}
