#pragma once

// PM2.5 concentration to the US EPA Air Quality Index (breakpoints of the
// 2024 PM2.5 NAAQS revision). Pure logic, unit tested in tests/core_logic_test.cpp.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <stddef.h>
#include <stdint.h>

namespace air_quality {

struct Pm25Breakpoint {
    uint16_t lowTenths;   // Concentration, 0.1 ug/m3.
    uint16_t highTenths;
    uint16_t lowIndex;
    uint16_t highIndex;
};

constexpr Pm25Breakpoint kPm25Breakpoints[] = {
    {0, 90, 0, 50},          // Good
    {91, 354, 51, 100},      // Moderate
    {355, 554, 101, 150},    // Unhealthy for sensitive groups
    {555, 1254, 151, 200},   // Unhealthy
    {1255, 2254, 201, 300},  // Very unhealthy
    {2255, 3254, 301, 500},  // Hazardous
};

constexpr uint16_t kMaxIndex = 500;

// pm25: 24-hour or instantaneous PM2.5 in whole ug/m3 (PMS "atmospheric" value).
inline uint16_t pm25ToAqi(uint16_t pm25)
{
    const uint32_t tenths = static_cast<uint32_t>(pm25) * 10u;
    for (const Pm25Breakpoint& range : kPm25Breakpoints) {
        if (tenths > range.highTenths) continue;
        const uint32_t span = range.highTenths - range.lowTenths;
        const uint32_t offset = tenths - range.lowTenths;
        const uint32_t indexSpan = range.highIndex - range.lowIndex;
        return static_cast<uint16_t>(range.lowIndex + (indexSpan * offset + span / 2) / span);
    }
    return kMaxIndex;
}

}  // namespace air_quality
