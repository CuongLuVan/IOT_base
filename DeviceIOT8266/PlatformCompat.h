#pragma once

// APIs shared by the supported ESP8266 cores:
//   SUPPORT_RTOS == 0: official esp8266/Arduino (NON-OS SDK)
//   SUPPORT_RTOS == 1: alexCajas/esp8266RTOSArduCore (FreeRTOS)
//
#include <Arduino.h>

#include "define_All.h"

#if ESP8266_NONOS_CORE
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
extern "C" {
#include <user_interface.h>
}
using DeviceWebServerBase = ESP8266WebServer;
#else
#include <WebServer.h>
#include <WiFi.h>
#include <esp_system.h>
using DeviceWebServerBase = WebServer;
#endif

#include <WiFiClient.h>
#include <WiFiUdp.h>

// The core web server behind a request gate (HttpServer.cpp): the core parser
// reads a request with blocking, partly busy-waiting stream reads, so a
// request reaches it only once it has arrived. Call from the network task.
class DeviceWebServer : public DeviceWebServerBase {
public:
    explicit DeviceWebServer(int port) : DeviceWebServerBase(port) {}

    // Largest accepted Content-Length; a larger request gets 413 unread.
    void setMaxBodyLength(size_t length)
    {
        maxBodyLength_ = length;
    }

    // Replaces the core handleClient().
    void handleClient();

private:
    enum class Gate : uint8_t { Wait, Ready, Drop };
    Gate checkRequest();
    void dropClient(int status, const char* reason);

    size_t maxBodyLength_ = 0;
};

#if SUPPORT_RTOS
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>
#include <freertos/task.h>

// Milliseconds to ticks, at least one tick so a task always yields.
inline TickType_t delayTicks(uint32_t milliseconds)
{
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif

// Hardware random number (replay-protection nonces, back-off jitter); not
// Arduino's predictable random().
inline uint32_t deviceSecureRandom32()
{
#if defined(ESP8266) && ESP8266_NONOS_CORE
    return os_random();
#else
    return esp_random();
#endif
}
