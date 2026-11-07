// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "NetworkWifi.h"

#include "DebugInfo.h"
#include "LinkProbe.h"
#include "Memory.h"
#include "PlatformCompat.h"
#include "SafeRestart.h"
#include "Sync.h"
#include "define_All.h"

#if defined(ESP32)
#include <esp_mac.h>
#endif

namespace {

// Written by the Wi-Fi event handlers (the Arduino event task on ESP32), read
// by the network task. The handlers only count and record; the network task
// acts on the changes.
platform_sync::AtomicU32 connectedEvents;
platform_sync::AtomicU32 disconnectedEvents;
platform_sync::AtomicU32 gotIpEvents;
platform_sync::AtomicU32 lostIpEvents;
platform_sync::AtomicU32 disconnectReason;

// Reason the station itself sends when it leaves (WIFI_REASON_ASSOC_LEAVE).
constexpr uint32_t kReasonOwnLeave = 8;

#if defined(ESP32)
void onWifiEvent(arduino_event_id_t event, arduino_event_info_t info)
{
    switch (event) {
        case ARDUINO_EVENT_WIFI_STA_CONNECTED:
            connectedEvents.fetchAdd(1);
            break;
        case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
            disconnectReason.store(info.wifi_sta_disconnected.reason);
            disconnectedEvents.fetchAdd(1);
            break;
        case ARDUINO_EVENT_WIFI_STA_GOT_IP:
            gotIpEvents.fetchAdd(1);
            break;
        case ARDUINO_EVENT_WIFI_STA_LOST_IP:
            lostIpEvents.fetchAdd(1);
            break;
        default:
            break;
    }
}

void registerEventHandlers()
{
    static bool registered = false;
    if (registered) return;
    WiFi.onEvent(onWifiEvent);
    registered = true;
}
#elif ESP8266_NONOS_CORE
WiFiEventHandler connectedHandler;
WiFiEventHandler disconnectedHandler;
WiFiEventHandler gotIpHandler;
WiFiEventHandler dhcpTimeoutHandler;

void registerEventHandlers()
{
    if (connectedHandler) return;
    connectedHandler = WiFi.onStationModeConnected([](const WiFiEventStationModeConnected&) {
        connectedEvents.fetchAdd(1);
    });
    disconnectedHandler = WiFi.onStationModeDisconnected([](const WiFiEventStationModeDisconnected& event) {
        disconnectReason.store(static_cast<uint32_t>(event.reason));
        disconnectedEvents.fetchAdd(1);
    });
    gotIpHandler = WiFi.onStationModeGotIP([](const WiFiEventStationModeGotIP&) {
        gotIpEvents.fetchAdd(1);
    });
    dhcpTimeoutHandler = WiFi.onStationModeDHCPTimeout([]() {
        lostIpEvents.fetchAdd(1);
    });
}
#else
// ESP8266 RTOS core: no event handlers; the state machine polls WiFi.status().
void registerEventHandlers() {}
#endif

bool stationHasLease()
{
    return WiFi.status() == WL_CONNECTED && static_cast<uint32_t>(WiFi.localIP()) != 0;
}

// Half fixed, half random, so devices that lost the same access point do not
// all retry at the same moment.
uint32_t backoffDelayMs(uint32_t level)
{
    uint32_t delayMs = WIFI_BACKOFF_MIN_MS;
    for (uint32_t i = 1; i < level && delayMs < WIFI_BACKOFF_MAX_MS; ++i) {
        delayMs *= 2;
    }
    if (delayMs > WIFI_BACKOFF_MAX_MS) delayMs = WIFI_BACKOFF_MAX_MS;
    return delayMs / 2 + deviceSecureRandom32() % (delayMs / 2 + 1);
}

void formatHostname(char* out, size_t size)
{
    uint8_t mac[6] = {};
#if defined(ESP32)
    esp_read_mac(mac, ESP_MAC_WIFI_STA);
#else
    WiFi.macAddress(mac);
#endif
    snprintf(out, size, "%s%02x%02x%02x", DEVICE_HOSTNAME_PREFIX, mac[3], mac[4], mac[5]);
}

}  // namespace

bool NetworkWifi::beginStation(uint32_t nowMs)
{
    formatHostname(hostname_, sizeof(hostname_));
    Memory::GetInstance()->readWifiCredentials(ssid_, password_);
    ssid_.trim();
    offline_ = true;
    offlineSinceMs_ = nowMs;
    if (ssid_.length() == 0) {
        DEVICE_LOG_WARNING("[WiFi] No stored network; opening the Wi-Fi page access point");
        beginAccessPoint(WIFI_AP_SSID, WIFI_AP_PASSWORD);
        return false;
    }
    stationEnabled_ = true;
    registerEventHandlers();
    applyRadioMode();
    DEVICE_LOGF_INFO("[WiFi] Joining \"%s\" as %s\n", ssid_.c_str(), hostname_);
    startAttempt(nowMs);
    return true;
}

void NetworkWifi::beginAccessPoint(const char* ssid, const char* password)
{
    if (hostname_[0] == '\0') {
        formatHostname(hostname_, sizeof(hostname_));
    }
    stationEnabled_ = false;
    enterState(LinkState::Off, millis());
    openAccessPoint(ssid, password, false);
}

void NetworkWifi::applyRadioMode()
{
    WiFi.persistent(false);
#if defined(ESP32)
    WiFi.setHostname(hostname_);
    WiFi.mode(portalActive_ ? WIFI_AP_STA : WIFI_STA);
    WiFi.setSleep(false);
#elif ESP8266_NONOS_CORE
    WiFi.mode(portalActive_ ? WIFI_AP_STA : WIFI_STA);
    WiFi.hostname(hostname_);
    WiFi.setSleepMode(WIFI_NONE_SLEEP);
#else
    WiFi.setHostname(hostname_);
    WiFi.mode(portalActive_ ? WIFI_AP_STA : WIFI_STA);
    WiFi.setSleep(false);
#endif
    WiFi.setAutoReconnect(false);
}

void NetworkWifi::openAccessPoint(const char* ssid, const char* password, bool fallback)
{
    WiFi.persistent(false);
    WiFi.mode(stationEnabled_ ? WIFI_AP_STA : WIFI_AP);
    WiFi.softAP(ssid, password);
    portalActive_ = true;
    portalIsFallback_ = fallback;
    ++linkGeneration_;
    DEVICE_LOGF_INFO("[WiFi] Access point \"%s\" open at %s\n", ssid, WiFi.softAPIP().toString().c_str());
}

void NetworkWifi::closeFallbackAccessPoint()
{
    if (!portalActive_ || !portalIsFallback_) return;
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    portalActive_ = false;
    portalIsFallback_ = false;
    DEVICE_LOG_INFO("[WiFi] Station online again; access point closed");
}

void NetworkWifi::enterState(LinkState state, uint32_t nowMs)
{
    state_ = state;
    stateSinceMs_ = nowMs;
}

void NetworkWifi::startAttempt(uint32_t nowMs)
{
    WiFi.begin(ssid_.c_str(), password_.c_str());
    // Late events of the previous attempt must not end this one.
    seenConnected_ = connectedEvents.load();
    seenDisconnected_ = disconnectedEvents.load();
    seenLostIp_ = lostIpEvents.load();
    enterState(LinkState::Connecting, nowMs);
}

void NetworkWifi::scheduleRetry(uint32_t nowMs, uint32_t backoffLevel)
{
    retryDelayMs_ = backoffDelayMs(backoffLevel);
    enterState(LinkState::Disconnected, nowMs);
}

void NetworkWifi::attemptFailed(uint32_t nowMs, const char* why)
{
    ++consecutiveFailures_;
    WiFi.disconnect(false);
    if (consecutiveFailures_ % WIFI_HARD_RESET_AFTER_FAILURES == 0) {
        DEVICE_LOGF_WARNING("[WiFi] Attempt %lu failed (%s); radio reset\n",
                            static_cast<unsigned long>(consecutiveFailures_), why);
        WiFi.disconnect(true);
        WiFi.mode(WIFI_OFF);
        enterState(LinkState::RadioReset, nowMs);
        return;
    }
    scheduleRetry(nowMs, consecutiveFailures_);
    DEVICE_LOGF_WARNING("[WiFi] Attempt %lu failed (%s); retry in %lu ms\n",
                        static_cast<unsigned long>(consecutiveFailures_), why,
                        static_cast<unsigned long>(retryDelayMs_));
}

void NetworkWifi::goOnline(uint32_t nowMs)
{
    const IPAddress address = WiFi.localIP();
    if (address != ip_) {
        DEVICE_LOGF_INFO("[WiFi] Online, IP %s (new address), RSSI %d dBm\n", address.toString().c_str(),
                         static_cast<int>(WiFi.RSSI()));
    } else {
        DEVICE_LOGF_INFO("[WiFi] Online, IP %s, RSSI %d dBm\n", address.toString().c_str(),
                         static_cast<int>(WiFi.RSSI()));
    }
    ip_ = address;
    ++linkGeneration_;
    consecutiveFailures_ = 0;
    offline_ = false;
    gatewayMisses_ = 0;
    gatewayOk_ = true;
    checkPhase_ = CheckPhase::Idle;
    checkPhaseSinceMs_ = nowMs;
    nextCheckDelayMs_ = WIFI_LINK_FIRST_CHECK_MS;
    enterState(LinkState::Online, nowMs);
    closeFallbackAccessPoint();
}

void NetworkWifi::linkLost(uint32_t nowMs, const char* why)
{
    DEVICE_LOGF_WARNING("[WiFi] Link lost (%s)\n", why);
    ++reconnects_;
    offline_ = true;
    offlineSinceMs_ = nowMs;
    gatewayOk_ = false;
    WiFi.disconnect(false);
    scheduleRetry(nowMs, 0);
}

void NetworkWifi::requestReconnect(const char* reason, uint32_t backoffLevel)
{
    if (!stationEnabled_) return;
    const uint32_t nowMs = millis();
    DEVICE_LOGF_WARNING("[WiFi] Reconnecting: %s\n", reason);
    ++reconnects_;
    if (!offline_) {
        offline_ = true;
        offlineSinceMs_ = nowMs;
    }
    gatewayOk_ = false;
    WiFi.disconnect(false);
    scheduleRetry(nowMs, backoffLevel);
}

void NetworkWifi::disconnectWifi()
{
    if (portalActive_) {
        WiFi.softAPdisconnect(true);
        portalActive_ = false;
        portalIsFallback_ = false;
    }
    stationEnabled_ = false;
    WiFi.disconnect(false);
    enterState(LinkState::Off, millis());
}

void NetworkWifi::pauseLinkChecks(bool paused)
{
    checksPaused_ = paused;
}

void NetworkWifi::processEvents(uint32_t nowMs)
{
    const uint32_t disconnected = disconnectedEvents.load();
    if (disconnected != seenDisconnected_) {
        seenDisconnected_ = disconnected;
        lastReason_ = disconnectReason.load();
        if (lastReason_ == kReasonOwnLeave && state_ != LinkState::Online) {
            DEVICE_LOGF_DEBUG("[WiFi] Station left the access point, reason %lu\n",
                              static_cast<unsigned long>(lastReason_));
        } else {
            DEVICE_LOGF_WARNING("[WiFi] Station disconnected, reason %lu\n", static_cast<unsigned long>(lastReason_));
        }
        if (state_ == LinkState::Online) {
            linkLost(nowMs, "disconnected");
        } else if ((state_ == LinkState::Connecting || state_ == LinkState::WaitingForIp) &&
                   lastReason_ != kReasonOwnLeave) {
            attemptFailed(nowMs, "rejected by the access point");
        }
    }

    const uint32_t lostIp = lostIpEvents.load();
    if (lostIp != seenLostIp_) {
        seenLostIp_ = lostIp;
        if (state_ == LinkState::Online) {
            linkLost(nowMs, "lease lost");
        } else if (state_ == LinkState::WaitingForIp) {
            attemptFailed(nowMs, "DHCP timeout");
        }
    }

    const uint32_t connected = connectedEvents.load();
    if (connected != seenConnected_) {
        seenConnected_ = connected;
        if (state_ == LinkState::Connecting) {
            enterState(LinkState::WaitingForIp, nowMs);
        }
    }

    const uint32_t gotIp = gotIpEvents.load();
    if (gotIp != seenGotIp_) {
        seenGotIp_ = gotIp;
        if ((state_ == LinkState::Connecting || state_ == LinkState::WaitingForIp) && stationHasLease()) {
            goOnline(nowMs);
        }
    }
}

void NetworkWifi::service(uint32_t nowMs)
{
    if (stationEnabled_) {
        processEvents(nowMs);
        switch (state_) {
            case LinkState::Disconnected:
                if (nowMs - stateSinceMs_ >= retryDelayMs_) startAttempt(nowMs);
                break;
            case LinkState::Connecting:
                if (stationHasLease()) {
                    goOnline(nowMs);
                } else if (WiFi.status() == WL_CONNECTED) {
                    enterState(LinkState::WaitingForIp, nowMs);
                } else if (nowMs - stateSinceMs_ >= WIFI_CONNECT_TIMEOUT_MS) {
                    attemptFailed(nowMs, "connect timeout");
                }
                break;
            case LinkState::WaitingForIp:
                if (stationHasLease()) {
                    goOnline(nowMs);
                } else if (nowMs - stateSinceMs_ >= WIFI_DHCP_TIMEOUT_MS) {
                    attemptFailed(nowMs, "DHCP timeout");
                }
                break;
            case LinkState::Online:
                if (!stationHasLease()) {
                    linkLost(nowMs, "status poll");
                } else {
                    serviceLinkChecks(nowMs);
                }
                break;
            case LinkState::RadioReset:
                if (nowMs - stateSinceMs_ >= WIFI_RADIO_OFF_MS) {
                    applyRadioMode();
                    if (portalActive_) {
                        // With the station enabled the access point is always the fallback one.
                        WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD);
                        ++linkGeneration_;
                    }
                    startAttempt(nowMs);
                }
                break;
            case LinkState::Off:
                break;
        }
        serviceAccessPointFallback(nowMs);
        serviceRestartWatchdog(nowMs);
    }
}

void NetworkWifi::serviceLinkChecks(uint32_t nowMs)
{
    if (!link_probe::arpSupported()) return;
    if (checkPhase_ == CheckPhase::Idle) {
        if (checksPaused_ || nowMs - checkPhaseSinceMs_ < nextCheckDelayMs_) return;
        checkPhaseSinceMs_ = nowMs;
        if (link_probe::startArp(WiFi.localIP(), WiFi.gatewayIP())) {
            checkPhase_ = CheckPhase::WaitingForArp;
        } else {
            nextCheckDelayMs_ = WIFI_LINK_RECHECK_MS;
        }
        return;
    }
    if (nowMs - checkPhaseSinceMs_ >= WIFI_ARP_REPLY_WAIT_MS) {
        evaluateArp(nowMs);
    }
}

void NetworkWifi::evaluateArp(uint32_t nowMs)
{
    const link_probe::ArpReport report = link_probe::finishArp(WiFi.localIP(), WiFi.gatewayIP());
    checkPhase_ = CheckPhase::Idle;
    checkPhaseSinceMs_ = nowMs;
    nextCheckDelayMs_ = WIFI_LINK_CHECK_INTERVAL_MS;
    if (!report.valid) return;

    if (report.duplicateAddress) {
        ++conflicts_;
        ++conflictStreak_;
        DEVICE_LOGF_WARNING("[WiFi] IP %s is also used by %02x:%02x:%02x:%02x:%02x:%02x\n",
                            WiFi.localIP().toString().c_str(), report.otherMac[0], report.otherMac[1],
                            report.otherMac[2], report.otherMac[3], report.otherMac[4], report.otherMac[5]);
        if (conflictStreak_ >= WIFI_IP_CONFLICT_CONFIRMATIONS) {
            requestReconnect("IP address conflict", conflictStreak_ - WIFI_IP_CONFLICT_CONFIRMATIONS);
        } else {
            nextCheckDelayMs_ = WIFI_LINK_RECHECK_MS;
        }
        return;
    }
    conflictStreak_ = 0;

    if (!report.gatewayAnswered) {
        ++gatewayMisses_;
        gatewayOk_ = false;
        DEVICE_LOGF_WARNING("[WiFi] Gateway %s did not answer ARP (%lu/%u)\n", WiFi.gatewayIP().toString().c_str(),
                            static_cast<unsigned long>(gatewayMisses_), static_cast<unsigned>(WIFI_GATEWAY_FAIL_LIMIT));
        if (gatewayMisses_ >= WIFI_GATEWAY_FAIL_LIMIT) {
            gatewayMisses_ = 0;
            requestReconnect("gateway unreachable", 0);
        } else {
            nextCheckDelayMs_ = WIFI_LINK_RECHECK_MS;
        }
        return;
    }
    gatewayMisses_ = 0;
    gatewayOk_ = true;
}

void NetworkWifi::serviceAccessPointFallback(uint32_t nowMs)
{
    if (portalActive_ || !offline_ || nowMs - offlineSinceMs_ < WIFI_CONFIG_PORTAL_AFTER_MS) return;
    DEVICE_LOG_WARNING("[WiFi] Station offline too long; opening the Wi-Fi page access point");
    openAccessPoint(WIFI_AP_SSID, WIFI_AP_PASSWORD, true);
}

void NetworkWifi::serviceRestartWatchdog(uint32_t nowMs)
{
#if WIFI_RESTART_AFTER_OFFLINE_MS > 0
    if (!offline_ || nowMs - offlineSinceMs_ < WIFI_RESTART_AFTER_OFFLINE_MS) return;
    if (portalActive_ && WiFi.softAPgetStationNum() > 0) return;
    DEVICE_LOG_ERROR("[WiFi] No lease for WIFI_RESTART_AFTER_OFFLINE_MS");
    safe_restart::restart("Wi-Fi offline too long");
#else
    (void)nowMs;
#endif
}

NetworkWifi::LinkState NetworkWifi::linkState() const
{
    return state_;
}

const char* NetworkWifi::linkStateName(LinkState state)
{
    switch (state) {
        case LinkState::Disconnected:
            return "disconnected";
        case LinkState::Connecting:
            return "connecting";
        case LinkState::WaitingForIp:
            return "dhcp";
        case LinkState::Online:
            return "online";
        case LinkState::RadioReset:
            return "radio_reset";
        case LinkState::Off:
        default:
            return "off";
    }
}

bool NetworkWifi::isOnline() const
{
    return state_ == LinkState::Online;
}

bool NetworkWifi::isConfigPortalActive() const
{
    return portalActive_;
}

uint32_t NetworkWifi::linkGeneration() const
{
    return linkGeneration_;
}

IPAddress NetworkWifi::localIp() const
{
    return isOnline() ? ip_ : IPAddress();
}

const char* NetworkWifi::hostname() const
{
    return hostname_;
}

uint32_t NetworkWifi::reconnectCount() const
{
    return reconnects_;
}

uint32_t NetworkWifi::lastDisconnectReason() const
{
    return lastReason_;
}

bool NetworkWifi::gatewayReachable() const
{
    return isOnline() && gatewayOk_;
}

uint32_t NetworkWifi::addressConflictCount() const
{
    return conflicts_;
}

int32_t NetworkWifi::rssi() const
{
    return isOnline() ? static_cast<int32_t>(WiFi.RSSI()) : 0;
}
