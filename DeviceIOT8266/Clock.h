#pragma once

// Wall clock helpers shared by every module, so all of them agree on when the
// SNTP clock counts as valid.
//
// DeviceIOT8266 keeps the ESP8266 branches of this file; DeviceIOT has an
// ESP32-only copy. Not checked by tools/check_shared_files.sh.

#include <stdint.h>
#include <time.h>

namespace device_clock {

// 2024-01-01T00:00:00Z. Before SNTP answers, time() counts from 1970.
constexpr time_t kMinimumValidEpoch = 1704067200;

inline bool isValid(time_t epoch)
{
    return epoch >= kMinimumValidEpoch;
}

inline bool isValidNow()
{
    return isValid(time(nullptr));
}

// Current epoch in seconds, or 0 while the clock is not valid.
inline int64_t epochOrZero()
{
    const time_t now = time(nullptr);
    return isValid(now) ? static_cast<int64_t>(now) : 0;
}

}  // namespace device_clock

#ifdef ARDUINO
#include <Arduino.h>

#include "define_All.h"

namespace device_clock {

// Starts SNTP once; the SNTP client keeps polling on its own afterwards. Call
// only after the station has an IP address, and only from the network task:
// the esp8266RTOS configTime() calls the lwIP SNTP API without the core lock,
// and the started flag is not shared between tasks. Every module that needs
// the time calls this instead of configTime(), so the timezone is set in one
// place.
inline void startSync()
{
    static bool started = false;
    if (started) return;
    configTime(SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS, 0, "pool.ntp.org", "time.nist.gov");
    started = true;
}

}  // namespace device_clock
#endif
