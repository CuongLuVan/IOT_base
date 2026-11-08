#pragma once

// Task supervision for the long-running tasks.
//
//   begin()        once from setup(), before the tasks start: sets the task
//                  watchdog timeout (ESP32: esp_task_wdt_reconfigure).
//   add(slot)      from the task itself, once at its start: subscribes the
//                  calling task to the task watchdog (ESP32) and starts its
//                  heartbeat.
//   reset(slot)    from the same task, every cycle and between long blocking
//                  steps (TLS connect, DNS, flash writes).
//   remove(slot)   from the same task before an operation that may legally
//                  block longer than TASK_WATCHDOG_TIMEOUT_MS (OTA download,
//                  provisioning), then add(slot) again afterwards.
//   restartIfStalled()  from a supervising task (SystemTask, TaskDevice):
//                  restarts the device when a subscribed slot has not called
//                  reset() for TASK_HEARTBEAT_TIMEOUT_MS.
//   restartOnFatal(what)  logs and restarts (Memory::restartSafely()), e.g.
//                  when xTaskCreate fails.
//
// ESP32: the task watchdog panics (and restarts) a subscribed task that stops
// calling reset(); the heartbeat is a second, logged check.
// ESP8266 RTOS core: there is no per-task watchdog API, so the heartbeat is
// the only hang detection.
// ESP8266 NON-OS core: every module runs from loop(); the hardware and soft
// watchdogs are fed by yield()/delay(), so all calls are no-ops.
//
// DeviceIOT also subscribes each task to the ESP32 task watchdog.

#include <Arduino.h>
#include <stdint.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "Sync.h"
#include "define_All.h"

#if SUPPORT_RTOS && defined(ESP32)
#include <esp_task_wdt.h>
#endif

#ifndef TASK_WATCHDOG_TIMEOUT_MS
#define TASK_WATCHDOG_TIMEOUT_MS 20000UL
#endif
#ifndef TASK_HEARTBEAT_TIMEOUT_MS
#define TASK_HEARTBEAT_TIMEOUT_MS 30000UL
#endif

namespace task_watchdog {

enum class Slot : uint8_t { Device = 0, Sensor, Network, System, Count };

inline const char* slotName(Slot slot)
{
    switch (slot) {
    case Slot::Device: return "TaskDevice";
    case Slot::Sensor: return "TaskSensor";
    case Slot::Network: return "TaskNetwork";
    case Slot::System: return "SystemTask";
    default: return "?";
    }
}

[[noreturn]] inline void restartOnFatal(const char* what)
{
    DEVICE_LOGF_ERROR("[WDT] fatal: %s, restarting\n", what);
    // Waits a bounded time for an EEPROM write in progress (a hung task may
    // hold the lock), so the restart never cuts a flash commit in half.
    Memory::GetInstance()->restartSafely();
}

#if SUPPORT_RTOS

namespace detail {
constexpr uint8_t kSlotCount = static_cast<uint8_t>(Slot::Count);

struct SlotState {
    platform_sync::AtomicU32 lastBeatMs;
    platform_sync::AtomicU32 active;
};

inline SlotState* slots()
{
    static SlotState state[kSlotCount];
    return state;
}

inline SlotState* slotState(Slot slot)
{
    const uint8_t index = static_cast<uint8_t>(slot);
    return index < kSlotCount ? &slots()[index] : nullptr;
}
}  // namespace detail

inline void begin()
{
#if defined(ESP32)
    esp_task_wdt_config_t config = {};
    config.timeout_ms = TASK_WATCHDOG_TIMEOUT_MS;
    // Keep the core configuration: idle task of CPU0 only.
    config.idle_core_mask = 1U << 0;
    config.trigger_panic = true;
    esp_err_t result = esp_task_wdt_reconfigure(&config);
    if (result == ESP_ERR_INVALID_STATE) result = esp_task_wdt_init(&config);
    if (result != ESP_OK) {
        DEVICE_LOGF_ERROR("[WDT] task watchdog setup failed: %d\n", static_cast<int>(result));
    }
#endif
}

inline void add(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr) return;
    state->lastBeatMs.store(millis());
    if (state->active.exchange(1) != 0) return;
#if defined(ESP32)
    const esp_err_t result = esp_task_wdt_add(nullptr);
    if (result != ESP_OK && result != ESP_ERR_INVALID_ARG) {
        DEVICE_LOGF_WARNING("[WDT] %s not subscribed: %d\n", slotName(slot), static_cast<int>(result));
    }
#endif
}

inline void reset(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr || state->active.load() == 0) return;
    state->lastBeatMs.store(millis());
#if defined(ESP32)
    esp_task_wdt_reset();
#endif
}

inline void remove(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr || state->active.exchange(0) == 0) return;
#if defined(ESP32)
    esp_task_wdt_delete(nullptr);
#endif
}

// Milliseconds since the slot's last reset(), 0 when it is not subscribed.
inline uint32_t silentMs(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr || state->active.load() == 0) return 0;
    // Read the beat before millis(): a beat between the two reads must not
    // look like a time in the future.
    const uint32_t lastBeat = state->lastBeatMs.load();
    const uint32_t elapsed = millis() - lastBeat;
    return static_cast<int32_t>(elapsed) < 0 ? 0 : elapsed;
}

inline void restartIfStalled()
{
    for (uint8_t index = 0; index < detail::kSlotCount; ++index) {
        const Slot slot = static_cast<Slot>(index);
        const uint32_t silent = silentMs(slot);
        if (silent >= TASK_HEARTBEAT_TIMEOUT_MS) {
            DEVICE_LOGF_ERROR("[WDT] %s silent for %lu ms\n", slotName(slot), static_cast<unsigned long>(silent));
            restartOnFatal("task heartbeat lost");
        }
    }
}

#else

inline void begin() {}
inline void add(Slot) {}
inline void reset(Slot) {}
inline void remove(Slot) {}
inline uint32_t silentMs(Slot)
{
    return 0;
}
inline void restartIfStalled() {}

#endif

}  // namespace task_watchdog
