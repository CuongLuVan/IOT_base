#include "SetupPortal.h"

#include <ArduinoJson.h>

#include "DebugInfo.h"
#include "HttpServer.h"
#include "Memory.h"
#include "PemCheck.h"
#include "define_All.h"

namespace setup_portal {

namespace {

constexpr const char* kDeviceName = "DeviceIOT8266";

// Only the fields NetworkMqtt reads, so the stored JSON fits
// MQTT_SETTINGS_MAX_LENGTH (config.html also sends unused fields).
bool compactMqttSettings(const JsonDocument& input, String& output)
{
    static const char* const kKeys[] = {"mqtt_host",    "mqtt_port",     "mqtt_client", "mqtt_user",
                                        "mqtt_pwd",     "public_topic",  "subcribe_topic"};
    JsonDocument compact;
    for (const char* key : kKeys) {
        JsonVariantConst value = input[key];
        if (!value.isNull()) {
            compact[key] = value;
        }
    }
    output = String();
    return serializeJson(compact, output) > 0 && !compact.overflowed() && output.length() <= MQTT_SETTINGS_MAX_LENGTH;
}

String requestData()
{
    DeviceWebServer& server = http_server::server();
    String data = server.arg("data");
    if (data.length() == 0) {
        data = server.arg("plain");
    }
    return data;
}

void sendError(int status, const char* error)
{
    JsonDocument reply;
    reply["success"] = false;
    reply["error"] = error;
    String body;
    serializeJson(reply, body);
    http_server::sendJson(status, body);
}

// Reply of /wifi: the MQTT identity stored by /setup, which the web page
// registers to the user's account (web_manager registerDeviceMqtt).
String deviceRegistrationPayload()
{
    JsonDocument stored;
    const String settings = Memory::GetInstance()->readString(EEPROM_ADDR_MQTT_SETTINGS, MQTT_SETTINGS_MAX_LENGTH);
    JsonDocument reply;
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

void handleRoot()
{
    String body = "{\"data\":true,\"device\":\"";
    body += kDeviceName;
    body += "\",\"mode\":\"configuration\"}";
    http_server::sendJson(HTTP_STATUS_OK, body);
}

void handleSetup()
{
    const String data = requestData();
    if (data.length() == 0 || data.length() > SETUP_REQUEST_MAX_LENGTH) {
        sendError(400, "invalid_setup_payload_size");
        return;
    }
    JsonDocument setup;
    if (deserializeJson(setup, data) || !setup.is<JsonObject>()) {
        sendError(400, "invalid_setup_json");
        return;
    }

    if (!setup["mqtt_ca_cert"].is<const char*>()
#if ENABLE_MTLS
        || !setup["mqtt_client_cert"].is<const char*>() || !setup["mqtt_private_key"].is<const char*>()
#endif
    ) {
        sendError(400, "missing_mtls_credentials");
        return;
    }
    const String caCertificate = setup["mqtt_ca_cert"] | "";
    bool credentialsValid = pem::isCertificate(caCertificate) && caCertificate.length() <= MTLS_CA_CERT_MAX_LENGTH;
#if ENABLE_MTLS
    const String clientCertificate = setup["mqtt_client_cert"] | "";
    const String privateKey = setup["mqtt_private_key"] | "";
    credentialsValid = credentialsValid && pem::isCertificate(clientCertificate) && pem::isPrivateKey(privateKey) &&
                       clientCertificate.length() <= MTLS_CLIENT_CERT_MAX_LENGTH &&
                       privateKey.length() <= MTLS_PRIVATE_KEY_MAX_LENGTH;
#endif
    if (!credentialsValid) {
        sendError(400, "invalid_or_oversized_mtls_credentials");
        return;
    }

    String mqttSettings;
    if (!compactMqttSettings(setup, mqttSettings)) {
        sendError(400, "mqtt_configuration_too_large");
        return;
    }

#if ENABLE_MESSAGE_AUTHENTICATION
    // keyId / secret of mqttBroker/mqtt_message_auth.json (saveCertificateMqtt).
    const String authKeyId = setup["mqtt_auth_key_id"] | "";
    const String authSecret = setup["mqtt_auth_secret"] | "";
    if (authKeyId.length() == 0 || authSecret.length() == 0 || authKeyId.length() > MESSAGE_AUTH_KEY_ID_MAX_LENGTH ||
        authSecret.length() > MESSAGE_AUTH_SECRET_MAX_LENGTH) {
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

void handleWifi()
{
    const String data = requestData();
    JsonDocument document;
    if (data.length() == 0 || data.length() > SETUP_REQUEST_MAX_LENGTH || deserializeJson(document, data)) {
        sendError(400, "invalid JSON");
        return;
    }
    const String ssid = document["ssid"] | "";
    const String password = document["password"] | "";
    if (ssid.length() == 0 || ssid.length() > WIFI_SSID_MAX_LENGTH || password.length() > WIFI_PASS_MAX_LENGTH) {
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

void registerRoutes(DeviceWebServer& server)
{
    server.on("/", HTTP_ANY, handleRoot);
    server.on("/setup", HTTP_POST, handleSetup);
    server.on("/wifi", HTTP_ANY, handleWifi);
}

}  // namespace setup_portal
