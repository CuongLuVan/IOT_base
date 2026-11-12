#pragma once

// Task supervision for the long-running tasks (SUPPORT_RTOS branch of
// DeviceIOT8266, unchanged).
//
//   begin()        once from app_main(), before the tasks start.
//   add(slot)      from the task itself, once at its start: subscribes the
//                  slot to heartbeat monitoring.
//   reset(slot)    from the same task, every cycle and between long blocking
//                  steps (TLS connect, DNS, flash writes).
//   remove(slot)   from the same task before a long operation, then add(slot)
//                  again afterwards.
//   restartIfStalled()  from a supervising task (SystemTask, TaskDevice):
//                  restarts the device when a subscribed slot has not called
//                  reset() for TASK_HEARTBEAT_TIMEOUT_MS.
//   restartOnFatal(what)  logs and restarts (Memory::restartSafely()), e.g.
//                  when xTaskCreate fails.
//
// The SDK task watchdog (CONFIG_TASK_WDT) additionally resets the chip when
// the idle task starves.

#include <stdint.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "Platform.h"
#include "Sync.h"
#include "define_All.h"

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
    // Waits a bounded time for an NVS write in progress (a hung task may hold
    // the lock), so the restart never cuts a commit in half.
    Memory::GetInstance()->restartSafely();
}

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
    (void)detail::slots();
}

inline void add(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr) return;
    state->lastBeatMs.store(millis());
    (void)state->active.exchange(1);
}

inline void reset(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr || state->active.load() == 0) return;
    state->lastBeatMs.store(millis());
}

inline void remove(Slot slot)
{
    detail::SlotState* state = detail::slotState(slot);
    if (state == nullptr) return;
    (void)state->active.exchange(0);
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

}  // namespace task_watchdog
