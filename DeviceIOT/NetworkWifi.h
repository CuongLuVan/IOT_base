#pragma once

// Wi-Fi link: station with its own reconnect state machine, the access point
// of the setup pages, and the link-health checks (docs/Connectivity.md).
// Call every method from the network task.
//
// DeviceIOT pauses ARP probes during high-speed capture.

#include <Arduino.h>
#include <IPAddress.h>
#include <stdint.h>

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
    // No new ARP check starts while paused (a check flushes the ARP cache,
    // which would cost a running high-speed capture datagrams).
    void pauseLinkChecks(bool paused);

    LinkState linkState() const;
    static const char* linkStateName(LinkState state);
    bool isOnline() const;
    bool isConfigPortalActive() const;
    // Changes with every new lease and radio reset: servers and sockets bound
    // before must be restarted.
    uint32_t linkGeneration() const;
    IPAddress localIp() const;
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
    String ssid_;
    String password_;
    char hostname_[32] = {};

    bool stationEnabled_ = false;
    bool portalActive_ = false;
    bool portalIsFallback_ = false;

    uint32_t consecutiveFailures_ = 0;
    uint32_t reconnects_ = 0;
    bool offline_ = true;
    uint32_t offlineSinceMs_ = 0;
    IPAddress ip_;
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
    bool checksPaused_ = false;
};
