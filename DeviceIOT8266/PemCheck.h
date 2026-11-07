#pragma once

// Light PEM checks for the credentials stored by /setup and loaded by MQTT.
// They only find the BEGIN / END markers; the TLS stack parses the content.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>
#include <string.h>

namespace pem {

inline bool containsBlock(const String& text, const char* beginMarker, const char* endMarker)
{
    const int begin = text.indexOf(beginMarker);
    return begin >= 0 && text.indexOf(endMarker, begin + strlen(beginMarker)) >= 0;
}

inline bool isCertificate(const String& text)
{
    return containsBlock(text, "-----BEGIN CERTIFICATE-----", "-----END CERTIFICATE-----");
}

// An unencrypted PKCS#8, PKCS#1 (RSA) or SEC1 (EC) private key.
inline bool isPrivateKey(const String& text)
{
    if (containsBlock(text, "-----BEGIN ENCRYPTED PRIVATE KEY-----", "-----END ENCRYPTED PRIVATE KEY-----")) {
        return false;
    }
    return containsBlock(text, "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----") ||
           containsBlock(text, "-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----") ||
           containsBlock(text, "-----BEGIN EC PRIVATE KEY-----", "-----END EC PRIVATE KEY-----");
}

}  // namespace pem
