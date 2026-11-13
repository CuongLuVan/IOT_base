#pragma once

// ESP32 back end of the MQTT module: TLS client (mbedTLS), HMAC-SHA256,
// hardware random numbers and the station state. DeviceIOT8266 has its own
// MqttPlatform.h with the same names.

#include <Arduino.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_random.h>
#include <mbedtls/md.h>
#include <mbedtls/pk.h>
#include <mbedtls/version.h>
#include <mbedtls/x509_crt.h>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "define_All.h"

namespace mqtt_platform {

using SecureClient = WiFiClientSecure;

inline uint32_t secureRandom32()
{
    return esp_random();
}

inline void fillSecureRandom(uint8_t* out, size_t length)
{
    esp_fill_random(out, length);
}

inline bool hmacSha256(const char* key, size_t keyLength, const char* data, size_t length, uint8_t digest[32])
{
    const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    return info != nullptr &&
           mbedtls_md_hmac(info, reinterpret_cast<const unsigned char*>(key), keyLength,
                           reinterpret_cast<const unsigned char*>(data), length, digest) == 0;
}

inline bool stationConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

inline int mbedtlsRandom(void*, unsigned char* out, size_t length)
{
    esp_fill_random(out, length);
    return 0;
}

// Certificate renewal (com 16): true when certificatePem holds the public key
// of keyPem, so the renewed certificate works with the key stored in EEPROM.
inline bool certificateMatchesKey(const String& certificatePem, const String& keyPem)
{
    mbedtls_x509_crt certificate;
    mbedtls_pk_context key;
    mbedtls_x509_crt_init(&certificate);
    mbedtls_pk_init(&key);
    // PEM parsing needs the length including the terminating '\0'.
    bool matches = mbedtls_x509_crt_parse(&certificate, reinterpret_cast<const unsigned char*>(certificatePem.c_str()),
                                          certificatePem.length() + 1) == 0;
#if MBEDTLS_VERSION_NUMBER >= 0x03000000
    matches = matches &&
              mbedtls_pk_parse_key(&key, reinterpret_cast<const unsigned char*>(keyPem.c_str()), keyPem.length() + 1,
                                   nullptr, 0, mbedtlsRandom, nullptr) == 0 &&
              mbedtls_pk_check_pair(&certificate.pk, &key, mbedtlsRandom, nullptr) == 0;
#else
    matches = matches &&
              mbedtls_pk_parse_key(&key, reinterpret_cast<const unsigned char*>(keyPem.c_str()), keyPem.length() + 1,
                                   nullptr, 0) == 0 &&
              mbedtls_pk_check_pair(&certificate.pk, &key) == 0;
#endif
    mbedtls_pk_free(&key);
    mbedtls_x509_crt_free(&certificate);
    return matches;
}

// CA renewal (com 17): true when both PEM certificates carry the same public
// key (SubjectPublicKeyInfo), i.e. the CA was re-issued with the same key.
inline bool samePublicKey(const String& firstPem, const String& secondPem)
{
    mbedtls_x509_crt first;
    mbedtls_x509_crt second;
    mbedtls_x509_crt_init(&first);
    mbedtls_x509_crt_init(&second);
    const bool same =
        mbedtls_x509_crt_parse(&first, reinterpret_cast<const unsigned char*>(firstPem.c_str()),
                               firstPem.length() + 1) == 0 &&
        mbedtls_x509_crt_parse(&second, reinterpret_cast<const unsigned char*>(secondPem.c_str()),
                               secondPem.length() + 1) == 0 &&
        first.pk_raw.len == second.pk_raw.len && first.pk_raw.len > 0 &&
        memcmp(first.pk_raw.p, second.pk_raw.p, first.pk_raw.len) == 0;
    mbedtls_x509_crt_free(&second);
    mbedtls_x509_crt_free(&first);
    return same;
}

// Anti-clone session ticket (ENABLE_ANTI_CLONE) in its own NVS namespace,
// apart from the EEPROM layout. Written only when the broker rotates it
// (each connect + every few hours), which NVS wear levelling absorbs. With
// NVS / flash encryption enabled it cannot be read from a flash dump either.
constexpr char kCloneTicketNamespace[] = "anticlone";
constexpr char kCloneTicketKey[] = "ticket";

inline bool loadCloneTicket(char* out, size_t size)
{
    out[0] = '\0';
    Preferences preferences;
    // Read-only open fails while the namespace does not exist yet (not enrolled).
    if (!preferences.begin(kCloneTicketNamespace, true)) {
        return false;
    }
    const size_t length = preferences.getString(kCloneTicketKey, out, size);
    preferences.end();
    return length > 0 && out[0] != '\0';
}

inline bool saveCloneTicket(const char* ticket)
{
    Preferences preferences;
    if (!preferences.begin(kCloneTicketNamespace, false)) {
        return false;
    }
    const size_t written = preferences.putString(kCloneTicketKey, ticket);
    preferences.end();
    return written == strlen(ticket);
}

inline String localIp()
{
    return WiFi.localIP().toString();
}

// PEM credentials for the TLS client. mbedTLS keeps pointers to the text, so
// the strings live here as long as the client uses them.
class TlsCredentials {
public:
    // certificate / privateKey empty = no client certificate (mTLS off).
    bool load(const String& ca, const String& certificate, const String& privateKey)
    {
        ca_ = ca;
        certificate_ = certificate;
        privateKey_ = privateKey;
        return ca_.length() == ca.length() && certificate_.length() == certificate.length() &&
               privateKey_.length() == privateKey.length();
    }

    // Closes any previous socket and prepares the client for a fresh connect.
    void apply(SecureClient& client)
    {
        client.stop();
        client.setCACert(ca_.c_str());
        if (certificate_.length() > 0) {
            client.setCertificate(certificate_.c_str());
            client.setPrivateKey(privateKey_.c_str());
        }
        client.setHandshakeTimeout(MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS);
        // NetworkClient's own timeout: TCP connect and every TLS read / write
        // (default 30 s). setTimeout() only sets the Stream timeout.
        client.setConnectionTimeout(MQTT_SOCKET_TIMEOUT_SECONDS * 1000UL);
        client.setTimeout(MQTT_SOCKET_TIMEOUT_SECONDS * 1000UL);
    }

private:
    String ca_;
    String certificate_;
    String privateKey_;
};

}  // namespace mqtt_platform
