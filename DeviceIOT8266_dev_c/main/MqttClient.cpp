#include "MqttClient.h"

#include <errno.h>
#include <new>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "DebugInfo.h"
#include "Platform.h"
#include "TaskWatchdog.h"
#include "mbedtls/pk.h"
#include "mbedtls/ssl.h"
#include "mbedtls/x509_crt.h"

// Last: lwIP defines connect / read / write / close / send / recv ... as macros.
#include "lwip/netdb.h"
#include "lwip/sockets.h"

namespace {

// MQTT control packet types (high nibble of the fixed header).
constexpr uint8_t kConnect = 0x10;
constexpr uint8_t kConnAck = 0x20;
constexpr uint8_t kPublish = 0x30;
constexpr uint8_t kPubAck = 0x40;
constexpr uint8_t kSubscribe = 0x82;  // Type 8 with the reserved flags 0010.
constexpr uint8_t kSubAck = 0x90;
constexpr uint8_t kPingReq = 0xC0;
constexpr uint8_t kPingResp = 0xD0;
constexpr uint8_t kDisconnect = 0xE0;
// Room for the fixed header (1 byte type + up to 4 bytes length) in front of the buffer.
constexpr size_t kHeaderRoom = 5;

// mbedtls/net_sockets.h values, so that header is not needed.
constexpr int kNetSendFailed = -0x004E;
constexpr int kNetReceiveFailed = -0x004C;

struct BioContext {
    int fd;
    uint32_t timeoutMs;  // Longest wait of one socket read / write.
};

void feedWatchdog()
{
    task_watchdog::reset(task_watchdog::Slot::Network);
}

int tlsRandom(void* context, unsigned char* output, size_t length)
{
    (void)context;
    deviceFillRandom(output, length);
    return 0;
}

// true when fd becomes readable (or writable) within timeoutMs.
bool waitSocket(int fd, bool forWrite, uint32_t timeoutMs)
{
    fd_set set;
    FD_ZERO(&set);
    FD_SET(fd, &set);
    struct timeval timeout;
    timeout.tv_sec = static_cast<long>(timeoutMs / 1000U);
    timeout.tv_usec = static_cast<long>((timeoutMs % 1000U) * 1000U);
    const int ready = lwip_select(fd + 1, forWrite ? nullptr : &set, forWrite ? &set : nullptr, nullptr, &timeout);
    return ready > 0;
}

int bioSend(void* context, const unsigned char* data, size_t length)
{
    BioContext* bio = static_cast<BioContext*>(context);
    for (;;) {
        const int sent = lwip_send(bio->fd, data, length, 0);
        if (sent >= 0) return sent;
        if (errno != EAGAIN && errno != EWOULDBLOCK) return kNetSendFailed;
        if (!waitSocket(bio->fd, true, bio->timeoutMs)) return kNetSendFailed;
    }
}

int bioReceive(void* context, unsigned char* data, size_t length, uint32_t timeout)
{
    (void)timeout;  // bio->timeoutMs is set per operation by MqttClient.
    BioContext* bio = static_cast<BioContext*>(context);
    if (!waitSocket(bio->fd, false, bio->timeoutMs)) return MBEDTLS_ERR_SSL_TIMEOUT;
    const int received = lwip_recv(bio->fd, data, length, 0);
    if (received >= 0) return received;  // 0: the peer closed the connection.
    if (errno == EAGAIN || errno == EWOULDBLOCK) return MBEDTLS_ERR_SSL_WANT_READ;
    return kNetReceiveFailed;
}

}  // namespace

struct MqttClient::Credentials {
    mbedtls_x509_crt ca;
    mbedtls_x509_crt certificate;
    mbedtls_pk_context key;
    bool hasClientCertificate;
};

struct MqttClient::Tls {
    int fd = -1;
    bool initialized = false;
    BioContext bio = {-1, 0};
    mbedtls_ssl_context ssl;
    mbedtls_ssl_config config;
};

MqttClient::MqttClient() {}

MqttClient::~MqttClient()
{
    stopTransport();
    if (credentials_ != nullptr) {
        mbedtls_x509_crt_free(&credentials_->ca);
        mbedtls_x509_crt_free(&credentials_->certificate);
        mbedtls_pk_free(&credentials_->key);
        delete credentials_;
    }
    free(storage_);
}

bool MqttClient::loadCredentials(const std::string& ca, const std::string& certificate, const std::string& privateKey)
{
    stopTransport();
    if (credentials_ != nullptr) {
        mbedtls_x509_crt_free(&credentials_->ca);
        mbedtls_x509_crt_free(&credentials_->certificate);
        mbedtls_pk_free(&credentials_->key);
        delete credentials_;
        credentials_ = nullptr;
    }
    Credentials* loaded = new (std::nothrow) Credentials;
    if (loaded == nullptr) return false;
    mbedtls_x509_crt_init(&loaded->ca);
    mbedtls_x509_crt_init(&loaded->certificate);
    mbedtls_pk_init(&loaded->key);
    loaded->hasClientCertificate = false;

    // PEM input must include the terminating '\0' in its length.
    int result = mbedtls_x509_crt_parse(&loaded->ca, reinterpret_cast<const unsigned char*>(ca.c_str()), ca.size() + 1);
    if (result != 0) {
        DEVICE_LOGF_ERROR("[MQTT] CA certificate cannot be parsed (-0x%04X)\n", static_cast<unsigned>(-result));
    } else if (!certificate.empty()) {
        result = mbedtls_x509_crt_parse(&loaded->certificate, reinterpret_cast<const unsigned char*>(certificate.c_str()),
                                        certificate.size() + 1);
        if (result == 0) {
            result = mbedtls_pk_parse_key(&loaded->key, reinterpret_cast<const unsigned char*>(privateKey.c_str()),
                                          privateKey.size() + 1, nullptr, 0);
        }
        if (result != 0 || mbedtls_pk_can_do(&loaded->key, MBEDTLS_PK_ECKEY) == 0) {
            DEVICE_LOG_ERROR("[MQTT] Client certificate/key must be ECDSA P-256 PEM");
            if (result == 0) result = -1;
        } else {
            loaded->hasClientCertificate = true;
        }
    }
    if (result != 0) {
        mbedtls_x509_crt_free(&loaded->ca);
        mbedtls_x509_crt_free(&loaded->certificate);
        mbedtls_pk_free(&loaded->key);
        delete loaded;
        return false;
    }
    credentials_ = loaded;
    return true;
}

void MqttClient::setServer(const char* host, uint16_t port)
{
    host_ = host != nullptr ? host : "";
    port_ = port;
}

void MqttClient::setCallback(Callback callback)
{
    callback_ = callback;
}

void MqttClient::setKeepAlive(uint16_t seconds)
{
    keepAliveSeconds_ = seconds;
}

void MqttClient::setSocketTimeout(uint16_t seconds)
{
    socketTimeoutSeconds_ = seconds;
}

void MqttClient::setHandshakeTimeout(uint16_t seconds)
{
    handshakeTimeoutSeconds_ = seconds;
}

bool MqttClient::setBufferSize(size_t size)
{
    if (size == 0) return false;
    uint8_t* storage = static_cast<uint8_t*>(realloc(storage_, size + kHeaderRoom));
    if (storage == nullptr) return false;
    storage_ = storage;
    buffer_ = storage_ + kHeaderRoom;
    bufferSize_ = size;
    return true;
}

bool MqttClient::isConnected() const
{
    return connected_ && tls_ != nullptr;
}

int MqttClient::state() const
{
    return state_;
}

// Resolves the broker (answered from the lwIP DNS cache after the DNS probe)
// and opens a non-blocking TCP connection within the socket timeout.
bool MqttClient::openSocket()
{
    char service[8];
    snprintf(service, sizeof(service), "%u", static_cast<unsigned>(port_));
    struct addrinfo hints;
    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_INET;
    hints.ai_socktype = SOCK_STREAM;
    struct addrinfo* address = nullptr;
    if (lwip_getaddrinfo(host_.c_str(), service, &hints, &address) != 0 || address == nullptr) {
        DEVICE_LOGF_WARNING("[MQTT] Broker host %s does not resolve\n", host_.c_str());
        return false;
    }
    const int fd = lwip_socket(address->ai_family, address->ai_socktype, address->ai_protocol);
    if (fd < 0) {
        lwip_freeaddrinfo(address);
        DEVICE_LOG_WARNING("[MQTT] No socket available");
        return false;
    }
    lwip_fcntl(fd, F_SETFL, lwip_fcntl(fd, F_GETFL, 0) | O_NONBLOCK);
    const int result = lwip_connect(fd, address->ai_addr, address->ai_addrlen);
    const int connectError = errno;
    lwip_freeaddrinfo(address);
    tls_->fd = fd;
    if (result == 0) return true;
    if (connectError != EINPROGRESS) {
        DEVICE_LOG_WARNING("[MQTT] Broker does not accept TCP connections");
        return false;
    }
    if (!waitSocket(fd, true, socketTimeoutSeconds_ * 1000UL)) {
        DEVICE_LOG_WARNING("[MQTT] Broker does not accept TCP connections");
        return false;
    }
    int socketError = 0;
    socklen_t length = sizeof(socketError);
    if (lwip_getsockopt(fd, SOL_SOCKET, SO_ERROR, &socketError, &length) != 0 || socketError != 0) {
        DEVICE_LOG_WARNING("[MQTT] Broker does not accept TCP connections");
        return false;
    }
    return true;
}

bool MqttClient::startTls()
{
    Tls& tls = *tls_;
    mbedtls_ssl_init(&tls.ssl);
    mbedtls_ssl_config_init(&tls.config);
    tls.initialized = true;

    int result = mbedtls_ssl_config_defaults(&tls.config, MBEDTLS_SSL_IS_CLIENT, MBEDTLS_SSL_TRANSPORT_STREAM,
                                             MBEDTLS_SSL_PRESET_DEFAULT);
    if (result == 0) {
        mbedtls_ssl_conf_authmode(&tls.config, MBEDTLS_SSL_VERIFY_REQUIRED);
        mbedtls_ssl_conf_ca_chain(&tls.config, &credentials_->ca, nullptr);
        mbedtls_ssl_conf_rng(&tls.config, tlsRandom, nullptr);
        mbedtls_ssl_conf_read_timeout(&tls.config, socketTimeoutSeconds_ * 1000UL);
        if (credentials_->hasClientCertificate) {
            result = mbedtls_ssl_conf_own_cert(&tls.config, &credentials_->certificate, &credentials_->key);
        }
    }
    if (result == 0) result = mbedtls_ssl_setup(&tls.ssl, &tls.config);
    // Server name for SNI and the certificate name check.
    if (result == 0) result = mbedtls_ssl_set_hostname(&tls.ssl, host_.c_str());
    if (result != 0) {
        DEVICE_LOGF_ERROR("[MQTT] TLS setup failed (-0x%04X); not enough memory?\n", static_cast<unsigned>(-result));
        return false;
    }
    tls.bio.fd = tls.fd;
    mbedtls_ssl_set_bio(&tls.ssl, &tls.bio, bioSend, nullptr, bioReceive);

    const uint32_t startMs = millis();
    const uint32_t limitMs = handshakeTimeoutSeconds_ * 1000UL;
    for (;;) {
        const uint32_t elapsed = millis() - startMs;
        if (elapsed >= limitMs) {
            DEVICE_LOG_WARNING("[MQTT] TLS handshake timeout");
            return false;
        }
        tls.bio.timeoutMs = limitMs - elapsed;
        result = mbedtls_ssl_handshake(&tls.ssl);
        feedWatchdog();
        if (result == 0) return true;
        if (result != MBEDTLS_ERR_SSL_WANT_READ && result != MBEDTLS_ERR_SSL_WANT_WRITE) {
            DEVICE_LOGF_WARNING("[MQTT] TLS handshake failed (-0x%04X, verify flags 0x%lX)\n",
                                static_cast<unsigned>(-result),
                                static_cast<unsigned long>(mbedtls_ssl_get_verify_result(&tls.ssl)));
            return false;
        }
    }
}

void MqttClient::stopTransport()
{
    if (tls_ != nullptr) {
        if (tls_->initialized) {
            mbedtls_ssl_free(&tls_->ssl);
            mbedtls_ssl_config_free(&tls_->config);
        }
        if (tls_->fd >= 0) lwip_close(tls_->fd);
        delete tls_;
        tls_ = nullptr;
    }
    connected_ = false;
    pingOutstanding_ = false;
}

void MqttClient::lostConnection(int newState)
{
    stopTransport();
    state_ = newState;
}

bool MqttClient::sendAll(const uint8_t* data, size_t length)
{
    if (tls_ == nullptr || !tls_->initialized) return false;
    tls_->bio.timeoutMs = socketTimeoutSeconds_ * 1000UL;
    const uint32_t startMs = millis();
    size_t sent = 0;
    while (sent < length) {
        const int result = mbedtls_ssl_write(&tls_->ssl, data + sent, length - sent);
        if (result > 0) {
            sent += static_cast<size_t>(result);
            continue;
        }
        if ((result == MBEDTLS_ERR_SSL_WANT_WRITE || result == MBEDTLS_ERR_SSL_WANT_READ) &&
            millis() - startMs < tls_->bio.timeoutMs) {
            continue;
        }
        return false;
    }
    lastOutActivityMs_ = millis();
    return true;
}

bool MqttClient::receiveExact(uint8_t* data, size_t length)
{
    if (tls_ == nullptr || !tls_->initialized) return false;
    tls_->bio.timeoutMs = socketTimeoutSeconds_ * 1000UL;
    const uint32_t startMs = millis();
    size_t received = 0;
    while (received < length) {
        const int result = mbedtls_ssl_read(&tls_->ssl, data + received, length - received);
        if (result > 0) {
            received += static_cast<size_t>(result);
            continue;
        }
        if ((result == MBEDTLS_ERR_SSL_WANT_READ || result == MBEDTLS_ERR_SSL_WANT_WRITE) &&
            millis() - startMs < tls_->bio.timeoutMs) {
            continue;
        }
        // Timeout, close notify, end of stream or an error.
        return false;
    }
    return true;
}

bool MqttClient::dataAvailable()
{
    if (tls_ == nullptr || !tls_->initialized) return false;
    if (mbedtls_ssl_get_bytes_avail(&tls_->ssl) > 0) return true;
    return waitSocket(tls_->fd, false, 0);
}

bool MqttClient::readPacket(uint8_t& header, size_t& length, bool& dropped)
{
    dropped = false;
    length = 0;
    if (!receiveExact(&header, 1)) return false;
    size_t remaining = 0;
    size_t multiplier = 1;
    uint8_t digit = 0;
    int count = 0;
    do {
        if (++count > 4 || !receiveExact(&digit, 1)) return false;
        remaining += static_cast<size_t>(digit & 0x7F) * multiplier;
        multiplier *= 128;
    } while ((digit & 0x80) != 0);

    if (remaining > bufferSize_) {
        // Too large for the buffer: read and discard it, like PubSubClient.
        uint8_t scratch[32];
        size_t left = remaining;
        while (left > 0) {
            const size_t chunk = left < sizeof(scratch) ? left : sizeof(scratch);
            if (!receiveExact(scratch, chunk)) return false;
            left -= chunk;
        }
        dropped = true;
        length = remaining;
        return true;
    }
    if (remaining > 0 && !receiveExact(buffer_, remaining)) return false;
    length = remaining;
    return true;
}

// buffer_[0..length) holds the variable header and payload.
bool MqttClient::sendPacket(uint8_t header, size_t length)
{
    if (buffer_ == nullptr || length > bufferSize_) return false;
    uint8_t lengthBytes[4];
    size_t count = 0;
    size_t value = length;
    do {
        uint8_t digit = static_cast<uint8_t>(value % 128);
        value /= 128;
        if (value > 0) digit |= 0x80;
        lengthBytes[count++] = digit;
    } while (value > 0 && count < sizeof(lengthBytes));
    const size_t headerSize = 1 + count;
    uint8_t* start = buffer_ - headerSize;
    start[0] = header;
    memcpy(start + 1, lengthBytes, count);
    if (!sendAll(start, headerSize + length)) {
        lostConnection(kConnectionLost);
        return false;
    }
    return true;
}

bool MqttClient::connectBroker(const char* clientId, const char* user, const char* password)
{
    stopTransport();
    state_ = kConnectFailed;
    if (credentials_ == nullptr || buffer_ == nullptr || host_.empty() || clientId == nullptr) return false;
    tls_ = new (std::nothrow) Tls();
    if (tls_ == nullptr) return false;

    feedWatchdog();
    const bool opened = openSocket();
    feedWatchdog();
    if (!opened || !startTls()) {
        stopTransport();
        state_ = kConnectFailed;
        return false;
    }

    // CONNECT: protocol "MQTT" level 4, clean session, keep alive, payload.
    static const uint8_t kProtocol[] = {0x00, 0x04, 'M', 'Q', 'T', 'T', 0x04};
    size_t length = 0;
    memcpy(buffer_, kProtocol, sizeof(kProtocol));
    length += sizeof(kProtocol);
    uint8_t flags = 0x02;
    if (user != nullptr) {
        flags |= 0x80;
        if (password != nullptr) flags |= 0x40;
    }
    buffer_[length++] = flags;
    buffer_[length++] = static_cast<uint8_t>(keepAliveSeconds_ >> 8);
    buffer_[length++] = static_cast<uint8_t>(keepAliveSeconds_ & 0xFF);
    const char* fields[3] = {clientId, user, user != nullptr ? password : nullptr};
    for (const char* field : fields) {
        if (field == nullptr) continue;
        const size_t fieldLength = strlen(field);
        if (fieldLength > 0xFFFF || length + 2 + fieldLength > bufferSize_) {
            stopTransport();
            state_ = kConnectFailed;
            return false;
        }
        buffer_[length++] = static_cast<uint8_t>(fieldLength >> 8);
        buffer_[length++] = static_cast<uint8_t>(fieldLength & 0xFF);
        memcpy(buffer_ + length, field, fieldLength);
        length += fieldLength;
    }
    if (!sendPacket(kConnect, length)) {
        state_ = kConnectFailed;
        return false;
    }

    // CONNACK within the socket timeout; the wait yields every tick.
    lastInActivityMs_ = millis();
    while (!dataAvailable()) {
        if (millis() - lastInActivityMs_ >= socketTimeoutSeconds_ * 1000UL) {
            stopTransport();
            state_ = kConnectionTimeout;
            return false;
        }
        vTaskDelay(1);
    }
    uint8_t header = 0;
    size_t packetLength = 0;
    bool dropped = false;
    if (!readPacket(header, packetLength, dropped) || dropped || (header & 0xF0) != kConnAck || packetLength < 2) {
        stopTransport();
        state_ = kConnectFailed;
        return false;
    }
    if (buffer_[1] != 0) {
        const int code = buffer_[1];
        stopTransport();
        state_ = code;  // 1..5: refused by the broker (protocol, id, unavailable, credentials, not authorized).
        return false;
    }
    connected_ = true;
    pingOutstanding_ = false;
    nextMessageId_ = 1;
    lastInActivityMs_ = millis();
    lastOutActivityMs_ = lastInActivityMs_;
    state_ = kConnected;
    return true;
}

void MqttClient::disconnectBroker()
{
    if (isConnected() && sendPacket(kDisconnect, 0) && tls_ != nullptr) {
        (void)mbedtls_ssl_close_notify(&tls_->ssl);
    }
    stopTransport();
    state_ = kDisconnected;
}

bool MqttClient::subscribeTopic(const char* topic, uint8_t qos)
{
    if (!isConnected() || topic == nullptr || qos > 1) return false;
    const size_t topicLength = strlen(topic);
    if (2 + 2 + topicLength + 1 > bufferSize_) return false;
    if (++nextMessageId_ == 0) nextMessageId_ = 1;
    size_t length = 0;
    buffer_[length++] = static_cast<uint8_t>(nextMessageId_ >> 8);
    buffer_[length++] = static_cast<uint8_t>(nextMessageId_ & 0xFF);
    buffer_[length++] = static_cast<uint8_t>(topicLength >> 8);
    buffer_[length++] = static_cast<uint8_t>(topicLength & 0xFF);
    memcpy(buffer_ + length, topic, topicLength);
    length += topicLength;
    buffer_[length++] = qos;
    return sendPacket(kSubscribe, length);
}

bool MqttClient::publishMessage(const char* topic, const char* payload, size_t payloadLength, bool retained)
{
    if (!isConnected() || topic == nullptr || (payload == nullptr && payloadLength > 0)) return false;
    const size_t topicLength = strlen(topic);
    if (2 + topicLength + payloadLength > bufferSize_) return false;
    size_t length = 0;
    buffer_[length++] = static_cast<uint8_t>(topicLength >> 8);
    buffer_[length++] = static_cast<uint8_t>(topicLength & 0xFF);
    memcpy(buffer_ + length, topic, topicLength);
    length += topicLength;
    if (payloadLength > 0) memcpy(buffer_ + length, payload, payloadLength);
    length += payloadLength;
    return sendPacket(static_cast<uint8_t>(kPublish | (retained ? 0x01 : 0x00)), length);
}

void MqttClient::handlePacket(uint8_t header, size_t length)
{
    const uint8_t type = header & 0xF0;
    if (type == kPublish) {
        if (length < 2) return;
        const uint8_t qos = static_cast<uint8_t>((header & 0x06) >> 1);
        const size_t topicLength = (static_cast<size_t>(buffer_[0]) << 8) | buffer_[1];
        size_t offset = 2 + topicLength;
        if (offset > length) return;
        uint16_t messageId = 0;
        if (qos > 0) {
            if (offset + 2 > length) return;
            messageId = static_cast<uint16_t>((buffer_[offset] << 8) | buffer_[offset + 1]);
            offset += 2;
        }
        // Topic as a C string in front of the payload (the payload is untouched).
        memmove(buffer_, buffer_ + 2, topicLength);
        buffer_[topicLength] = '\0';
        // The callback parses the payload before it publishes anything (a
        // publish reuses buffer_).
        if (callback_ != nullptr) callback_(reinterpret_cast<const char*>(buffer_), buffer_ + offset, length - offset);
        if (qos == 1 && isConnected()) {
            buffer_[0] = static_cast<uint8_t>(messageId >> 8);
            buffer_[1] = static_cast<uint8_t>(messageId & 0xFF);
            (void)sendPacket(kPubAck, 2);
        }
    } else if (type == (kPingReq & 0xF0)) {
        (void)sendPacket(kPingResp, 0);
    } else if (type == kPingResp) {
        pingOutstanding_ = false;
    } else if (type == kSubAck) {
        if (length >= 3 && buffer_[2] == 0x80) {
            DEVICE_LOG_WARNING("[MQTT] Subscribe refused by the broker (check mqtt_acl.json)");
        }
    }
}

bool MqttClient::poll()
{
    if (!isConnected()) return false;
    const uint32_t nowMs = millis();
    const uint32_t keepAliveMs = keepAliveSeconds_ * 1000UL;
    if (nowMs - lastInActivityMs_ > keepAliveMs || nowMs - lastOutActivityMs_ > keepAliveMs) {
        if (pingOutstanding_) {
            lostConnection(kConnectionTimeout);
            return false;
        }
        if (!sendPacket(kPingReq, 0)) return false;
        lastInActivityMs_ = nowMs;
        pingOutstanding_ = true;
    }
    if (dataAvailable()) {
        uint8_t header = 0;
        size_t length = 0;
        bool dropped = false;
        if (!readPacket(header, length, dropped)) {
            lostConnection(kConnectionLost);
            return false;
        }
        lastInActivityMs_ = millis();
        if (dropped) {
            DEVICE_LOGF_WARNING("[MQTT] Dropped an incoming packet of %u bytes (buffer %u)\n",
                                static_cast<unsigned>(length), static_cast<unsigned>(bufferSize_));
        } else {
            handlePacket(header, length);
        }
    }
    return isConnected();
}
