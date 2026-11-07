#pragma once

// Fixed-width integers in byte buffers. EEPROM settings (on-timer, countdown,
// threshold rules) are stored little-endian, low byte first (le32); the
// high-speed UDP header is big-endian (be).
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <stddef.h>
#include <stdint.h>

namespace le32 {

constexpr size_t kSize = 4;

inline void encode(uint32_t value, uint8_t* bytes)
{
    for (size_t i = 0; i < kSize; ++i) bytes[i] = static_cast<uint8_t>(value >> (8 * i));
}

inline uint32_t decode(const uint8_t* bytes)
{
    uint32_t value = 0;
    for (size_t i = 0; i < kSize; ++i) value |= static_cast<uint32_t>(bytes[i]) << (8 * i);
    return value;
}

}  // namespace le32

namespace be {

// Writes the size low bytes of value, most significant first.
inline void put(uint8_t* bytes, uint64_t value, size_t size)
{
    for (size_t i = size; i > 0; --i) {
        bytes[i - 1] = static_cast<uint8_t>(value);
        value >>= 8;
    }
}

inline uint64_t get(const uint8_t* bytes, size_t size)
{
    uint64_t value = 0;
    for (size_t i = 0; i < size; ++i) value = (value << 8) | bytes[i];
    return value;
}

inline void put16(uint8_t* bytes, uint16_t value)
{
    put(bytes, value, 2);
}

inline void put32(uint8_t* bytes, uint32_t value)
{
    put(bytes, value, 4);
}

inline void put64(uint8_t* bytes, uint64_t value)
{
    put(bytes, value, 8);
}

inline uint16_t get16(const uint8_t* bytes)
{
    return static_cast<uint16_t>(get(bytes, 2));
}

inline uint32_t get32(const uint8_t* bytes)
{
    return static_cast<uint32_t>(get(bytes, 4));
}

}  // namespace be
