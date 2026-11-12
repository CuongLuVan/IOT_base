#pragma once

// Wi-Fi link: station with its own reconnect state machine, the access point
// of the setup pages, and the link-health checks (same state machine as
// DeviceIOT8266, docs/Connectivity.md there). Built on esp_wifi / esp_event /
// tcpip_adapter of ESP8266_RTOS_SDK. Call every NetworkWifi method from the
// network task. IPv4 addresses are lwIP u32 values (network byte order).

#include <stdint.h>
#include <string>

// Driver level, usable from any task.
namespace wifi_link {
// TCP/IP stack, default event loop, Wi-Fi driver (RAM storage, no
// auto-connect) and the event handlers. Once from app_main(), before any task.
bool init();
// Associated and holding a DHCP lease.
bool stationHasLease();
// Station address, 0 without a lease.
uint32_t stationAddress();
uint32_t gatewayAddress();
}  // namespace wifi_link

class NetworkWifi {
public:
    enum class LinkState : uint8_t {
        Off,           // Station not started (access point only, or no SSID).
        Disconnected,  // Waiting for the back-off delay before the next attempt.
        Connecting,    // Associating, at most WIFI_CONNECT_TIMEOUT_MS.
        WaitingForIp,  // Associated, DHCP lease within WIFI_DHCP_TIMEOUT_MS.
        Online,        // Lease obtained.
        RadioReset,    // Radio off for WIFI_RADIO_OFF_MS.
    };

    // Joins the stored network. Without a stored SSID the Wi-Fi page access
    // point opens instead and false is returned.
    bool beginStation(uint32_t nowMs);
    // Access point only, for the setup pages; the station stays off.
    void beginAccessPoint(const char* ssid, const char* password);
    // One non-blocking step: link events, reconnect state machine, link
    // checks, access point fallback and the last-resort restart.
    void service(uint32_t nowMs);
    // Drops the lease and joins again, which asks DHCP for a new lease.
    // backoffLevel > 0 first waits like after that many failed attempts.
    void requestReconnect(const char* reason, uint32_t backoffLevel);
    void disconnectWifi();
    LinkState linkState() const;
    static const char* linkStateName(LinkState state);
    bool isOnline() const;
    bool isConfigPortalActive() const;
    // Changes with every new lease and radio reset: servers and sockets bound
    // before must be restarted.
    uint32_t linkGeneration() const;
    uint32_t localIp() const;
    const char* hostname() const;
    uint32_t reconnectCount() const;
    uint32_t lastDisconnectReason() const;
    bool gatewayReachable() const;
    uint32_t addressConflictCount() const;
    int32_t rssi() const;

private:
    enum class CheckPhase : uint8_t {
        Idle,
        WaitingForArp,
    };

    void applyRadioMode();
    void ensureRadioStarted();
    void configureAccessPoint(const char* ssid, const char* password);
    void openAccessPoint(const char* ssid, const char* password, bool fallback);
    void closeFallbackAccessPoint();
    void processEvents(uint32_t nowMs);
    void startAttempt(uint32_t nowMs);
    void attemptFailed(uint32_t nowMs, const char* why);
    void scheduleRetry(uint32_t nowMs, uint32_t backoffLevel);
    void goOnline(uint32_t nowMs);
    void linkLost(uint32_t nowMs, const char* why);
    void enterState(LinkState state, uint32_t nowMs);
    void serviceLinkChecks(uint32_t nowMs);
    void evaluateArp(uint32_t nowMs);
    void serviceAccessPointFallback(uint32_t nowMs);
    void serviceRestartWatchdog(uint32_t nowMs);

    LinkState state_ = LinkState::Off;
    uint32_t stateSinceMs_ = 0;
    uint32_t retryDelayMs_ = 0;
    std::string ssid_;
    std::string password_;

    bool stationEnabled_ = false;
    bool portalActive_ = false;
    bool portalIsFallback_ = false;
    bool radioStarted_ = false;
    bool connectPending_ = false;  // esp_wifi_connect() refused; retried by service().

    uint32_t consecutiveFailures_ = 0;
    uint32_t reconnects_ = 0;
    bool offline_ = true;
    uint32_t offlineSinceMs_ = 0;
    uint32_t ip_ = 0;
    uint32_t linkGeneration_ = 0;

    uint32_t seenConnected_ = 0;
    uint32_t seenDisconnected_ = 0;
    uint32_t seenGotIp_ = 0;
    uint32_t seenLostIp_ = 0;
    uint32_t lastReason_ = 0;

    CheckPhase checkPhase_ = CheckPhase::Idle;
    uint32_t checkPhaseSinceMs_ = 0;
    uint32_t nextCheckDelayMs_ = 0;
    uint32_t gatewayMisses_ = 0;
    uint32_t conflictStreak_ = 0;
    uint32_t conflicts_ = 0;
    bool gatewayOk_ = false;
};
