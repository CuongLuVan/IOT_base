#include "TaskNetwork.h"

#include "Clock.h"
#include "Common.h"
#include "DebugInfo.h"
#include "DeviceHttpApi.h"
#include "HttpServer.h"
#include "JsonUtil.h"
#include "LinkProbe.h"
#include "Memory.h"
#include "NetworkMqtt.h"
#include "NetworkRF.h"
#include "NetworkWifi.h"
#include "Platform.h"
#include "SafeRestart.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "TaskSensor.h"
#include "TaskWatchdog.h"
#include "define_All.h"

namespace {

// Wait before publishing again after a failed device-state publish.
constexpr uint32_t kPublishRetryMs = 1000;

// What the network runs, from the stored WifiMode.
enum class Role : uint8_t {
    Station,      // WifiMode::Station: MQTT, LAN API.
    SetupPortal,  // No valid mode stored: SETUP_PORTAL_AP_SSID, /setup first.
    WifiPage,     // WifiMode::ApPortal: WIFI_AP_SSID, /wifi.
};

NetworkWifi wifi;
NetworkMqtt mqtt;
#if SUPPORT_LORA
NetworkRF lora;
#endif

Role role = Role::SetupPortal;

InfoSensor sensor = {};
InfoDeviceControl status = {};
bool haveSensor = false;
bool haveStatus = false;
bool sensorDirty = false;
bool statusDirty = false;
bool sensorPublished = false;
uint32_t lastSensorPublishMs = 0;
uint32_t lastInfoFailureMs = 0;
bool infoFailed = false;
bool telemetrySent = false;
uint32_t lastTelemetryMs = 0;

bool mqttWasConnected = false;
bool mqttAttempted = false;
uint32_t lastMqttAttemptMs = 0;

uint32_t httpLinkGeneration = 0;
uint32_t socketLinkGeneration = 0;

std::string brokerHost;
bool dnsProbed = false;
uint32_t lastDnsProbeMs = 0;
link_probe::DnsState dnsHealth = link_probe::DnsState::Idle;
bool mqttDown = false;
uint32_t mqttDownSinceMs = 0;
bool internetCycleDone = false;

const char* roleName(Role value)
{
    switch (value) {
        case Role::Station:
            return "station";
        case Role::WifiPage:
            return "Wi-Fi page";
        case Role::SetupPortal:
        default:
            return "setup portal";
    }
}

Role readRole()
{
    switch (static_cast<WifiMode>(Memory::GetInstance()->readByte(EEPROM_ADDR_WIFI_MODE))) {
        case WifiMode::Station:
            return Role::Station;
        case WifiMode::ApPortal:
            return Role::WifiPage;
        case WifiMode::BleProvision:
        case WifiMode::SmartConfig:
        case WifiMode::Ota:
            DEVICE_LOG_WARNING("[Network] Stored Wi-Fi mode is unsupported; opening the Wi-Fi page");
            return Role::WifiPage;
        default:
            return Role::SetupPortal;
    }
}

std::string readBrokerHost()
{
    json::Ptr settings =
        json::parseObject(Memory::GetInstance()->readString(EEPROM_ADDR_MQTT_SETTINGS, MQTT_SETTINGS_MAX_LENGTH));
    return json::getString(settings.get(), "mqtt_host", "");
}

void collectTaskState()
{
    InfoSensor latestSensor;
    if (TaskSensor::copyLatest(latestSensor) && (!haveSensor || latestSensor.sampleSequence != sensor.sampleSequence)) {
        sensor = latestSensor;
        haveSensor = true;
        sensorDirty = true;
    }
    InfoDeviceControl latestStatus;
    if (TaskDevice::copyStatus(latestStatus) && (!haveStatus || latestStatus.count_info != status.count_info)) {
        status = latestStatus;
        haveStatus = true;
        statusDirty = true;
    }
}

// A new lease (or radio reset): sockets bound before are stale.
void onNewLease()
{
    DEVICE_LOGF_INFO("[Network] Link up as %s (%s)\n", ipToString(wifi.localIp()).c_str(), wifi.hostname());
    if (role == Role::Station) {
        mqtt.disconnect();
        mqttAttempted = false;
    }
}

// Broker reachability while Wi-Fi is online: a DNS probe of the broker host at
// most every DNS_PROBE_INTERVAL_MS, and one Wi-Fi cycle after
// INTERNET_DOWN_RECONNECT_MS without MQTT.
void serviceInternetHealth(uint32_t nowMs)
{
    if (role != Role::Station || !wifi.isOnline()) {
        mqttDown = false;
        return;
    }
    if (mqtt.isConnected()) {
        mqttDown = false;
        internetCycleDone = false;
        dnsHealth = link_probe::DnsState::Resolved;
        return;
    }
    if (!mqttDown) {
        mqttDown = true;
        mqttDownSinceMs = nowMs;
    }
    if (link_probe::dnsSupported() && !brokerHost.empty() &&
        (!dnsProbed || nowMs - lastDnsProbeMs >= DNS_PROBE_INTERVAL_MS)) {
        dnsProbed = true;
        lastDnsProbeMs = nowMs;
        link_probe::startDns(brokerHost.c_str(), nowMs);
    }
    const link_probe::DnsState dns = link_probe::dnsState(nowMs);
    if ((dns == link_probe::DnsState::Resolved || dns == link_probe::DnsState::Failed) && dns != dnsHealth) {
        if (dns == link_probe::DnsState::Failed) {
            DEVICE_LOGF_WARNING("[Network] Broker host %s does not resolve\n", brokerHost.c_str());
        } else {
            DEVICE_LOGF_INFO("[Network] Broker host %s resolves\n", brokerHost.c_str());
        }
        dnsHealth = dns;
    }
    if (!internetCycleDone && nowMs - mqttDownSinceMs >= INTERNET_DOWN_RECONNECT_MS) {
        internetCycleDone = true;
        DEVICE_LOGF_WARNING("[Network] Broker unreachable for %lu s (DNS %s)\n",
                            static_cast<unsigned long>((nowMs - mqttDownSinceMs) / 1000UL),
                            link_probe::dnsStateName(dnsHealth));
        wifi.requestReconnect("broker unreachable", 0);
    }
}

void serviceConnectivity(uint32_t nowMs)
{
    wifi.service(nowMs);
    const bool online = wifi.isOnline();
    if (online && wifi.linkGeneration() != socketLinkGeneration) {
        socketLinkGeneration = wifi.linkGeneration();
        onNewLease();
    }
    if (online) {
        device_clock::startSync();
    }
    serviceInternetHealth(nowMs);
}

void serviceHttp(uint32_t nowMs)
{
    http_server::Routes wanted = http_server::Routes::None;
    if (wifi.isConfigPortalActive()) {
        wanted = http_server::Routes::SetupPortal;
    } else if (wifi.isOnline() && role == Role::Station) {
        wanted = http_server::Routes::Station;
    }
    if (wanted != http_server::routes() ||
        (wanted != http_server::Routes::None && wifi.linkGeneration() != httpLinkGeneration)) {
        http_server::start(wanted);
        httpLinkGeneration = wifi.linkGeneration();
    }
    http_server::service(nowMs);
}

void serviceMqtt(uint32_t nowMs)
{
    if (role != Role::Station || !wifi.isOnline()) {
        mqttWasConnected = false;
        return;
    }
    if (!mqtt.isConnected()) {
        // A connect blocks the network task for up to the TCP + TLS + CONNACK
        // timeouts. Attempt it only once the asynchronous DNS probe resolved
        // the broker host, so the connect does not wait for DNS and an
        // unknown host costs nothing.
        const bool connectAllowed = !link_probe::dnsSupported() || dnsHealth == link_probe::DnsState::Resolved;
        if (connectAllowed && (!mqttAttempted || nowMs - lastMqttAttemptMs >= MQTT_RETRY_INTERVAL_MS)) {
            mqttAttempted = true;
            lastMqttAttemptMs = nowMs;
            task_watchdog::reset(task_watchdog::Slot::Network);
            mqtt.connect();
            task_watchdog::reset(task_watchdog::Slot::Network);
        }
    }
    mqtt.loop();
    const bool connected = mqtt.isConnected();
    if (connected && !mqttWasConnected) {
        statusDirty = haveStatus;  // Publish the current state after every (re)connect.
        telemetrySent = false;
    }
    mqttWasConnected = connected;
}

void receiveLora()
{
#if SUPPORT_LORA
    std::string text;
    if (!lora.receiveText(text) || !mqtt.isConnected()) return;
    json::Ptr event = json::newObject();
    if (!event) return;
    json::setString(event.get(), "event", "lora.receive");
    json::setString(event.get(), "data", text);
    json::setNumber(event.get(), "rssi", lora.packetRssi());
    json::setNumber(event.get(), "snr", lora.packetSnr());
    mqtt.publish(json::print(event.get()));
#endif
}

std::string networkHealthJson()
{
    json::Ptr owner = json::newObject();
    cJSON* health = owner.get();
    if (health == nullptr) return std::string();
    json::setString(health, "link", NetworkWifi::linkStateName(wifi.linkState()));
    json::setString(health, "ip", ipToString(wifi.localIp()));
    json::setString(health, "host", wifi.hostname());
    json::setNumber(health, "rssi", wifi.rssi());
    json::setBool(health, "gateway", wifi.gatewayReachable());
    json::setString(health, "dns", link_probe::dnsStateName(dnsHealth));
    json::setBool(health, "mqtt", mqtt.isConnected());
    json::setNumber(health, "reconnects", wifi.reconnectCount());
    json::setNumber(health, "reason", wifi.lastDisconnectReason());
    json::setNumber(health, "conflicts", wifi.addressConflictCount());
    json::setBool(health, "portal", wifi.isConfigPortalActive());
    return json::print(health);
}

// System telemetry with the "net" block; sent as two messages when the
// combined one does not fit the MQTT packet.
void publishSystemTelemetry()
{
    const std::string system = SystemTask::telemetryJson();
    if (system.empty() || system[system.size() - 1] != '}') return;
    const std::string net = networkHealthJson();
    std::string telemetry;
    telemetry.reserve(system.size() + net.size() + 8);
    telemetry += system;
    telemetry.erase(telemetry.size() - 1);
    telemetry += ",\"net\":";
    telemetry += net;
    telemetry += '}';
    if (mqtt.publish(telemetry) || !mqtt.isConnected()) return;
    telemetry.clear();
    if (mqtt.publish(system)) {
        mqtt.publish(std::string("{\"net\":") + net + "}");
    }
}

void publishTelemetry(uint32_t nowMs)
{
    if (!mqtt.isConnected()) return;

    const bool sensorDue =
        sensorDirty && (!sensorPublished || nowMs - lastSensorPublishMs >= SENSOR_PUBLISH_MIN_INTERVAL_MS);
    const bool retryDue = !infoFailed || nowMs - lastInfoFailureMs >= kPublishRetryMs;
    if ((statusDirty || sensorDue) && retryDue) {
        // The flags stay set until a publish succeeds, so a failed one is retried.
        if (mqtt.publish(getInfoDevice(sensor, status))) {
            if (sensorDirty) {
                sensorPublished = true;
                lastSensorPublishMs = nowMs;
            }
            sensorDirty = false;
            statusDirty = false;
            infoFailed = false;
        } else {
            infoFailed = true;
            lastInfoFailureMs = nowMs;
        }
    }

    if (!telemetrySent || nowMs - lastTelemetryMs >= SYSTEM_TASK_TELEMETRY_INTERVAL_MS) {
        telemetrySent = true;
        lastTelemetryMs = nowMs;
        publishSystemTelemetry();
    }
}

}  // namespace

void TaskNetwork::setup()
{
    const uint32_t nowMs = millis();
    if (!wifi_link::init()) {
        DEVICE_LOG_ERROR("[Network] Wi-Fi driver unavailable; network disabled");
    }
    role = readRole();
    DEVICE_LOGF_INFO("[Network] Starting in %s mode\n", roleName(role));
#if SUPPORT_LORA
    if (lora.begin()) {
        DEVICE_LOG_INFO("[LoRa] Initialized in polling mode");
    } else {
        DEVICE_LOG_ERROR("[LoRa] Initialization failed");
    }
    device_http_api::attachLora(lora);
#endif

    switch (role) {
        case Role::Station:
            if (wifi.beginStation(nowMs)) {
                mqtt.begin();
                brokerHost = readBrokerHost();
            }
            break;
        case Role::WifiPage:
            wifi.beginAccessPoint(WIFI_AP_SSID, WIFI_AP_PASSWORD);
            break;
        case Role::SetupPortal:
        default:
            wifi.beginAccessPoint(SETUP_PORTAL_AP_SSID, SETUP_PORTAL_AP_PASSWORD);
            break;
    }
}

void TaskNetwork::service()
{
    const uint32_t nowMs = millis();
    collectTaskState();
    serviceConnectivity(nowMs);
    task_watchdog::reset(task_watchdog::Slot::Network);
    serviceHttp(nowMs);
    task_watchdog::reset(task_watchdog::Slot::Network);
    serviceMqtt(nowMs);
    receiveLora();
    publishTelemetry(nowMs);
    const bool online = wifi.isOnline();
    SystemTask::setNetworkState(online, mqtt.isConnected(), online);
}

void TaskNetwork::taskRun(void* parameter)
{
    (void)parameter;
    task_watchdog::add(task_watchdog::Slot::Network);
    for (;;) {
        service();
        task_watchdog::reset(task_watchdog::Slot::Network);
        vTaskDelay(delayTicks(NETWORK_TASK_PERIOD_MS));
    }
}
