#include "SetupPortal.h"

#include "DebugInfo.h"
#include "JsonUtil.h"
#include "Memory.h"
#include "PemCheck.h"
#include "define_All.h"

namespace setup_portal {

namespace {

constexpr const char* kDeviceName = "DeviceIOT8266";

// Only the fields NetworkMqtt reads, so the stored JSON fits
// MQTT_SETTINGS_MAX_LENGTH (config.html also sends unused fields).
bool compactMqttSettings(const cJSON* input, std::string& output)
{
    static const char* const kKeys[] = {"mqtt_host", "mqtt_port",    "mqtt_client",   "mqtt_user",
                                        "mqtt_pwd",  "public_topic", "subcribe_topic"};
    json::Ptr compact = json::newObject();
    if (!compact) return false;
    for (const char* key : kKeys) {
        const cJSON* value = json::get(input, key);
        if (value != nullptr && !cJSON_IsNull(value)) {
            cJSON* copy = cJSON_Duplicate(value, 1);
            if (copy == nullptr || !json::set(compact.get(), key, copy)) return false;
        }
    }
    output = json::print(compact.get());
    return !output.empty() && output.size() <= MQTT_SETTINGS_MAX_LENGTH;
}

std::string requestData(const http_server::Request& request)
{
    std::string data = request.arg("data");
    if (data.empty()) {
        data = request.arg("plain");
    }
    return data;
}

void sendError(int status, const char* error)
{
    json::Ptr reply = json::newObject();
    json::setBool(reply.get(), "success", false);
    json::setString(reply.get(), "error", error);
    http_server::sendJson(status, json::print(reply.get()));
}

// Reply of /wifi: the MQTT identity stored by /setup, which the web page
// registers to the user's account (web_manager registerDeviceMqtt).
std::string deviceRegistrationPayload()
{
    json::Ptr stored =
        json::parseObject(Memory::GetInstance()->readString(EEPROM_ADDR_MQTT_SETTINGS, MQTT_SETTINGS_MAX_LENGTH));
    json::Ptr reply = json::newObject();
    cJSON* document = reply.get();
    json::setBool(document, "saved", true);
    json::setBool(document, "restart", true);
    json::setBool(document, "success", true);
    json::setBool(document, "registered", false);
    if (stored) {
        json::setBool(document, "registered", true);
        json::setString(document, "mqtt_id", json::getString(stored.get(), "mqtt_client", ""));
        json::setString(document, "mqtt_pub", json::getString(stored.get(), "public_topic", ""));
        json::setString(document, "mqtt_sub", json::getString(stored.get(), "subcribe_topic", ""));
        json::setString(document, "mqtt_pass", json::getString(stored.get(), "mqtt_pwd", ""));
    }
    return json::print(document);
}

void handleRoot(const http_server::Request& request)
{
    (void)request;
    std::string body = "{\"data\":true,\"device\":\"";
    body += kDeviceName;
    body += "\",\"mode\":\"configuration\"}";
    http_server::sendJson(HTTP_STATUS_OK, body);
}

void handleSetup(const http_server::Request& request)
{
    const std::string data = requestData(request);
    if (data.empty() || data.size() > SETUP_REQUEST_MAX_LENGTH) {
        sendError(400, "invalid_setup_payload_size");
        return;
    }
    json::Ptr setup = json::parseObject(data);
    if (!setup) {
        sendError(400, "invalid_setup_json");
        return;
    }

    if (!json::isString(json::get(setup.get(), "mqtt_ca_cert"))
#if ENABLE_MTLS
        || !json::isString(json::get(setup.get(), "mqtt_client_cert")) ||
        !json::isString(json::get(setup.get(), "mqtt_private_key"))
#endif
    ) {
        sendError(400, "missing_mtls_credentials");
        return;
    }
    const std::string caCertificate = json::getString(setup.get(), "mqtt_ca_cert", "");
    bool credentialsValid = pem::isCertificate(caCertificate) && caCertificate.size() <= MTLS_CA_CERT_MAX_LENGTH;
#if ENABLE_MTLS
    const std::string clientCertificate = json::getString(setup.get(), "mqtt_client_cert", "");
    const std::string privateKey = json::getString(setup.get(), "mqtt_private_key", "");
    credentialsValid = credentialsValid && pem::isCertificate(clientCertificate) && pem::isPrivateKey(privateKey) &&
                       clientCertificate.size() <= MTLS_CLIENT_CERT_MAX_LENGTH &&
                       privateKey.size() <= MTLS_PRIVATE_KEY_MAX_LENGTH;
#endif
    if (!credentialsValid) {
        sendError(400, "invalid_or_oversized_mtls_credentials");
        return;
    }

    std::string mqttSettings;
    if (!compactMqttSettings(setup.get(), mqttSettings)) {
        sendError(400, "mqtt_configuration_too_large");
        return;
    }

#if ENABLE_MESSAGE_AUTHENTICATION
    // keyId / secret of mqttBroker/mqtt_message_auth.json (saveCertificateMqtt).
    const std::string authKeyId = json::getString(setup.get(), "mqtt_auth_key_id", "");
    const std::string authSecret = json::getString(setup.get(), "mqtt_auth_secret", "");
    if (authKeyId.empty() || authSecret.empty() || authKeyId.size() > MESSAGE_AUTH_KEY_ID_MAX_LENGTH ||
        authSecret.size() > MESSAGE_AUTH_SECRET_MAX_LENGTH) {
        sendError(400, "invalid_message_auth_credentials");
        return;
    }
#endif

    const Memory::StringField fields[] = {
        {EEPROM_ADDR_MQTT_SETTINGS, mqttSettings.c_str(), MQTT_SETTINGS_MAX_LENGTH},
        {MTLS_CA_CERT_ADDRESS, caCertificate.c_str(), MTLS_CA_CERT_MAX_LENGTH},
#if ENABLE_MTLS
        {MTLS_CLIENT_CERT_ADDRESS, clientCertificate.c_str(), MTLS_CLIENT_CERT_MAX_LENGTH},
        {MTLS_PRIVATE_KEY_ADDRESS, privateKey.c_str(), MTLS_PRIVATE_KEY_MAX_LENGTH},
#endif
#if ENABLE_MESSAGE_AUTHENTICATION
        {MESSAGE_AUTH_KEY_ID_ADDRESS, authKeyId.c_str(), MESSAGE_AUTH_KEY_ID_MAX_LENGTH},
        {MESSAGE_AUTH_SECRET_ADDRESS, authSecret.c_str(), MESSAGE_AUTH_SECRET_MAX_LENGTH},
#endif
    };
    Memory* memory = Memory::GetInstance();
    if (!memory->writeStrings(fields, sizeof(fields) / sizeof(fields[0]))) {
        DEVICE_LOG_ERROR("[Setup] Could not store the MQTT configuration");
        sendError(500, "configuration_storage_failed");
        return;
    }
    memory->writeByte(EEPROM_ADDR_WIFI_MODE, static_cast<uint8_t>(WifiMode::ApPortal));
    DEVICE_LOG_INFO("[Setup] MQTT configuration stored; restarting into the Wi-Fi page");
    http_server::sendJson(HTTP_STATUS_OK, "{\"success\":true,\"saved\":true,\"restart\":true}");
    http_server::restartAfterReply();
}

void handleWifi(const http_server::Request& request)
{
    const std::string data = requestData(request);
    json::Ptr document;
    if (!data.empty() && data.size() <= SETUP_REQUEST_MAX_LENGTH) document = json::parse(data);
    if (!document) {
        sendError(400, "invalid JSON");
        return;
    }
    const std::string ssid = json::getString(document.get(), "ssid", "");
    const std::string password = json::getString(document.get(), "password", "");
    if (ssid.empty() || ssid.size() > WIFI_SSID_MAX_LENGTH || password.size() > WIFI_PASS_MAX_LENGTH) {
        sendError(400, "invalid Wi-Fi credentials");
        return;
    }
    Memory* memory = Memory::GetInstance();
    if (!memory->writeWifiCredentials(ssid.c_str(), password.c_str())) {
        sendError(500, "credential_storage_failed");
        return;
    }
    memory->writeByte(EEPROM_ADDR_WIFI_MODE, static_cast<uint8_t>(WifiMode::Station));
    DEVICE_LOGF_INFO("[Setup] Wi-Fi \"%s\" stored; restarting as station\n", ssid.c_str());
    http_server::sendJson(HTTP_STATUS_OK, deviceRegistrationPayload());
    http_server::restartAfterReply();
}

}  // namespace

void registerRoutes(http_server::Router& router)
{
    router.on("/", http_server::kMethodAny, handleRoot);
    router.on("/setup", http_server::kMethodPost, handleSetup);
    router.on("/wifi", http_server::kMethodAny, handleWifi);
}

}  // namespace setup_portal
