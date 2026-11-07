#pragma once

// The device web server (WIFI_HTTP_PORT): one instance at a time, with the
// routes of the setup pages (SetupPortal) or of the station (DeviceHttpApi).
// Call everything from the network task.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>

#include "PlatformCompat.h"

namespace http_server {

enum class Routes : uint8_t {
    None,
    Station,      // /control, /update, /lan, /lora.
    SetupPortal,  // /, /setup, /wifi, /lora.
};

// Replaces the running server (if any) with a new one serving routes.
void start(Routes routes);
void stop();
Routes routes();
// Answers pending requests; performs a restart requested by restartAfterReply().
void service(uint32_t nowMs);

// For request handlers: the server that called them.
DeviceWebServer& server();
// JSON reply with the no-cache and CORS headers.
void sendJson(int status, const String& body);
void addCommonHeaders();
// Restarts WIFI_WEB_RESPONSE_DELAY_MS later, so the current reply still leaves.
void restartAfterReply();

}  // namespace http_server
