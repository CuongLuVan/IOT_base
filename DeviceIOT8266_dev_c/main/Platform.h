#pragma once

// Small platform layer over ESP8266_RTOS_SDK, replacing the Arduino helpers
// the DeviceIOT8266 code used (millis(), delay(), ESP.restart(), ...).

#include <stddef.h>
#include <stdint.h>
#include <string>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

// Milliseconds since boot, wrapping like Arduino millis(). Resolution is one
// FreeRTOS tick (10 ms at the default 100 Hz); every timeout in the firmware
// is far longer than that.
inline uint32_t millis()
{
    return static_cast<uint32_t>(xTaskGetTickCount()) * static_cast<uint32_t>(portTICK_PERIOD_MS);
}

// Milliseconds to ticks, rounded up and at least one tick, so a task always yields.
inline TickType_t delayTicks(uint32_t milliseconds)
{
    const uint64_t ticks = (static_cast<uint64_t>(milliseconds) * configTICK_RATE_HZ + 999U) / 1000U;
    if (ticks == 0) return 1;
    return ticks >= portMAX_DELAY ? portMAX_DELAY - 1 : static_cast<TickType_t>(ticks);
}

inline void delayMs(uint32_t milliseconds)
{
    vTaskDelay(delayTicks(milliseconds));
}

// Hardware random number (replay-protection nonces, back-off jitter).
uint32_t deviceSecureRandom32();
void deviceFillRandom(uint8_t* out, size_t length);

uint32_t deviceFreeHeap();

// Restarts the chip immediately (use safe_restart::restart() or
// Memory::restartSafely() from application code).
[[noreturn]] void deviceRestartNow();

// "a.b.c.d" of an lwIP IPv4 address (network byte order, as ip4_addr_t.addr).
std::string ipToString(uint32_t address);

// Removes leading and trailing white space (Arduino String::trim()).
void trimString(std::string& text);
