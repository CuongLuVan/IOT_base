#pragma once

// Decides the output port byte from every source that may switch a port. Pure
// logic (no Arduino), unit tested in tests/core_logic_test.cpp; TaskDevice
// collects the inputs, calls step() once per cycle and writes the GPIOs.
//
// Priority: the stages run in this order every cycle, so on the same port a
// later stage overrides an earlier one.
//   1. schedule events (ScheduleEngine), in queue order
//   2. direct commands (MQTT / LAN / HTTP com:1), in arrival order
//   3. device button toggle
//   4. threshold rules (ThresholdControl)
//   5. countdown expiry (Countdown)
//   6. schedule auto OFF
//   7. on-timer auto OFF (OnTimer): a port on for too long always goes off
// Stages 2..5 are direct control: they cancel a pending schedule auto OFF on
// their ports (ScheduleCore.h PortController).
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <stddef.h>
#include <stdint.h>

#include "OnTimer.h"
#include "ScheduleCore.h"

namespace port_arbiter {

struct ScheduleEvent {
    uint8_t mask;
    uint8_t state;
    uint16_t autoOffSeconds;  // 0 = no auto OFF.
};

struct DirectCommand {
    uint8_t mask;  // 0 = every output (legacy com:1 without "mask").
    uint8_t state;
};

struct Inputs {
    const ScheduleEvent* schedules = nullptr;
    size_t scheduleCount = 0;
    const DirectCommand* directs = nullptr;
    size_t directCount = 0;
    bool buttonToggle = false;
    uint8_t thresholdOn = 0;
    uint8_t thresholdOff = 0;
    uint8_t countdownOn = 0;
    uint32_t onTimerSeconds = 0;  // 0 = on-timer off.
    int64_t nowEpoch = 0;         // 0 = clock not valid.
    uint32_t nowMs = 0;
};

// What happened in one step, for the log.
struct Report {
    uint8_t autoOffCancelled;  // Pending schedule auto OFF cancelled by direct control.
    uint8_t autoOffSwitched;   // Ports switched off by a schedule auto OFF.
    uint8_t onTimerExpired;    // Ports switched off by the on-timer.
};

class Arbiter {
public:
    // outputMask: ports that exist (every input is masked with it);
    // buttonMask: ports the device button toggles.
    Arbiter(uint8_t outputMask, uint8_t buttonMask) : outputMask_(outputMask), buttonMask_(buttonMask & outputMask)
    {
    }

    // Returns the new port byte for current.
    uint8_t step(uint8_t current, const Inputs& in, Report& report)
    {
        report = {0, 0, 0};
        uint8_t port = static_cast<uint8_t>(current & outputMask_);

        for (size_t i = 0; i < in.scheduleCount; ++i) {
            const ScheduleEvent& event = in.schedules[i];
            port = controller_.applySchedule(port, event.mask & outputMask_, event.state, event.autoOffSeconds,
                                             in.nowEpoch);
        }
        for (size_t i = 0; i < in.directCount; ++i) {
            const uint8_t mask = in.directs[i].mask != 0 ? in.directs[i].mask : 0xFF;
            port = direct(port, mask, in.directs[i].state, report);
        }
        if (in.buttonToggle) port = direct(port, buttonMask_, static_cast<uint8_t>(port ^ buttonMask_), report);
        port = direct(port, in.thresholdOff, 0, report);
        port = direct(port, in.thresholdOn, in.thresholdOn, report);
        port = direct(port, in.countdownOn, in.countdownOn, report);

        port = controller_.processAutoOff(port, in.nowEpoch, report.autoOffSwitched);

        report.onTimerExpired = onTimer_.update(port, in.onTimerSeconds, in.nowMs);
        port &= static_cast<uint8_t>(~report.onTimerExpired);
        return port;
    }

private:
    uint8_t direct(uint8_t port, uint8_t mask, uint8_t state, Report& report)
    {
        mask &= outputMask_;
        if (mask == 0) return port;
        uint8_t cancelled = 0;
        port = controller_.applyDirect(port, mask, state, cancelled);
        report.autoOffCancelled |= cancelled;
        return port;
    }

    schedule::PortController controller_;
    on_timer::Tracker onTimer_;
    uint8_t outputMask_;
    uint8_t buttonMask_;
};

}  // namespace port_arbiter
