#pragma once

// Local schedule engine (docs/Schedule.md of DeviceIOT8266). Up to
// SCHEDULE_MAX_COUNT schedules are kept in the EEPROM region
// SCHEDULE_EEPROM_ADDRESS..SCHEDULE_EEPROM_END; the pure logic lives in
// ScheduleCore.h (copied unchanged).
//
// Threads: the network task (MQTT / LAN commands) edits schedules in RAM
// only; SystemTask calls process() and, through Automation, stage(), so NVS
// commits never run inside a command handler. TaskDevice drains the produced
// commands with receiveDeviceCommand().

#include <stdint.h>
#include <string>
#include <time.h>

#include "CommandResult.h"
#include "Common.h"
#include "ScheduleCore.h"

class ScheduleEngine {
public:
    static void setup();

    // id is 1..SCHEDULE_MAX_COUNT. For ONCE (weekday 0) entry.day is the date
    // as a day number; flags only carry kFlagEnabled.
    static CommandResult add(uint8_t id, const schedule::Entry& entry);
    static CommandResult update(uint8_t id, const schedule::Entry& entry);
    static CommandResult remove(uint8_t id);
    static CommandResult setEnabled(uint8_t id, bool enabled);
    static CommandResult clear();

    // SystemTask, every cycle.
    static void process(time_t epoch);
    // Automation: copies a changed value into the EEPROM RAM image (committed
    // by Automation). true when something was staged.
    static bool stage();

    // TaskDevice: commands produced by due schedules, non-blocking.
    static bool receiveDeviceCommand(DeviceCommand& command);

    // STATUS "set": every active schedule as "hour,minute,weekday,port_state,auto_off"
    // (the 6-byte EEPROM record), ordered by time of day. RAM only.
    static void addSettings(cJSON* settings);

    static uint8_t activeCount();
    static uint32_t triggeredCount();
    static uint32_t commandFailureCount();
    // Reply to {"com":13,"fr":firstId}: {"rc":13,"rs":0,"mx":max,"cv":clock valid,
    // "nx":next firstId (0 = last page),"it":[[id,ho,mi,we,po,pos,au,en,dn,date],...]}
    // with the used schedules id >= firstId, at most kListPageSize rows.
    static constexpr uint8_t kListPageSize = 10;
    static std::string listJson(uint8_t firstId);
};
