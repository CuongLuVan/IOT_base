#pragma once

// Build this sketch with exactly one ESP8266 Arduino core at a time:
//   SUPPORT_RTOS == 0: official esp8266/Arduino (NON-OS SDK)
//   SUPPORT_RTOS == 1: alexCajas/esp8266RTOSArduCore (FreeRTOS)
#include "define_All.h"

#if PLATFORM_ESP8266 && !SUPPORT_RTOS
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
  extern "C" {
    #include <user_interface.h>
  }
  using DeviceWebServer = ESP8266WebServer;
#else
  #include <WiFi.h>
  #include <WebServer.h>
  #include <esp_system.h>
  using DeviceWebServer = WebServer;
#endif

#include <WiFiClient.h>
#include <WiFiUdp.h>

#if SUPPORT_RTOS
  #include <freertos/FreeRTOS.h>
  #include <freertos/task.h>
  #include <freertos/queue.h>
  #include <freertos/semphr.h>
#endif

// The two supported ESP8266 cores expose their CSPRNG through different APIs.
// Keep replay-protection nonces independent from Arduino's predictable random().
inline uint32_t deviceSecureRandom32() {
#if PLATFORM_ESP8266 && !SUPPORT_RTOS
  return os_random();
#else
  return esp_random();
#endif
}