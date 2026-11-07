#pragma once

// Pages of the setup access point (setup_wifi.html, config.html, the admin
// "DeviceCertificateSetup" page). Both take a form field data=<JSON>:
//   POST /setup  MQTT settings + TLS / mTLS PEMs (+ message-auth key): stored
//                in one EEPROM commit, then WifiMode::ApPortal and restart.
//                Reply {"success":true,...} or {"success":false,"error":...}.
//   ANY  /wifi   {"ssid","password"}: stored, WifiMode::Station and restart.
//                Reply: the stored MQTT identity for web_manager.
//   ANY  /       {"data":true,"device":...,"mode":"configuration"}.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "PlatformCompat.h"

namespace setup_portal {

void registerRoutes(DeviceWebServer& server);

}  // namespace setup_portal
