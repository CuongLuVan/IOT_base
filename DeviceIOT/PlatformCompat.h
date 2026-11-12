#pragma once

// DeviceIOT uses the Arduino-ESP32 web, Wi-Fi and random APIs.

#include <Arduino.h>

#include "define_All.h"

#include <WebServer.h>
#include <WiFi.h>
#include <esp_system.h>
using DeviceWebServerBase = WebServer;

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

    // Replaces the core handleClient() (virtual on ESP32 and the RTOS core).
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
    return esp_random();
}
