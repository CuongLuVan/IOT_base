// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "DeviceHttpApi.h"

#include <ArduinoJson.h>
#include <stdlib.h>

#include "Common.h"
#include "CommandResult.h"
#include "HttpServer.h"
#include "NetworkMqtt.h"
#include "TaskDevice.h"
#include "TaskSensor.h"
#include "define_All.h"

namespace device_http_api {

namespace {

NetworkRF* lora = nullptr;

String deviceInfoPayload()
{
    InfoSensor sensor = {};
    InfoDeviceControl status = {};
    TaskSensor::copyLatest(sensor);
    TaskDevice::copyStatus(status);
    const String info = getInfoDevice(sensor, status);
#if ENABLE_ASCON_AEAD128
    return getAsconEncryptedPayload(info);
#else
    return info;
#endif
}

#if SUPPORT_LORA
String escapeJson(const String& value)
{
    String escaped;
    escaped.reserve(value.length() + 8);
    for (size_t i = 0; i < value.length(); ++i) {
        const char character = value.charAt(i);
        switch (character) {
            case '\\':
                escaped += "\\\\";
                break;
            case '"':
                escaped += "\\\"";
                break;
            default:
                if (static_cast<uint8_t>(character) >= 0x20) {
                    escaped += character;
                }
                break;
        }
    }
    return escaped;
}
#endif

void handleUpdate()
{
    http_server::sendJson(HTTP_STATUS_OK, deviceInfoPayload());
}

#if ENABLE_LAN_CONTROL
bool parseLong(const String& text, long& value)
{
    if (text.length() == 0) return false;
    char* end = nullptr;
    value = strtol(text.c_str(), &end, 10);
    return end != text.c_str() && *end == '\0';
}

// "rs" of the first reply; -1 when there is none.
int firstReplyStatus(const String& replies)
{
    JsonDocument filter;
    filter[0]["rs"] = true;
    JsonDocument document;
    if (deserializeJson(document, replies, DeserializationOption::Filter(filter))) {
        return -1;
    }
    return document[0]["rs"] | -1;
}

void handleControl()
{
    DeviceWebServer& server = http_server::server();
    long com = 0;
    if (!parseLong(server.arg("com"), com)) {
        http_server::sendJson(400, "{\"error\":\"missing command\"}");
        return;
    }
    JsonDocument command;
    command["com"] = com;
    if (server.hasArg("value")) {
        long value = 0;
        if (!parseLong(server.arg("value"), value)) {
            http_server::sendJson(400, "{\"error\":\"invalid control command\"}");
            return;
        }
        command["value"] = value;
    }
    if (server.hasArg("pa")) {
        command["pa"] = server.arg("pa");
    }
    String json;
    serializeJson(command, json);

    const int status = firstReplyStatus(handleLanCommand(json.c_str(), json.length()));
    if (status == toWire(CommandStatus::Ok)) {
        http_server::sendJson(HTTP_STATUS_OK, deviceInfoPayload());
    } else if (status == toWire(CommandStatus::WrongPassword)) {
        http_server::sendJson(403, "{\"error\":\"wrong password\"}");
    } else if (status == toWire(CommandStatus::NotReady) || status == toWire(CommandStatus::Busy)) {
        http_server::sendJson(503, "{\"error\":\"device queue unavailable\"}");
    } else {
        http_server::sendJson(400, "{\"error\":\"invalid control command\"}");
    }
}

void sendLanError(int status, const char* message)
{
    http_server::sendJson(status, String("{\"ip\":\"") + WiFi.localIP().toString() + "\",\"error\":\"" + message +
                                      "\",\"data\":[]}");
}

// CORS preflight of LAN_CONTROL_PATH: web_manager pages call the device
// straight from the user's browser (Chrome also asks before a page reaches
// the LAN).
void handleLanOptions()
{
    DeviceWebServer& server = http_server::server();
    http_server::addCommonHeaders();
    server.sendHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.sendHeader("Access-Control-Allow-Private-Network", "true");
    server.sendHeader("Access-Control-Max-Age", "600");
    server.send(204);
}

// POST LAN_CONTROL_PATH {"data":<MQTT command object or JSON string>}
// -> {"ip":"...","data":[replies]}; 422 when the command gave no reply.
void handleLan()
{
    const String body = http_server::server().arg("plain");
    if (body.length() == 0 || body.length() > LAN_REQUEST_MAX_LENGTH) {
        sendLanError(400, "body must be a JSON object {data: command} within the MQTT packet size");
        return;
    }
    String command;
    {
        JsonDocument request;
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
    http_server::sendJson(HTTP_STATUS_OK,
                          String("{\"ip\":\"") + WiFi.localIP().toString() + "\",\"data\":" + replies + "}");
}
#endif  // ENABLE_LAN_CONTROL

#if SUPPORT_LORA
void handleLoraGet()
{
    const String text = lora != nullptr ? escapeJson(lora->lastText()) : String();
    http_server::sendJson(HTTP_STATUS_OK, String("{\"data\":\"") + text + "\"}");
}

void handleLoraPost()
{
    DeviceWebServer& server = http_server::server();
    const String data = server.arg("data");
    if (data.length() == 0 || data.length() > LORA_MAX_PAYLOAD_SIZE) {
        http_server::sendJson(400, "{\"success\":false,\"error\":\"invalid LoRa payload length\"}");
        return;
    }
    const bool sent = lora != nullptr && lora->sendData(data);
    if (!sent) {
        http_server::sendJson(503, "{\"success\":false,\"data\":\"\"}");
        return;
    }
    http_server::sendJson(HTTP_STATUS_OK, String("{\"success\":true,\"data\":\"") + escapeJson(data) + "\"}");
}
#endif  // SUPPORT_LORA

}  // namespace

void attachLora(NetworkRF& radio)
{
    lora = &radio;
}

void registerRoutes(DeviceWebServer& server)
{
    server.on("/update", HTTP_ANY, handleUpdate);
#if ENABLE_LAN_CONTROL
    server.on("/control", HTTP_ANY, handleControl);
    server.on(LAN_CONTROL_PATH, HTTP_POST, handleLan);
    server.on(LAN_CONTROL_PATH, HTTP_OPTIONS, handleLanOptions);
#endif
    registerLoraRoutes(server);
}

void registerLoraRoutes(DeviceWebServer& server)
{
#if SUPPORT_LORA
    server.on("/lora", HTTP_GET, handleLoraGet);
    server.on("/lora", HTTP_POST, handleLoraPost);
#else
    (void)server;
#endif
}

}  // namespace device_http_api
