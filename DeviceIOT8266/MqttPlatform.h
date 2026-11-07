#pragma once

// ESP8266 back end of the MQTT module: TLS client, HMAC-SHA256, random
// numbers and the station state. The official core (ESP8266_NONOS_CORE) uses
// BearSSL; esp8266RTOSArduCore uses mbedTLS. DeviceIOT has its own
// MqttPlatform.h with the same names.

#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <memory>
#include <new>
#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "DebugInfo.h"
#include "PlatformCompat.h"
#include "TaskWatchdog.h"
#include "define_All.h"

#if ESP8266_NONOS_CORE
#include <bearssl/bearssl.h>
#else
#include <mbedtls/md.h>
#endif

namespace mqtt_platform {

#if ESP8266_NONOS_CORE
using SecureClient = WiFiClientSecure;
#else
// The RTOS core's WiFiClientSecure::connect(host, port) has no TCP connect
// timeout (lwIP retries the SYN for about a minute) and setTimeout() is a
// stub. This client resolves the host, checks with a plain socket that the
// broker accepts a TCP connection within MQTT_SOCKET_TIMEOUT_SECONDS, then
// opens TLS with MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS for the handshake and the
// socket reads / writes.
class SecureClient : public WiFiClientSecure {
public:
    using WiFiClientSecure::connect;

    int connect(const char* host, uint16_t port) override
    {
        IPAddress address;
        if (!WiFi.hostByName(host, address)) {
            DEVICE_LOGF_WARNING("[MQTT] Broker host %s does not resolve\n", host);
            return 0;
        }
        task_watchdog::reset(task_watchdog::Slot::Network);
        WiFiClient probe;
        if (!probe.connect(address, port, MQTT_SOCKET_TIMEOUT_SECONDS * 1000)) {
            DEVICE_LOG_WARNING("[MQTT] Broker does not accept TCP connections");
            return 0;
        }
        probe.stop();
        task_watchdog::reset(task_watchdog::Slot::Network);
        return WiFiClientSecure::connect(host, port, MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS * 1000);
    }
};
#endif

inline uint32_t secureRandom32()
{
    return deviceSecureRandom32();
}

inline void fillSecureRandom(uint8_t* out, size_t length)
{
    for (size_t offset = 0; offset < length; offset += sizeof(uint32_t)) {
        const uint32_t value = deviceSecureRandom32();
        const size_t count = length - offset < sizeof(value) ? length - offset : sizeof(value);
        memcpy(out + offset, &value, count);
    }
}

inline bool hmacSha256(const char* key, size_t keyLength, const char* data, size_t length, uint8_t digest[32])
{
#if ESP8266_NONOS_CORE
    br_hmac_key_context keyContext;
    br_hmac_context context;
    br_hmac_key_init(&keyContext, &br_sha256_vtable, key, keyLength);
    br_hmac_init(&context, &keyContext, 0);
    br_hmac_update(&context, data, length);
    br_hmac_out(&context, digest);
    return true;
#else
    const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    return info != nullptr &&
           mbedtls_md_hmac(info, reinterpret_cast<const unsigned char*>(key), keyLength,
                           reinterpret_cast<const unsigned char*>(data), length, digest) == 0;
#endif
}

inline bool stationConnected()
{
    return WiFi.status() == WL_CONNECTED;
}

inline String localIp()
{
    return WiFi.localIP().toString();
}

#if ESP8266_NONOS_CORE
// BearSSL keeps only the parsed DER objects, so the PEM text is freed after
// load(). Credentials must be ECDSA P-256 (the EEPROM regions are sized for it).
class TlsCredentials {
public:
    // certificate / privateKey empty = no client certificate (mTLS off).
    bool load(const String& ca, const String& certificate, const String& privateKey)
    {
        std::unique_ptr<BearSSL::X509List> anchors(new (std::nothrow) BearSSL::X509List());
        if (!anchors || !anchors->append(ca.c_str())) {
            DEVICE_LOG_ERROR("[MQTT] CA certificate cannot be parsed");
            return false;
        }
        std::unique_ptr<BearSSL::X509List> chain;
        std::unique_ptr<BearSSL::PrivateKey> key;
        if (certificate.length() > 0) {
            chain.reset(new (std::nothrow) BearSSL::X509List());
            key.reset(new (std::nothrow) BearSSL::PrivateKey());
            if (!chain || !key || !chain->append(certificate.c_str()) || !key->parse(privateKey.c_str()) ||
                !key->isEC()) {
                DEVICE_LOG_ERROR("[MQTT] Client certificate/key must be ECDSA P-256 PEM");
                return false;
            }
        }
        trustAnchors_ = std::move(anchors);
        clientChain_ = std::move(chain);
        clientKey_ = std::move(key);
        return true;
    }

    // Closes any previous socket and prepares the client for a fresh connect.
    void apply(SecureClient& client)
    {
        client.stop();
        client.setBufferSizes(TLS_RX_BUFFER_SIZE, TLS_TX_BUFFER_SIZE);
        client.setTrustAnchors(trustAnchors_.get());
        if (clientChain_ && clientKey_) {
            client.setClientECCert(clientChain_.get(), clientKey_.get(), BR_KEYTYPE_KEYX | BR_KEYTYPE_SIGN,
                                   BR_KEYTYPE_EC);
        }
        // BearSSL bounds the handshake and every read with the stream timeout.
        client.setTimeout(MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS * 1000UL);
    }

private:
    std::unique_ptr<BearSSL::X509List> trustAnchors_;
    std::unique_ptr<BearSSL::X509List> clientChain_;
    std::unique_ptr<BearSSL::PrivateKey> clientKey_;
};
#else
// The mbedTLS client keeps pointers to the PEM text, so it stays in RAM.
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
    }

private:
    String ca_;
    String certificate_;
    String privateKey_;
};
#endif

}  // namespace mqtt_platform
