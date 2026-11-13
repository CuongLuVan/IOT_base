#include "MqttPlatform.h"

#include "NetworkWifi.h"
#include "mbedtls/md.h"
#include <string.h>

#include "mbedtls/pk.h"
#include "mbedtls/version.h"
#include "mbedtls/x509_crt.h"

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

#if MBEDTLS_VERSION_NUMBER >= 0x03000000
static int mbedtlsRandom(void*, unsigned char* out, size_t length)
{
    fillSecureRandom(out, length);
    return 0;
}
#endif

bool certificateMatchesKey(const std::string& certificatePem, const std::string& keyPem)
{
    mbedtls_x509_crt certificate;
    mbedtls_pk_context key;
    mbedtls_x509_crt_init(&certificate);
    mbedtls_pk_init(&key);
    // PEM input must include the terminating 0 in its length.
    bool matches = mbedtls_x509_crt_parse(&certificate, reinterpret_cast<const unsigned char*>(certificatePem.c_str()),
                                          certificatePem.size() + 1) == 0;
#if MBEDTLS_VERSION_NUMBER >= 0x03000000
    matches = matches &&
              mbedtls_pk_parse_key(&key, reinterpret_cast<const unsigned char*>(keyPem.c_str()), keyPem.size() + 1,
                                   nullptr, 0, mbedtlsRandom, nullptr) == 0 &&
              mbedtls_pk_check_pair(&certificate.pk, &key, mbedtlsRandom, nullptr) == 0;
#else
    matches = matches &&
              mbedtls_pk_parse_key(&key, reinterpret_cast<const unsigned char*>(keyPem.c_str()), keyPem.size() + 1,
                                   nullptr, 0) == 0 &&
              mbedtls_pk_check_pair(&certificate.pk, &key) == 0;
#endif
    mbedtls_pk_free(&key);
    mbedtls_x509_crt_free(&certificate);
    return matches;
}

bool samePublicKey(const std::string& firstPem, const std::string& secondPem)
{
    mbedtls_x509_crt first;
    mbedtls_x509_crt second;
    mbedtls_x509_crt_init(&first);
    mbedtls_x509_crt_init(&second);
    const bool same =
        mbedtls_x509_crt_parse(&first, reinterpret_cast<const unsigned char*>(firstPem.c_str()),
                               firstPem.size() + 1) == 0 &&
        mbedtls_x509_crt_parse(&second, reinterpret_cast<const unsigned char*>(secondPem.c_str()),
                               secondPem.size() + 1) == 0 &&
        first.pk_raw.len == second.pk_raw.len && first.pk_raw.len > 0 &&
        memcmp(first.pk_raw.p, second.pk_raw.p, first.pk_raw.len) == 0;
    mbedtls_x509_crt_free(&second);
    mbedtls_x509_crt_free(&first);
    return same;
}

}  // namespace mqtt_platform
