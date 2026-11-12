#pragma once

// Minimal MQTT 3.1.1 client over TLS (mbedTLS + lwIP sockets), with the
// behaviour of PubSubClient that DeviceIOT8266 relied on:
//   - CONNECT with clean session, optional user / password, keep alive;
//     CONNACK awaited at most the socket timeout;
//   - SUBSCRIBE (QoS 0/1), PUBLISH QoS 0 out, PUBLISH QoS 0/1 in (PUBACK
//     after the callback);
//   - PINGREQ when the link is idle for the keep alive; a PINGREQ that stays
//     unanswered for another keep alive closes the connection;
//   - one incoming packet per poll().
// Every blocking step is bounded: TCP connect and packet reads / writes by the
// socket timeout, the TLS handshake by the handshake timeout. All waits use
// select(), so the other tasks keep running.
//
// Method names avoid connect / read / write / close: lwIP defines those as
// macros for the socket API.
//
// Use from one task only (TaskNetwork).

#include <stddef.h>
#include <stdint.h>
#include <string>

class MqttClient {
public:
    // PubSubClient state codes (logged as "state=%d").
    static constexpr int kConnectionTimeout = -4;
    static constexpr int kConnectionLost = -3;
    static constexpr int kConnectFailed = -2;
    static constexpr int kDisconnected = -1;
    static constexpr int kConnected = 0;

    using Callback = void (*)(const char* topic, const uint8_t* payload, size_t length);

    MqttClient();
    ~MqttClient();
    MqttClient(const MqttClient&) = delete;
    MqttClient& operator=(const MqttClient&) = delete;

    // Parses the PEM credentials once (mbedTLS keeps the parsed objects).
    // certificate / privateKey empty = no client certificate (mTLS off). The
    // client key must be an EC (P-256) key.
    bool loadCredentials(const std::string& ca, const std::string& certificate, const std::string& privateKey);

    void setServer(const char* host, uint16_t port);
    void setCallback(Callback callback);
    void setKeepAlive(uint16_t seconds);
    void setSocketTimeout(uint16_t seconds);
    void setHandshakeTimeout(uint16_t seconds);
    // Largest MQTT packet (fixed header excluded) sent or received.
    bool setBufferSize(size_t size);

    // TCP + TLS + CONNECT / CONNACK. user / password may be nullptr.
    bool connectBroker(const char* clientId, const char* user, const char* password);
    // Sends DISCONNECT and closes.
    void disconnectBroker();
    // Closes TLS and the socket without DISCONNECT.
    void stopTransport();
    bool isConnected() const;
    int state() const;

    bool subscribeTopic(const char* topic, uint8_t qos);
    bool publishMessage(const char* topic, const char* payload, size_t length, bool retained);
    // Keep alive and at most one incoming packet. false when the connection is gone.
    bool poll();

private:
    struct Tls;
    struct Credentials;

    bool openSocket();
    bool startTls();
    bool sendAll(const uint8_t* data, size_t length);
    bool receiveExact(uint8_t* data, size_t length);
    bool dataAvailable();
    // Reads one packet: header byte and up to bufferSize_ bytes into buffer_.
    // dropped: the packet was larger than the buffer and was discarded.
    bool readPacket(uint8_t& header, size_t& length, bool& dropped);
    bool sendPacket(uint8_t header, size_t length);
    void handlePacket(uint8_t header, size_t length);
    void lostConnection(int newState);

    Tls* tls_ = nullptr;
    Credentials* credentials_ = nullptr;
    std::string host_;
    uint16_t port_ = 0;
    Callback callback_ = nullptr;
    uint16_t keepAliveSeconds_ = 15;
    uint16_t socketTimeoutSeconds_ = 15;
    uint16_t handshakeTimeoutSeconds_ = 15;
    // MQTT packet without its fixed header; 5 more bytes in front of it for
    // the fixed header when sending.
    uint8_t* storage_ = nullptr;
    uint8_t* buffer_ = nullptr;
    size_t bufferSize_ = 0;
    bool connected_ = false;
    bool pingOutstanding_ = false;
    uint16_t nextMessageId_ = 1;
    uint32_t lastInActivityMs_ = 0;
    uint32_t lastOutActivityMs_ = 0;
    int state_ = kDisconnected;
};
