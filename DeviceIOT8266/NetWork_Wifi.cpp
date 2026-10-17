#include "NetWork_Wifi.h"

#include <ArduinoJson.h>
#include <stdlib.h>
#include <time.h>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MemoryData.h"
#include "NetWork_RF.h"
#include "define_All.h"

extern NetWork_RF netWork_RF;
extern String lastLoraPayload;
extern InfoSensor sensorValue;
extern InfoDeviceControl statusDevice;
#if SUPPORT_RTOS
extern QueueHandle_t deviceCommandQueue;
#endif

namespace {
DeviceWebServer* webServer = nullptr;
String configuredSsid;
String configuredPassword;
String wifiIp;
bool accessPointActive = false;
uint32_t lastReconnectAttemptMs = 0;
uint32_t connectRequestedMs = 0;
bool ntpRequested = false;

void addNoCacheHeaders() {
    if (webServer == nullptr) {
        return;
    }
    webServer->sendHeader(F("Cache-Control"), F("no-cache, no-store, must-revalidate"));
    webServer->sendHeader(F("Pragma"), F("no-cache"));
    webServer->sendHeader(F("Expires"), F("-1"));
    webServer->sendHeader(F("Access-Control-Allow-Origin"), F("*"));
}

void sendJson(int status, const String& body) {
    if (webServer == nullptr) {
        return;
    }
    addNoCacheHeaders();
    webServer->send(status, F("application/json"), body);
}

void destroyServer() {
    if (webServer != nullptr) {
        webServer->close();
        delete webServer;
        webServer = nullptr;
    }
}

void startServer(bool setupPortal) {
    destroyServer();
    webServer = new DeviceWebServer(WIFI_HTTP_PORT);
    if (setupPortal) {
        webServer->on("/", NetWork_Wifi::handleRoot);
        webServer->on("/setup", HTTP_POST, NetWork_Wifi::handleSetUp);
        webServer->on("/wifi", HTTP_POST, NetWork_Wifi::handleSetUpWifi);
    } else {
        webServer->on("/control", HTTP_POST, NetWork_Wifi::handleControl);
        webServer->on("/update", HTTP_GET, NetWork_Wifi::handleUpdate);
    }
#if SUPPORT_LORA
    webServer->on("/lora", HTTP_GET, NetWork_Wifi::handleLoraGet);
    webServer->on("/lora", HTTP_POST, NetWork_Wifi::handleLoraPost);
#endif
    webServer->begin();
}

void setHostName() {
#if PLATFORM_ESP8266 && !SUPPORT_RTOS
    WiFi.hostname(HOST_POST_INFO);
#else
    WiFi.setHostname(HOST_POST_INFO);
#endif
}

bool loadCredentials() {
    configuredSsid = String();
    configuredPassword = String();
    Memory::GetInstance()->getWiFiCredentials(WIFI_SSSID, WIFI_PASS,
                                               configuredSsid, configuredPassword);
    configuredSsid.trim();
    return configuredSsid.length() > 0;
}

String escapeJson(const String& value) {
    String escaped;
    escaped.reserve(value.length() + 8);
    for (size_t i = 0; i < value.length(); ++i) {
        const char character = value.charAt(i);
        switch (character) {
            case '\\': escaped += F("\\\\"); break;
            case '"': escaped += F("\\\""); break;
            case '\n': escaped += F("\\n"); break;
            case '\r': escaped += F("\\r"); break;
            case '\t': escaped += F("\\t"); break;
            default:
                if (static_cast<uint8_t>(character) >= 0x20) {
                    escaped += character;
                }
                break;
        }
    }
    return escaped;
}

bool parseControlValue(const String& text, uint8_t& value) {
    if (text.length() == 0) {
        return false;
    }
    char* end = nullptr;
    const long parsed = strtol(text.c_str(), &end, 10);
    if (end == text.c_str() || *end != '\0' || parsed < 0 ||
        parsed > DEVICE_OUTPUT_MASK) {
        return false;
    }
    value = static_cast<uint8_t>(parsed);
    return true;
}
} // namespace

void NetWork_Wifi::setHeader() {
    addNoCacheHeaders();
}

void NetWork_Wifi::handleRoot() {
    sendJson(HTTP_STATUS_OK,
             F("{\"device\":\"DeviceIOT8266\",\"mode\":\"configuration\"}"));
}

void NetWork_Wifi::handleSetUp() {
    if (webServer == nullptr || !webServer->hasArg("data")) {
        sendJson(400, F("{\"error\":\"missing data\"}"));
        return;
    }
    const String data = webServer->arg("data");
    StaticJsonDocument<JSON_BUFFER_SIZE> document;
    if (deserializeJson(document, data)) {
        sendJson(400, F("{\"error\":\"invalid JSON\"}"));
        return;
    }
    Memory::GetInstance()->writeString(WIFI_SETUP_JSON, data);
    sendJson(HTTP_STATUS_OK, F("{\"saved\":true}"));
}

void NetWork_Wifi::handleSetUpWifi() {
    if (webServer == nullptr || !webServer->hasArg("data")) {
        sendJson(400, F("{\"error\":\"missing data\"}"));
        return;
    }
    StaticJsonDocument<JSON_SMALL_BUFFER_SIZE> document;
    if (deserializeJson(document, webServer->arg("data"))) {
        sendJson(400, F("{\"error\":\"invalid JSON\"}"));
        return;
    }
    const String ssid = document["ssid"] | "";
    const String password = document["password"] | "";
    if (ssid.length() == 0 || ssid.length() > 32 || password.length() > 63) {
        sendJson(400, F("{\"error\":\"invalid Wi-Fi credentials\"}"));
        return;
    }
    Memory::GetInstance()->saveWiFiCredentials(WIFI_SSSID, WIFI_PASS,
                                                ssid.c_str(), password.c_str());
    Memory::GetInstance()->writeChar(WIFI_MODE, WIFI_START_CONNECT);
    sendJson(HTTP_STATUS_OK, F("{\"saved\":true,\"restart\":true}"));
    delay(150);
    ESP.restart();
}

void NetWork_Wifi::handleControl() {
    if (webServer == nullptr || !webServer->hasArg("com") ||
        !webServer->hasArg("value")) {
        sendJson(400, F("{\"error\":\"missing command\"}"));
        return;
    }

    uint8_t commandValue = 0;
    if (webServer->arg("com") != String(COMMAND_TYPE_CONTROL) ||
        !parseControlValue(webServer->arg("value"), commandValue)) {
        sendJson(400, F("{\"error\":\"invalid control command\"}"));
        return;
    }

    DeviceCommand command = {};
    command.commandType = COMMAND_TYPE_CONTROL;
    command.commandValue = commandValue;
    command.reserved = command.commandType == COMMAND_TYPE_CONTROL
        ? COMMAND_RESERVED_CONTROL : COMMAND_RESERVED_NONE;

#if SUPPORT_RTOS
    if (deviceCommandQueue == nullptr ||
        xQueueSend(deviceCommandQueue, &command, 0) != pdTRUE) {
        sendJson(503, F("{\"error\":\"device queue unavailable\"}"));
        return;
    }
#else
    static DeviceCommand pendingCommand;
    pendingCommand = command;
    MemoryData::GetInstance().deviceCommand_ = &pendingCommand;
#endif
    sendJson(HTTP_STATUS_OK, getInfoDevice(sensorValue, statusDevice));
}

void NetWork_Wifi::handleUpdate() {
    sendJson(HTTP_STATUS_OK, getInfoDevice(sensorValue, statusDevice));
}

void NetWork_Wifi::handleLoraGet() {
#if SUPPORT_LORA
    const String data = lastLoraPayload.length() == 0
        ? String() : escapeJson(lastLoraPayload);
    sendJson(HTTP_STATUS_OK, String(F("{\"data\":\"")) + data + F("\"}"));
#else
    sendJson(503, F("{\"error\":\"LoRa disabled\"}"));
#endif
}

void NetWork_Wifi::handleLoraPost() {
#if SUPPORT_LORA
    if (webServer == nullptr || !webServer->hasArg("data")) {
        sendJson(400, F("{\"error\":\"missing data\"}"));
        return;
    }
    const String data = webServer->arg("data");
    if (data.length() == 0 || data.length() > LORA_MAX_PAYLOAD_SIZE) {
        sendJson(400, F("{\"error\":\"invalid LoRa payload length\"}"));
        return;
    }
    const bool sent = netWork_RF.sendData(data);
    sendJson(sent ? HTTP_STATUS_OK : 503,
             String(F("{\"success\":")) + (sent ? F("true") : F("false")) + F("}"));
#else
    sendJson(503, F("{\"error\":\"LoRa disabled\"}"));
#endif
}

void NetWork_Wifi::startWebServer() {
    startServer(false);
}

void NetWork_Wifi::startWebserverRoot() {
    startServer(true);
}

void NetWork_Wifi::setupHostPost() {
    setupAP();
}

void NetWork_Wifi::loopHostPost() {
    if (webServer != nullptr) {
        webServer->handleClient();
    }
}

void NetWork_Wifi::startWebserverAP() {
    startServer(true);
}

void NetWork_Wifi::setupAP() {
    destroyServer();
    WiFi.disconnect(false);
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD);
    accessPointActive = true;
    DEVICE_LOG_INFO("[WiFi] Configuration AP started");
}

void NetWork_Wifi::loopAP() {
    loopHostPost();
}

void NetWork_Wifi::setupOTA() {
    // OTA is intentionally not started on ESP8266 here; it needs a separately
    // provisioned update policy and must not block the Wi-Fi/MQTT service task.
    DEVICE_LOG_WARNING("[WiFi] OTA mode is unavailable; opening configuration AP");
    setupAP();
    startWebserverAP();
}

void NetWork_Wifi::loopOTA() {
    loopAP();
}

void NetWork_Wifi::connectWifi() {
    if (!loadCredentials()) {
        DEVICE_LOG_WARNING("[WiFi] No stored credentials; opening configuration AP");
        setupAP();
        startWebserverAP();
        return;
    }

    destroyServer();
    WiFi.mode(WIFI_STA);
    setHostName();
    WiFi.setAutoReconnect(true);
    WiFi.begin(configuredSsid.c_str(), configuredPassword.c_str());
    lastReconnectAttemptMs = millis();
    connectRequestedMs = lastReconnectAttemptMs;
    accessPointActive = false;
    DEVICE_LOG_INFO("[WiFi] Connection requested");
}

void NetWork_Wifi::maintainConnection() {
    if (WiFi.status() == WL_CONNECTED) {
        if (accessPointActive) {
            WiFi.softAPdisconnect(true);
            WiFi.mode(WIFI_STA);
            accessPointActive = false;
        }
        return;
    }

    const uint32_t now = millis();
    if (configuredSsid.length() == 0 && !loadCredentials()) {
        if (!accessPointActive) {
            setupAP();
            startWebserverAP();
        }
        return;
    }
    if (!accessPointActive && connectRequestedMs != 0 &&
        now - connectRequestedMs >= WIFI_CONFIG_PORTAL_AFTER_MS) {
        setupAP();
        startWebserverAP();
    }
    if (now - lastReconnectAttemptMs < WIFI_RECONNECT_DELAY_MS) {
        return;
    }
    WiFi.mode(accessPointActive ? WIFI_AP_STA : WIFI_STA);
    setHostName();
    WiFi.begin(configuredSsid.c_str(), configuredPassword.c_str());
    lastReconnectAttemptMs = now;
}

void NetWork_Wifi::getWifiStatusIP() {
    wifiIp = WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : String();
}

void NetWork_Wifi::printWifiStatusIP() {
    DEVICE_LOG_INFO(String("[WiFi] IP: ") + wifiIp);
}

unsigned char NetWork_Wifi::checkWifi() {
    return static_cast<unsigned char>(WiFi.status());
}

uint32_t NetWork_Wifi::getNetworkTimestamp() {
    if (WiFi.status() != WL_CONNECTED) {
        return 0;
    }
    if (!ntpRequested) {
        configTime(0, 0, "pool.ntp.org", "time.nist.gov");
        ntpRequested = true;
    }
    const time_t now = time(nullptr);
    return now >= 1704067200 ? static_cast<uint32_t>(now) : 0;
}

unsigned char NetWork_Wifi::pingNetWork() {
    // A real HTTP probe blocks the cooperative runtime and is unnecessary for
    // link recovery. Wi-Fi association is the health signal used by this sketch.
    return WiFi.status() == WL_CONNECTED ? 1 : 0;
}

void NetWork_Wifi::disconnetWifi() {
    destroyServer();
    WiFi.disconnect(false);
    accessPointActive = false;
}

void NetWork_Wifi::handerHospost() {
    loopHostPost();
}

void NetWork_Wifi::handerClient() {
    loopHostPost();
}

bool NetWork_Wifi::checkModeHostPost() {
    return accessPointActive;
}

void NetWork_Wifi::startSmartConfig() {
    setupAP();
    startWebserverAP();
}

void NetWork_Wifi::setupSmartConfig() {
    setupAP();
    startWebserverAP();
}

void NetWork_Wifi::loopSmartConfig() {
    loopAP();
}

void NetWork_Wifi::setup() {}

void NetWork_Wifi::startProvisioning() {
    setupAP();
    startWebserverAP();
}

void NetWork_Wifi::setupProvisioning() {
    setupAP();
    startWebserverAP();
}

void NetWork_Wifi::loopProvisioning() {
    loopAP();
}
