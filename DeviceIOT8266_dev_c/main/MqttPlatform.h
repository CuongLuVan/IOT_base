#pragma once

// ESP8266_RTOS_SDK back end of the MQTT module: HMAC-SHA256 (mbedTLS), random
// numbers and the station state.

#include <stddef.h>
#include <stdint.h>
#include <string>

#include "Platform.h"

namespace mqtt_platform {

inline uint32_t secureRandom32()
{
    return deviceSecureRandom32();
}

inline void fillSecureRandom(uint8_t* out, size_t length)
{
    deviceFillRandom(out, length);
}

bool hmacSha256(const char* key, size_t keyLength, const char* data, size_t length, uint8_t digest[32]);

// The station is associated and holds a DHCP lease.
bool stationConnected();
// The station address as text ("0.0.0.0" without a lease).
std::string localIp();

}  // namespace mqtt_platform
