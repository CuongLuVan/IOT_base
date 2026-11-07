#include "WifiProvisioning.h"

#include <WiFi.h>
#include <WiFiProv.h>
#include <string.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "SafeRestart.h"
#include "Sync.h"
#include "define_All.h"

namespace wifi_provisioning {

namespace {

enum class Method : uint8_t {
    None,
    Ble,
    SmartConfig,
};

enum class SmartConfigPhase : uint8_t {
    WaitingForCredentials,
    WaitingForConnection,
};

Method method = Method::None;
SmartConfigPhase smartConfigPhase = SmartConfigPhase::WaitingForCredentials;
uint32_t startedMs = 0;

// Filled by the provisioning events (Arduino event task), used by service().
char receivedSsid[WIFI_SSID_MAX_LENGTH + 1] = {};
char receivedPassword[WIFI_PASS_MAX_LENGTH + 1] = {};
platform_sync::DirtyFlag credentialsConfirmed;

void storeAndRestart(const String& ssid, const String& password)
{
    Memory* memory = Memory::GetInstance();
    if (!memory->writeWifiCredentials(ssid.c_str(), password.c_str())) {
        DEVICE_LOG_ERROR("[Provisioning] Could not store the Wi-Fi credentials");
        return;
    }
    memory->writeByte(EEPROM_ADDR_WIFI_MODE, static_cast<uint8_t>(WifiMode::Station));
    DEVICE_LOGF_INFO("[Provisioning] Wi-Fi \"%s\" stored\n", ssid.c_str());
    safe_restart::restart("provisioned, starting as station");
}

// No credentials arrived: back to the stored network, or to the Wi-Fi page.
void giveUp()
{
    String ssid;
    String password;
    Memory::GetInstance()->readWifiCredentials(ssid, password);
    const WifiMode next = ssid.length() > 0 ? WifiMode::Station : WifiMode::ApPortal;
    Memory::GetInstance()->writeByte(EEPROM_ADDR_WIFI_MODE, static_cast<uint8_t>(next));
    DEVICE_LOG_WARNING("[Provisioning] Timed out");
    safe_restart::restart("provisioning timed out");
}

void copyField(char* destination, size_t destinationSize, const uint8_t* source, size_t sourceSize)
{
    size_t length = strnlen(reinterpret_cast<const char*>(source), sourceSize);
    if (length >= destinationSize) length = destinationSize - 1;
    memcpy(destination, source, length);
    destination[length] = '\0';
}

void onProvisioningEvent(arduino_event_id_t event, arduino_event_info_t info)
{
    switch (event) {
        case ARDUINO_EVENT_PROV_CRED_RECV: {
            platform_sync::CriticalSection section;
            // The IDF fields are not always '\0'-terminated (32 / 64 characters).
            copyField(receivedSsid, sizeof(receivedSsid), info.prov_cred_recv.ssid,
                      sizeof(info.prov_cred_recv.ssid));
            copyField(receivedPassword, sizeof(receivedPassword), info.prov_cred_recv.password,
                      sizeof(info.prov_cred_recv.password));
            break;
        }
        case ARDUINO_EVENT_PROV_CRED_SUCCESS:
            credentialsConfirmed.set();
            break;
        default:
            break;
    }
}

void serviceBle()
{
    if (!credentialsConfirmed.takeIfSet()) return;
    String ssid;
    String password;
    {
        platform_sync::CriticalSection section;
        ssid = receivedSsid;
        password = receivedPassword;
    }
    storeAndRestart(ssid, password);
}

void serviceSmartConfig()
{
    if (smartConfigPhase == SmartConfigPhase::WaitingForCredentials) {
        if (WiFi.smartConfigDone()) {
            DEVICE_LOG_INFO("[Provisioning] SmartConfig credentials received; joining");
            smartConfigPhase = SmartConfigPhase::WaitingForConnection;
        }
        return;
    }
    if (WiFi.status() == WL_CONNECTED) {
        storeAndRestart(WiFi.SSID(), WiFi.psk());
    }
}

}  // namespace

void beginBle(uint32_t nowMs)
{
    method = Method::Ble;
    startedMs = nowMs;
#if CONFIG_BLUEDROID_ENABLED
    WiFi.onEvent(onProvisioningEvent);
    WiFiProv.beginProvision(NETWORK_PROV_SCHEME_BLE, NETWORK_PROV_SCHEME_HANDLER_FREE_BTDM, NETWORK_PROV_SECURITY_1,
                            WIFI_PROV_POP, WIFI_PROV_SERVICE_NAME, nullptr, nullptr, true);
    WiFiProv.printQR(WIFI_PROV_SERVICE_NAME, WIFI_PROV_POP, "ble");
    DEVICE_LOG_INFO("[Provisioning] BLE provisioning started");
#else
    DEVICE_LOG_ERROR("[Provisioning] This build has no Bluetooth; BLE provisioning unavailable");
#endif
}

void beginSmartConfig(uint32_t nowMs)
{
    method = Method::SmartConfig;
    startedMs = nowMs;
    smartConfigPhase = SmartConfigPhase::WaitingForCredentials;
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    if (WiFi.beginSmartConfig()) {
        DEVICE_LOG_INFO("[Provisioning] SmartConfig started");
    } else {
        DEVICE_LOG_ERROR("[Provisioning] SmartConfig could not start");
    }
}

void service(uint32_t nowMs)
{
    if (method == Method::Ble) {
        serviceBle();
    } else if (method == Method::SmartConfig) {
        serviceSmartConfig();
    } else {
        return;
    }
    if (nowMs - startedMs >= WIFI_PROVISIONING_TIMEOUT_MS) {
        giveUp();
    }
}

}  // namespace wifi_provisioning
