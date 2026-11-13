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
