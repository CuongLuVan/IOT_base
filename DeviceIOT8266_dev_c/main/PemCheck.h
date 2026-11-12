#pragma once

// Light PEM checks for the credentials stored by /setup and loaded by MQTT.
// They only find the BEGIN / END markers; mbedTLS parses the content.

#include <string.h>
#include <string>

namespace pem {

inline bool containsBlock(const std::string& text, const char* beginMarker, const char* endMarker)
{
    const size_t begin = text.find(beginMarker);
    return begin != std::string::npos && text.find(endMarker, begin + strlen(beginMarker)) != std::string::npos;
}

inline bool isCertificate(const std::string& text)
{
    return containsBlock(text, "-----BEGIN CERTIFICATE-----", "-----END CERTIFICATE-----");
}

// An unencrypted PKCS#8, PKCS#1 (RSA) or SEC1 (EC) private key.
inline bool isPrivateKey(const std::string& text)
{
    if (containsBlock(text, "-----BEGIN ENCRYPTED PRIVATE KEY-----", "-----END ENCRYPTED PRIVATE KEY-----")) {
        return false;
    }
    return containsBlock(text, "-----BEGIN PRIVATE KEY-----", "-----END PRIVATE KEY-----") ||
           containsBlock(text, "-----BEGIN RSA PRIVATE KEY-----", "-----END RSA PRIVATE KEY-----") ||
           containsBlock(text, "-----BEGIN EC PRIVATE KEY-----", "-----END EC PRIVATE KEY-----");
}

}  // namespace pem
