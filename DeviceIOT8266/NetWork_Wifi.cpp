#include "NetWork_Wifi.h"

#include <ArduinoJson.h>
#include <stdlib.h>
#include <time.h>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "MemoryData.h"
#include "NetWork_Mqtt.h"
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
// Device info sent to the mobile app is Ascon-encrypted like MQTT data.
String httpInfoPayload() {
#if ENABLE_ASCON_AEAD128
    return getAsconEncryptedPayload(getInfoDevice(sensorValue, statusDevice));
#else
    return getInfoDevice(sensorValue, statusDevice);
#endif
}

// Keeps only the fields NetWork_Mqtt reads, so the stored JSON fits
// WIFI_SETUP_JSON_MAX_LENGTH (config.html also sends unused fields).
bool compactMqttSettings(const JsonDocument& input, String& output) {
    static const char* const kKeys[] = {
        "mqtt_host", "mqtt_port", "mqtt_client", "mqtt_user", "mqtt_pwd",
        "public_topic", "subcribe_topic"
    };
    StaticJsonDocument<JSON_BUFFER_SIZE> compact;
    for (const char* key : kKeys) {
        if (input.containsKey(key)) {
            compact[key] = input[key];
        }
    }
    output = String();
    return serializeJson(compact, output) > 0 && !compact.overflowed() &&
           output.length() <= WIFI_SETUP_JSON_MAX_LENGTH;
}

// Reply of /wifi: the MQTT identity stored by /setup, which the web page
// registers to the user's account (web_manager registerDeviceMqtt).
String deviceRegistrationPayload() {
    StaticJsonDocument<JSON_BUFFER_SIZE> stored;
    const String settings = Memory::GetInstance()->readString(WIFI_SETUP_JSON, WIFI_SETUP_JSON_MAX_LENGTH);
    StaticJsonDocument<JSON_BUFFER_SIZE> reply;
    reply["saved"] = true;
    reply["restart"] = true;
    reply["success"] = true;
    reply["registered"] = false;
    if (!deserializeJson(stored, settings)) {
        reply["registered"] = true;
        reply["mqtt_id"] = stored["mqtt_client"] | "";
        reply["mqtt_pub"] = stored["public_topic"] | "";
        reply["mqtt_sub"] = stored["subcribe_topic"] | "";
        reply["mqtt_pass"] = stored["mqtt_pwd"] | "";
    }
    String payload;
    serializeJson(reply, payload);
    return payload;
}

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
#if ENABLE_LAN_CONTROL
        webServer->on(LAN_CONTROL_PATH, HTTP_POST, NetWork_Wifi::handleLan);
        webServer->on(LAN_CONTROL_PATH, HTTP_OPTIONS, NetWork_Wifi::handleLanOptions);
#endif
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
    String settings;
    if (!compactMqttSettings(document, settings)) {
        sendJson(400, F("{\"error\":\"MQTT settings too large\"}"));
        return;
    }
    Memory::GetInstance()->writeString(WIFI_SETUP_JSON, settings);
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
    sendJson(HTTP_STATUS_OK, deviceRegistrationPayload());
    delay(150);
    ESP.restart();
}

#if ENABLE_LAN_CONTROL
static void sendLanError(int status, const char* message) {
    sendJson(status, String(F("{\"ip\":\"")) + WiFi.localIP().toString() +
                     F("\",\"error\":\"") + message + F("\",\"data\":[]}"));
}
#endif

void NetWork_Wifi::handleControl() {
    if (webServer == nullptr || !webServer->hasArg("com") ||
        !webServer->hasArg("value")) {
        sendJson(400, F("{\"error\":\"missing command\"}"));
        return;
    }
#if ENABLE_COMMAND_PASSWORD
    if (!commandPasswordMatches(webServer->arg("pa").c_str())) {
        sendJson(403, F("{\"error\":\"wrong password\"}"));
        return;
    }
#endif

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
    sendJson(HTTP_STATUS_OK, httpInfoPayload());
}

void NetWork_Wifi::handleUpdate() {
    sendJson(HTTP_STATUS_OK, httpInfoPayload());
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

#if ENABLE_LAN_CONTROL
// CORS preflight of LAN_CONTROL_PATH: web_manager pages call the device
// straight from the user's browser (Chrome also asks before a page reaches
// the LAN).
void NetWork_Wifi::handleLanOptions() {
    if (webServer == nullptr) {
        return;
    }
    addNoCacheHeaders();
    webServer->sendHeader(F("Access-Control-Allow-Methods"), F("POST, OPTIONS"));
    webServer->sendHeader(F("Access-Control-Allow-Headers"), F("Content-Type"));
    webServer->sendHeader(F("Access-Control-Allow-Private-Network"), F("true"));
    webServer->sendHeader(F("Access-Control-Max-Age"), F("600"));
    webServer->send(204);
}

// POST LAN_CONTROL_PATH {"data":<MQTT command object or JSON string>}
// -> {"ip":"...","data":[replies]}; 422 when the command gave no reply.
void NetWork_Wifi::handleLan() {
    if (webServer == nullptr) {
        return;
    }
    const String body = webServer->arg("plain");
    if (body.length() == 0 || body.length() > LAN_REQUEST_MAX_LENGTH) {
        sendLanError(400, "body must be a JSON object {data: command} within the MQTT packet size");
        return;
    }
    String command;
    {
        DynamicJsonDocument request(body.length() + MQTT_JSON_DOC_SIZE);
        if (deserializeJson(request, body) || !request.is<JsonObject>()) {
            sendLanError(400, "invalid JSON");
            return;
        }
        JsonVariantConst data = request["data"];
        if (data.is<const char*>()) {
            command = data.as<const char*>();
        } else if (data.is<JsonObjectConst>()) {
            serializeJson(data, command);
        }
    }
    if (command.length() == 0) {
        sendLanError(400, "data must be an MQTT command");
        return;
    }
    const String replies = handleLanCommand(command.c_str(), command.length());
    if (replies.length() <= 2) {
        sendLanError(422, "command rejected or unknown");
        return;
    }
    sendJson(HTTP_STATUS_OK, String(F("{\"ip\":\"")) + WiFi.localIP().toString() +
                             F("\",\"data\":") + replies + F("}"));
}
#endif

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
        configTime(SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS, 0,
                   "pool.ntp.org", "time.nist.gov");
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
