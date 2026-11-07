#pragma once

// Countdown auto ON, independent of schedules: {"com":COMMAND_TYPE_COUNTDOWN,
// "value":N} switches the ports on once after N seconds (1..kMaxSeconds);
// value 0 cancels. The running countdown lives in RAM only and is lost on a
// power cycle. COUNTDOWN_EEPROM_ADDRESS keeps only the last N (little-endian
// uint32, ByteCodec.h) so the web page can show it again.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <stdint.h>

namespace countdown {

constexpr uint32_t kMaxSeconds = 86400;  // 24 h

inline bool isValid(uint32_t seconds)
{
    return seconds <= kMaxSeconds;
}

// One-shot timer on millis(), so it works without a valid clock.
class Timer {
public:
    void start(uint32_t seconds, uint8_t mask, uint32_t nowMs)
    {
        seconds_ = seconds;
        mask_ = mask;
        startMs_ = nowMs;
        armed_ = seconds != 0 && mask != 0;
    }

    void cancel()
    {
        armed_ = false;
    }

    bool armed() const
    {
        return armed_;
    }

    uint8_t mask() const
    {
        return armed_ ? mask_ : 0;
    }

    // Returns the ports to switch on once the time has elapsed; the timer
    // then stops, so they are returned only once.
    uint8_t poll(uint32_t nowMs)
    {
        if (!armed_ || nowMs - startMs_ < seconds_ * 1000u) return 0;
        armed_ = false;
        return mask_;
    }

    // Whole seconds left, rounded up; 0 only when not running.
    uint32_t remaining(uint32_t nowMs) const
    {
        if (!armed_) return 0;
        const uint32_t elapsed = nowMs - startMs_;
        const uint32_t total = seconds_ * 1000u;
        return elapsed >= total ? 1 : (total - elapsed + 999u) / 1000u;
    }

private:
    bool armed_ = false;
    uint8_t mask_ = 0;
    uint32_t seconds_ = 0;
    uint32_t startMs_ = 0;
};

}  // namespace countdown

// The MQTT callback calls start() / cancel(), TaskDevice calls takeExpired(),
// Automation calls stage(): EEPROM is written only when a new N is started.
class Countdown {
public:
    static void setup();
    // seconds 1..countdown::kMaxSeconds, mask != 0. false: invalid input.
    static bool start(uint32_t seconds, uint8_t mask);
    static void cancel();
    static uint8_t takeExpired();
    static uint32_t remaining();
    static uint8_t mask();
    // Last N started (0 = never), kept in EEPROM.
    static uint32_t lastSeconds();
    // Automation: copies a changed value into the EEPROM RAM copy (committed
    // by Automation). true when something was staged.
    static bool stage();
};
