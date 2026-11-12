#pragma once

// Owner of the automation modules' life cycle:
//   ScheduleEngine   schedules (com 8..13)
//   OnTimer          auto OFF on-timer (com 5)
//   Countdown        countdown auto ON (com 4)
//   ThresholdControl sensor threshold rules (com 14)
// Commands change their settings in RAM from the network task; TaskDevice
// applies their port actions. SystemTask calls runSchedules() every cycle and
// flushSettingsIfDue(), which saves every changed setting with one EEPROM
// commit at most every SETTINGS_FLUSH_INTERVAL_MS (timing.h). A command is
// answered "saved" before that commit: a power loss within that interval
// loses the change.
//
// Logic copied unchanged from DeviceIOT8266.

#include <stdint.h>
#include <time.h>

class Automation {
public:
    // Loads every setting from EEPROM. Call once from setup(), after
    // Memory::begin() and before any task starts.
    static void setup();
    // Queues the commands of schedules due up to epoch (invalid clock: none).
    static void runSchedules(time_t epoch);
    // SystemTask, every cycle: commits the changed settings when the last
    // commit is SETTINGS_FLUSH_INTERVAL_MS old. allowCommit false (high-speed
    // capture running) postpones it. A failed commit is retried with a
    // doubling delay, at most SETTINGS_FLUSH_MAX_RETRIES times.
    static void flushSettingsIfDue(uint32_t nowMs, bool allowCommit);
    // Commits the changed settings now (before a restart). Any task.
    static bool flushSettings();
};
