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

// Certificate renewal (com 16): true when certificatePem holds the public key
// of keyPem, so the renewed certificate works with the key stored in EEPROM.
bool certificateMatchesKey(const std::string& certificatePem, const std::string& keyPem);
// CA renewal (com 17): true when both PEM certificates carry the same public
// key (SubjectPublicKeyInfo), i.e. the CA was re-issued with the same key.
bool samePublicKey(const std::string& firstPem, const std::string& secondPem);

}  // namespace mqtt_platform
