#pragma once

// HTTP API of a device that is online as a station (same as DeviceIOT8266):
//   ANY  /update   device info (getInfoDevice, Ascon-encrypted when enabled).
//   ANY  /control  ?com=&value=&pa=: runs {"com","value","pa"} through the
//                  LAN command path (handleLanCommand); 200 + device info,
//                  400 invalid, 403 wrong password, 503 device busy.
//   POST /lan      {"data":<MQTT command>} -> {"ip":"...","data":[replies]}.
//   GET/POST /lora last received LoRa text / send data= (SUPPORT_LORA).
// /control and /lan exist when ENABLE_LAN_CONTROL is 1.

#include "HttpServer.h"
#include "NetworkRF.h"

namespace device_http_api {

// The radio /lora uses; call once from the network task setup.
void attachLora(NetworkRF& radio);
void registerRoutes(http_server::Router& router);
// /lora, also served by the setup pages.
void registerLoraRoutes(http_server::Router& router);

}  // namespace device_http_api
