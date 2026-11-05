#include "Countdown.h"

#include <Arduino.h>
#include <atomic>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "OnTimer.h"
#include "define_All.h"

static_assert(COUNTDOWN_EEPROM_SIZE == on_timer::kStorageSize, "countdown stores a uint32");

namespace {
// The MQTT callback (TaskNetwork) and TaskDevice share the timer.
countdown::Timer timer;
SemaphoreHandle_t timerMutex = nullptr;
std::atomic<uint32_t> lastStarted{0};
std::atomic<bool> dirty{false};

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
} // namespace

void Countdown::setup()
{
    if (timerMutex == nullptr) timerMutex = xSemaphoreCreateMutex();
    if (timerMutex == nullptr) {
        DEVICE_LOG_INFO("[Countdown] Cannot create mutex; countdown disabled");
    }
    uint8_t bytes[COUNTDOWN_EEPROM_SIZE];
    uint32_t value = 0;
    if (Memory::GetInstance()->readBytes(COUNTDOWN_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        value = on_timer::decode(bytes);
    }
    // Blank (0xFFFFFFFF) or corrupt bytes: no last value.
    if (value == 0 || !countdown::isValid(value)) value = 0;
    lastStarted.store(value);
    dirty.store(false);
    DEVICE_LOG_INFO("[Countdown] Last countdown " + String(value) + " s, EEPROM " +
                    String(COUNTDOWN_EEPROM_ADDRESS) + ".." + String(COUNTDOWN_EEPROM_END - 1));
}

bool Countdown::start(uint32_t seconds, uint8_t mask)
{
    if (seconds == 0 || !countdown::isValid(seconds) || mask == 0) return false;
    {
        TimerLock lock;
        if (!lock.locked()) return false;
        timer.start(seconds, mask, millis());
    }
    if (lastStarted.exchange(seconds) != seconds) dirty.store(true);
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
    return lastStarted.load();
}

void Countdown::flush()
{
    if (!dirty.exchange(false)) return;
    uint8_t bytes[COUNTDOWN_EEPROM_SIZE];
    on_timer::encode(lastStarted.load(), bytes);
    if (!Memory::GetInstance()->writeBytes(COUNTDOWN_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        dirty.store(true);
        DEVICE_LOG_INFO("[Countdown] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG("[Countdown] Saved " + String(on_timer::decode(bytes)) + " s to EEPROM");
}
