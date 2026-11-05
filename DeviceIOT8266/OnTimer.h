#ifndef ON_TIMER_H
#define ON_TIMER_H

#include <stdint.h>

// Hẹn giờ tự tắt, độc lập với lịch: cổng nào bật liên tục đủ N giây thì bị
// tắt, dù được bật bằng MQTT (com:1), nút nhấn hay lịch. N lưu 4 byte
// (uint32 little-endian) tại ON_TIMER_EEPROM_ADDRESS, 1..kMaxSeconds; 0 = tắt.
namespace on_timer {

constexpr uint32_t kMaxSeconds = 86400;  // 24 h
constexpr uint32_t kStorageSize = 4;

inline bool isValid(uint32_t seconds)
{
    return seconds <= kMaxSeconds;
}

inline void encode(uint32_t seconds, uint8_t* bytes)
{
    for (uint32_t i = 0; i < kStorageSize; ++i) bytes[i] = static_cast<uint8_t>(seconds >> (8 * i));
}

inline uint32_t decode(const uint8_t* bytes)
{
    uint32_t seconds = 0;
    for (uint32_t i = 0; i < kStorageSize; ++i) seconds |= static_cast<uint32_t>(bytes[i]) << (8 * i);
    return seconds;
}

// Measures how long each port has been on with millis(), so it works without
// a valid clock. uint32 wraps after 49 days, far above the 24 h maximum.
class Tracker {
public:
    // Call every TaskDevice cycle with the current port byte. Returns the
    // ports on for at least seconds (0 = timer off); they count as off again.
    uint8_t update(uint8_t ports, uint32_t seconds, uint32_t nowMs)
    {
        uint8_t expired = 0;
        for (uint8_t port = 0; port < 8; ++port) {
            const uint8_t bit = static_cast<uint8_t>(1u << port);
            if ((ports & bit) == 0) {
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
    uint32_t onSinceMs_[8] = {};
};

} // namespace on_timer

// Persistent setting. The MQTT callback calls set() (RAM only); SystemTask
// calls flush(), which writes the 4 bytes only after the value changed.
class OnTimer {
public:
    static void setup();
    // false: seconds is outside 0..on_timer::kMaxSeconds.
    static bool set(uint32_t seconds);
    static uint32_t seconds();
    static void flush();
};

#endif
