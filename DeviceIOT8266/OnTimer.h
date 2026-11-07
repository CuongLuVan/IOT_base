#pragma once

// Auto OFF on-timer, independent of schedules: a port that stays on for N
// seconds is switched off, whether MQTT (com:1), the button or a schedule
// switched it on. N is stored at ON_TIMER_EEPROM_ADDRESS as a little-endian
// uint32 (ByteCodec.h), 1..kMaxSeconds; 0 = off.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <stdint.h>

#include "PortBits.h"

namespace on_timer {

constexpr uint32_t kMaxSeconds = 86400;  // 24 h

inline bool isValid(uint32_t seconds)
{
    return seconds <= kMaxSeconds;
}

// Measures how long each port has been on with millis(), so it works without
// a valid clock. uint32 wraps after 49 days, far above the 24 h maximum.
class Tracker {
public:
    // Call every TaskDevice cycle with the current port byte. Returns the
    // ports on for at least seconds (0 = timer off); they count as off again.
    uint8_t update(uint8_t portsOn, uint32_t seconds, uint32_t nowMs)
    {
        uint8_t expired = 0;
        for (uint8_t port = 0; port < ports::kCount; ++port) {
            const uint8_t bit = ports::bitOf(port);
            if ((portsOn & bit) == 0) {
                on_ &= static_cast<uint8_t>(~bit);
            } else if ((on_ & bit) == 0) {
                on_ |= bit;
                onSinceMs_[port] = nowMs;
            } else if (seconds != 0 && nowMs - onSinceMs_[port] >= seconds * 1000u) {
                expired |= bit;
            }
        }
        on_ &= static_cast<uint8_t>(~expired);
        return expired;
    }

private:
    uint8_t on_ = 0;
    uint32_t onSinceMs_[ports::kCount] = {};
};

}  // namespace on_timer

// Persistent setting. The MQTT callback calls set() (RAM only); Automation
// calls stage(), which writes the 4 bytes only after the value changed.
class OnTimer {
public:
    static void setup();
    // false: seconds is outside 0..on_timer::kMaxSeconds.
    static bool set(uint32_t seconds);
    static uint32_t seconds();
    // Automation: copies a changed value into the EEPROM RAM copy (committed
    // by Automation). true when something was staged.
    static bool stage();
};
