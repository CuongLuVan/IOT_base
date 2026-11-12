#pragma once

// Port bytes: bit n of device_port, "value", "mask", ... is output port n.
//
// Copied unchanged (logic) from DeviceIOT8266; independent of the platform.

#include <stdint.h>

namespace ports {

// Ports a port byte can address; the board has DEVICE_OUTPUT_MASK of them.
constexpr uint8_t kCount = 8;

inline uint8_t bitOf(uint8_t port)
{
    return static_cast<uint8_t>(1u << port);
}

// Calls fn(port, bit) for every port set in mask, lowest first.
template <typename Fn>
void forEach(uint8_t mask, Fn fn)
{
    for (uint8_t port = 0; port < kCount; ++port) {
        const uint8_t portBit = bitOf(port);
        if ((mask & portBit) != 0) fn(port, portBit);
    }
}

}  // namespace ports
