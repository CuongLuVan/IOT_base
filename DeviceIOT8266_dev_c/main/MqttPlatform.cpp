#include "MqttPlatform.h"

#include "NetworkWifi.h"
#include "mbedtls/md.h"

namespace mqtt_platform {

bool hmacSha256(const char* key, size_t keyLength, const char* data, size_t length, uint8_t digest[32])
{
    const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    return info != nullptr && mbedtls_md_hmac(info, reinterpret_cast<const unsigned char*>(key), keyLength,
                                              reinterpret_cast<const unsigned char*>(data), length, digest) == 0;
}

bool stationConnected()
{
    return wifi_link::stationHasLease();
}

std::string localIp()
{
    return ipToString(wifi_link::stationAddress());
}

}  // namespace mqtt_platform
