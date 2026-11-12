#pragma once

// Pages of the setup access point (same API as DeviceIOT8266). Both take a
// form field data=<JSON> (or the raw JSON body):
//   POST /setup  MQTT settings + TLS / mTLS PEMs (+ message-auth key): stored
//                in one commit, then WifiMode::ApPortal and restart.
//                Reply {"success":true,...} or {"success":false,"error":...}.
//   ANY  /wifi   {"ssid","password"}: stored, WifiMode::Station and restart.
//                Reply: the stored MQTT identity for web_manager.
//   ANY  /       {"data":true,"device":...,"mode":"configuration"}.

#include "HttpServer.h"

namespace setup_portal {

void registerRoutes(http_server::Router& router);

}  // namespace setup_portal
