#include "NetworkWifi.h"

#include <stdio.h>
#include <string.h>

#include "DebugInfo.h"
#include "LinkProbe.h"
#include "Memory.h"
#include "Platform.h"
#include "SafeRestart.h"
#include "Sync.h"
#include "define_All.h"
#include "esp_event.h"
#include "esp_wifi.h"
#include "tcpip_adapter.h"

namespace {

// Written by the Wi-Fi event handlers (event task), read by the network
// task. The handlers only count and record; the network task acts on the
// changes.
platform_sync::AtomicU32 connectedEvents;
platform_sync::AtomicU32 disconnectedEvents;
platform_sync::AtomicU32 gotIpEvents;
platform_sync::AtomicU32 lostIpEvents;
platform_sync::AtomicU32 disconnectReason;
platform_sync::AtomicU32 associated;

// Set by the network task before the station starts; read by the event handler.
char hostnameText[32] = {};

// Reason the station itself sends when it leaves (WIFI_REASON_ASSOC_LEAVE).
constexpr uint32_t kReasonOwnLeave = 8;

void onWifiEvent(void* argument, esp_event_base_t base, int32_t id, void* data)
{
    (void)argument;
    if (base == WIFI_EVENT) {
        if (id == WIFI_EVENT_STA_START) {
            if (hostnameText[0] != '\0') (void)tcpip_adapter_set_hostname(TCPIP_ADAPTER_IF_STA, hostnameText);
        } else if (id == WIFI_EVENT_STA_CONNECTED) {
            associated.store(1);
            connectedEvents.fetchAdd(1);
        } else if (id == WIFI_EVENT_STA_DISCONNECTED) {
            const wifi_event_sta_disconnected_t* event = static_cast<const wifi_event_sta_disconnected_t*>(data);
            disconnectReason.store(event != nullptr ? event->reason : 0);
            associated.store(0);
            disconnectedEvents.fetchAdd(1);
        } else if (id == WIFI_EVENT_STA_STOP) {
            associated.store(0);
        }
    } else if (base == IP_EVENT) {
        if (id == IP_EVENT_STA_GOT_IP) {
            gotIpEvents.fetchAdd(1);
        } else if (id == IP_EVENT_STA_LOST_IP) {
            lostIpEvents.fetchAdd(1);
        }
    }
}

bool stationAssociated()
{
    return associated.load() != 0;
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

void formatHostname()
{
    uint8_t mac[6] = {};
    (void)esp_wifi_get_mac(ESP_IF_WIFI_STA, mac);
    snprintf(hostnameText, sizeof(hostnameText), "%s%02x%02x%02x", DEVICE_HOSTNAME_PREFIX, mac[3], mac[4], mac[5]);
}

size_t copyLimited(uint8_t* destination, size_t capacity, const char* source)
{
    const size_t length = strlen(source);
    const size_t copied = length < capacity ? length : capacity;
    memcpy(destination, source, copied);
    return copied;
}

uint32_t accessPointAddress()
{
    tcpip_adapter_ip_info_t info;
    memset(&info, 0, sizeof(info));
    if (tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_AP, &info) != ESP_OK) return 0;
    return info.ip.addr;
}

}  // namespace

namespace wifi_link {

bool init()
{
    tcpip_adapter_init();
    const esp_err_t loop = esp_event_loop_create_default();
    // ESP_ERR_INVALID_STATE: the default loop exists already.
    if (loop != ESP_OK && loop != ESP_ERR_INVALID_STATE) {
        DEVICE_LOG_ERROR("[WiFi] Cannot create the event loop");
        return false;
    }
    wifi_init_config_t config = WIFI_INIT_CONFIG_DEFAULT();
    if (esp_wifi_init(&config) != ESP_OK) {
        DEVICE_LOG_ERROR("[WiFi] Driver initialization failed");
        return false;
    }
    // WiFi.persistent(false): nothing is written to the SDK flash area.
    (void)esp_wifi_set_storage(WIFI_STORAGE_RAM);
    if (esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &onWifiEvent, nullptr) != ESP_OK ||
        esp_event_handler_register(IP_EVENT, ESP_EVENT_ANY_ID, &onWifiEvent, nullptr) != ESP_OK) {
        DEVICE_LOG_ERROR("[WiFi] Cannot register the event handlers");
        return false;
    }
    formatHostname();
    return true;
}

bool stationHasLease()
{
    return stationAssociated() && stationAddress() != 0;
}

uint32_t stationAddress()
{
    if (!stationAssociated()) return 0;
    tcpip_adapter_ip_info_t info;
    memset(&info, 0, sizeof(info));
    if (tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_STA, &info) != ESP_OK) return 0;
    return info.ip.addr;
}

uint32_t gatewayAddress()
{
    tcpip_adapter_ip_info_t info;
    memset(&info, 0, sizeof(info));
    if (tcpip_adapter_get_ip_info(TCPIP_ADAPTER_IF_STA, &info) != ESP_OK) return 0;
    return info.gw.addr;
}

}  // namespace wifi_link

bool NetworkWifi::beginStation(uint32_t nowMs)
{
    Memory::GetInstance()->readWifiCredentials(ssid_, password_);
    trimString(ssid_);
    offline_ = true;
    offlineSinceMs_ = nowMs;
    if (ssid_.empty()) {
        DEVICE_LOG_WARNING("[WiFi] No stored network; opening the Wi-Fi page access point");
        beginAccessPoint(WIFI_AP_SSID, WIFI_AP_PASSWORD);
        return false;
    }
    stationEnabled_ = true;
    applyRadioMode();
    DEVICE_LOGF_INFO("[WiFi] Joining \"%s\" as %s\n", ssid_.c_str(), hostnameText);
    startAttempt(nowMs);
    return true;
}

void NetworkWifi::beginAccessPoint(const char* ssid, const char* password)
{
    stationEnabled_ = false;
    enterState(LinkState::Off, millis());
    openAccessPoint(ssid, password, false);
}

void NetworkWifi::ensureRadioStarted()
{
    if (radioStarted_) return;
    if (esp_wifi_start() == ESP_OK) {
        radioStarted_ = true;
    } else {
        DEVICE_LOG_ERROR("[WiFi] esp_wifi_start failed");
    }
}

void NetworkWifi::applyRadioMode()
{
    (void)esp_wifi_set_mode(portalActive_ ? WIFI_MODE_APSTA : WIFI_MODE_STA);
    ensureRadioStarted();
    // Modem sleep off (WIFI_NONE_SLEEP) and no SDK auto-reconnect: the state
    // machine below decides when to join.
    (void)esp_wifi_set_ps(WIFI_PS_NONE);
    (void)tcpip_adapter_set_hostname(TCPIP_ADAPTER_IF_STA, hostnameText);
}

void NetworkWifi::configureAccessPoint(const char* ssid, const char* password)
{
    wifi_config_t config;
    memset(&config, 0, sizeof(config));
    config.ap.ssid_len = static_cast<uint8_t>(copyLimited(config.ap.ssid, sizeof(config.ap.ssid), ssid));
    const size_t passwordLength = copyLimited(config.ap.password, sizeof(config.ap.password) - 1, password);
    config.ap.channel = 1;
    config.ap.max_connection = 4;
    config.ap.beacon_interval = 100;
    config.ap.authmode = passwordLength >= 8 ? WIFI_AUTH_WPA_WPA2_PSK : WIFI_AUTH_OPEN;
    if (esp_wifi_set_config(ESP_IF_WIFI_AP, &config) != ESP_OK) {
        DEVICE_LOG_ERROR("[WiFi] Access point configuration rejected");
    }
}

void NetworkWifi::openAccessPoint(const char* ssid, const char* password, bool fallback)
{
    (void)esp_wifi_set_mode(stationEnabled_ ? WIFI_MODE_APSTA : WIFI_MODE_AP);
    configureAccessPoint(ssid, password);
    ensureRadioStarted();
    portalActive_ = true;
    portalIsFallback_ = fallback;
    ++linkGeneration_;
    DEVICE_LOGF_INFO("[WiFi] Access point \"%s\" open at %s\n", ssid, ipToString(accessPointAddress()).c_str());
}

void NetworkWifi::closeFallbackAccessPoint()
{
    if (!portalActive_ || !portalIsFallback_) return;
    (void)esp_wifi_set_mode(WIFI_MODE_STA);
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
    wifi_config_t config;
    memset(&config, 0, sizeof(config));
    copyLimited(config.sta.ssid, sizeof(config.sta.ssid), ssid_.c_str());
    copyLimited(config.sta.password, sizeof(config.sta.password) - 1, password_.c_str());
    (void)esp_wifi_set_config(ESP_IF_WIFI_STA, &config);
    // Right after esp_wifi_start() the driver may still refuse; service() retries.
    connectPending_ = esp_wifi_connect() != ESP_OK;
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
    (void)esp_wifi_disconnect();
    if (consecutiveFailures_ % WIFI_HARD_RESET_AFTER_FAILURES == 0) {
        DEVICE_LOGF_WARNING("[WiFi] Attempt %lu failed (%s); radio reset\n",
                            static_cast<unsigned long>(consecutiveFailures_), why);
        (void)esp_wifi_stop();
        radioStarted_ = false;
        associated.store(0);
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
    const uint32_t address = wifi_link::stationAddress();
    wifi_ap_record_t accessPoint;
    memset(&accessPoint, 0, sizeof(accessPoint));
    const int rssiValue = esp_wifi_sta_get_ap_info(&accessPoint) == ESP_OK ? accessPoint.rssi : 0;
    DEVICE_LOGF_INFO("[WiFi] Online, IP %s%s, RSSI %d dBm\n", ipToString(address).c_str(),
                     address != ip_ ? " (new address)" : "", rssiValue);
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
    (void)esp_wifi_disconnect();
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
    (void)esp_wifi_disconnect();
    scheduleRetry(nowMs, backoffLevel);
}

void NetworkWifi::disconnectWifi()
{
    if (portalActive_) {
        (void)esp_wifi_set_mode(WIFI_MODE_STA);
        portalActive_ = false;
        portalIsFallback_ = false;
    }
    stationEnabled_ = false;
    (void)esp_wifi_disconnect();
    enterState(LinkState::Off, millis());
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
        if ((state_ == LinkState::Connecting || state_ == LinkState::WaitingForIp) && wifi_link::stationHasLease()) {
            goOnline(nowMs);
        }
    }
}

void NetworkWifi::service(uint32_t nowMs)
{
    if (!stationEnabled_) return;
    processEvents(nowMs);
    switch (state_) {
        case LinkState::Disconnected:
            if (nowMs - stateSinceMs_ >= retryDelayMs_) startAttempt(nowMs);
            break;
        case LinkState::Connecting:
            if (connectPending_) connectPending_ = esp_wifi_connect() != ESP_OK;
            if (wifi_link::stationHasLease()) {
                goOnline(nowMs);
            } else if (stationAssociated()) {
                enterState(LinkState::WaitingForIp, nowMs);
            } else if (nowMs - stateSinceMs_ >= WIFI_CONNECT_TIMEOUT_MS) {
                attemptFailed(nowMs, "connect timeout");
            }
            break;
        case LinkState::WaitingForIp:
            if (wifi_link::stationHasLease()) {
                goOnline(nowMs);
            } else if (nowMs - stateSinceMs_ >= WIFI_DHCP_TIMEOUT_MS) {
                attemptFailed(nowMs, "DHCP timeout");
            }
            break;
        case LinkState::Online:
            if (!wifi_link::stationHasLease()) {
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
                    configureAccessPoint(WIFI_AP_SSID, WIFI_AP_PASSWORD);
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

void NetworkWifi::serviceLinkChecks(uint32_t nowMs)
{
    if (!link_probe::arpSupported()) return;
    if (checkPhase_ == CheckPhase::Idle) {
        if (nowMs - checkPhaseSinceMs_ < nextCheckDelayMs_) return;
        checkPhaseSinceMs_ = nowMs;
        if (link_probe::startArp(wifi_link::stationAddress(), wifi_link::gatewayAddress())) {
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
    const link_probe::ArpReport report = link_probe::finishArp(wifi_link::stationAddress(), wifi_link::gatewayAddress());
    checkPhase_ = CheckPhase::Idle;
    checkPhaseSinceMs_ = nowMs;
    nextCheckDelayMs_ = WIFI_LINK_CHECK_INTERVAL_MS;
    if (!report.valid) return;

    if (report.duplicateAddress) {
        ++conflicts_;
        ++conflictStreak_;
        DEVICE_LOGF_WARNING("[WiFi] IP %s is also used by %02x:%02x:%02x:%02x:%02x:%02x\n",
                            ipToString(wifi_link::stationAddress()).c_str(), report.otherMac[0], report.otherMac[1],
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
        DEVICE_LOGF_WARNING("[WiFi] Gateway %s did not answer ARP (%lu/%u)\n",
                            ipToString(wifi_link::gatewayAddress()).c_str(), static_cast<unsigned long>(gatewayMisses_),
                            static_cast<unsigned>(WIFI_GATEWAY_FAIL_LIMIT));
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
    if (portalActive_) {
        wifi_sta_list_t stations;
        memset(&stations, 0, sizeof(stations));
        if (esp_wifi_ap_get_sta_list(&stations) == ESP_OK && stations.num > 0) return;
    }
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

uint32_t NetworkWifi::localIp() const
{
    return isOnline() ? ip_ : 0;
}

const char* NetworkWifi::hostname() const
{
    return hostnameText;
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
    if (!isOnline()) return 0;
    wifi_ap_record_t accessPoint;
    memset(&accessPoint, 0, sizeof(accessPoint));
    return esp_wifi_sta_get_ap_info(&accessPoint) == ESP_OK ? accessPoint.rssi : 0;
}
