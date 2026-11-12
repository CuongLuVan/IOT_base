#pragma once

// Wall clock helpers shared by every module, so all of them agree on when the
// SNTP clock counts as valid (same rules as DeviceIOT8266).

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

// Starts the lwIP SNTP client once; it keeps polling on its own afterwards.
// Call only after the station has an IP address, and only from the network
// task. time() stays UTC: the schedules add SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS
// themselves.
void startSync();

}  // namespace device_clock
