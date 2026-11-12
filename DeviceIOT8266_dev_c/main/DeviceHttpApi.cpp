#include "DeviceHttpApi.h"

#include <stdlib.h>

#include "CommandResult.h"
#include "Common.h"
#include "JsonUtil.h"
#include "NetworkMqtt.h"
#include "NetworkWifi.h"
#include "Platform.h"
#include "TaskDevice.h"
#include "TaskSensor.h"
#include "define_All.h"

namespace device_http_api {

namespace {

NetworkRF* lora = nullptr;

std::string deviceInfoPayload()
{
    InfoSensor sensor = {};
    InfoDeviceControl status = {};
    TaskSensor::copyLatest(sensor);
    TaskDevice::copyStatus(status);
    const std::string info = getInfoDevice(sensor, status);
#if ENABLE_ASCON_AEAD128
    return getAsconEncryptedPayload(info);
#else
    return info;
#endif
}

std::string stationIp()
{
    return ipToString(wifi_link::stationAddress());
}

#if SUPPORT_LORA
std::string escapeJson(const std::string& value)
{
    std::string escaped;
    escaped.reserve(value.size() + 8);
    for (const char character : value) {
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

void handleUpdate(const http_server::Request& request)
{
    (void)request;
    http_server::sendJson(HTTP_STATUS_OK, deviceInfoPayload());
}

#if ENABLE_LAN_CONTROL
bool parseLong(const std::string& text, long& value)
{
    if (text.empty()) return false;
    char* end = nullptr;
    value = strtol(text.c_str(), &end, 10);
    return end != text.c_str() && *end == '\0';
}

// "rs" of the first reply; -1 when there is none.
int firstReplyStatus(const std::string& replies)
{
    json::Ptr document = json::parse(replies);
    if (!document || !cJSON_IsArray(document.get())) return -1;
    const cJSON* first = cJSON_GetArrayItem(document.get(), 0);
    long status = -1;
    if (!json::isInteger(json::get(first, "rs"), status)) return -1;
    return static_cast<int>(status);
}

void handleControl(const http_server::Request& request)
{
    long com = 0;
    if (!parseLong(request.arg("com"), com)) {
        http_server::sendJson(400, "{\"error\":\"missing command\"}");
        return;
    }
    json::Ptr command = json::newObject();
    json::setNumber(command.get(), "com", com);
    if (request.hasArg("value")) {
        long value = 0;
        if (!parseLong(request.arg("value"), value)) {
            http_server::sendJson(400, "{\"error\":\"invalid control command\"}");
            return;
        }
        json::setNumber(command.get(), "value", value);
    }
    if (request.hasArg("pa")) {
        json::setString(command.get(), "pa", request.arg("pa"));
    }
    const std::string text = json::print(command.get());

    const int status = firstReplyStatus(handleLanCommand(text.c_str(), text.size()));
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
    http_server::sendJson(status, std::string("{\"ip\":\"") + stationIp() + "\",\"error\":\"" + message +
                                      "\",\"data\":[]}");
}

// CORS preflight of LAN_CONTROL_PATH: web_manager pages call the device
// straight from the user's browser (Chrome also asks before a page reaches
// the LAN).
void handleLanOptions(const http_server::Request& request)
{
    (void)request;
    http_server::addCommonHeaders();
    http_server::addHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    http_server::addHeader("Access-Control-Allow-Headers", "Content-Type");
    http_server::addHeader("Access-Control-Allow-Private-Network", "true");
    http_server::addHeader("Access-Control-Max-Age", "600");
    http_server::sendEmpty(204);
}

// POST LAN_CONTROL_PATH {"data":<MQTT command object or JSON string>}
// -> {"ip":"...","data":[replies]}; 422 when the command gave no reply.
void handleLan(const http_server::Request& request)
{
    const std::string body = request.arg("plain");
    if (body.empty() || body.size() > LAN_REQUEST_MAX_LENGTH) {
        sendLanError(400, "body must be a JSON object {data: command} within the MQTT packet size");
        return;
    }
    std::string command;
    {
        json::Ptr parsed = json::parseObject(body);
        if (!parsed) {
            sendLanError(400, "invalid JSON");
            return;
        }
        const cJSON* data = json::get(parsed.get(), "data");
        if (json::isString(data)) {
            command = data->valuestring;
        } else if (json::isObject(data)) {
            command = json::print(data);
        }
    }
    if (command.empty()) {
        sendLanError(400, "data must be an MQTT command");
        return;
    }
    const std::string replies = handleLanCommand(command.c_str(), command.size());
    if (replies.size() <= 2) {
        sendLanError(422, "command rejected or unknown");
        return;
    }
    http_server::sendJson(HTTP_STATUS_OK, std::string("{\"ip\":\"") + stationIp() + "\",\"data\":" + replies + "}");
}
#endif  // ENABLE_LAN_CONTROL

#if SUPPORT_LORA
void handleLoraGet(const http_server::Request& request)
{
    (void)request;
    const std::string text = lora != nullptr ? escapeJson(lora->lastText()) : std::string();
    http_server::sendJson(HTTP_STATUS_OK, std::string("{\"data\":\"") + text + "\"}");
}

void handleLoraPost(const http_server::Request& request)
{
    const std::string data = request.arg("data");
    if (data.empty() || data.size() > LORA_MAX_PAYLOAD_SIZE) {
        http_server::sendJson(400, "{\"success\":false,\"error\":\"invalid LoRa payload length\"}");
        return;
    }
    const bool sent = lora != nullptr && lora->sendData(data);
    if (!sent) {
        http_server::sendJson(503, "{\"success\":false,\"data\":\"\"}");
        return;
    }
    http_server::sendJson(HTTP_STATUS_OK, std::string("{\"success\":true,\"data\":\"") + escapeJson(data) + "\"}");
}
#endif  // SUPPORT_LORA

}  // namespace

void attachLora(NetworkRF& radio)
{
    lora = &radio;
}

void registerRoutes(http_server::Router& router)
{
    router.on("/update", http_server::kMethodAny, handleUpdate);
#if ENABLE_LAN_CONTROL
    router.on("/control", http_server::kMethodAny, handleControl);
    router.on(LAN_CONTROL_PATH, http_server::kMethodPost, handleLan);
    router.on(LAN_CONTROL_PATH, http_server::kMethodOptions, handleLanOptions);
#endif
    registerLoraRoutes(router);
}

void registerLoraRoutes(http_server::Router& router)
{
#if SUPPORT_LORA
    router.on("/lora", http_server::kMethodGet, handleLoraGet);
    router.on("/lora", http_server::kMethodPost, handleLoraPost);
#else
    (void)router;
#endif
}

}  // namespace device_http_api
