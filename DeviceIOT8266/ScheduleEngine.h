#ifndef SCHEDULE_ENGINE_H
#define SCHEDULE_ENGINE_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <time.h>

#include "Common.h"
#include "ScheduleCore.h"

// Local schedule engine (spec_v1.txt). Up to SCHEDULE_MAX_COUNT schedules are
// kept in the EEPROM region SCHEDULE_EEPROM_ADDRESS..SCHEDULE_EEPROM_END.
//
// The MQTT callback edits schedules in RAM only; SystemTask calls process()
// and flush(), so EEPROM commits never run inside the MQTT callback. TaskDevice
// drains the commands with receiveDeviceCommand(). SUPPORT_RTOS uses a FreeRTOS
// mutex and queue; the NON-OS core runs everything from loop() and needs none.
class ScheduleEngine {
public:
    enum Status : uint8_t {
        STATUS_SUCCESS = 0,
        STATUS_CONFLICT,
        STATUS_INVALID,
        STATUS_NOT_FOUND,
        STATUS_ID_EXISTS,
        STATUS_NOT_READY
    };

    struct Result {
        Status status;
        uint8_t conflictId;     // Valid for STATUS_CONFLICT.
        uint8_t conflictPorts;  // Valid for STATUS_CONFLICT.
        const char* message;
    };

    static void setup();

    // id is 1..SCHEDULE_MAX_COUNT. For ONCE (weekday 0) entry.day is the date
    // as a day number; flags only carry kFlagEnabled.
    static Result add(uint8_t id, const schedule::Entry& entry);
    static Result update(uint8_t id, const schedule::Entry& entry);
    static Result remove(uint8_t id);
    static Result setEnabled(uint8_t id, bool enabled);
    static Result clear();

    // SystemTask, every cycle.
    static void process(time_t epoch);
    static void flush();

    // TaskDevice: commands produced by due schedules, non-blocking.
    static bool receiveDeviceCommand(DeviceCommand& command);

    // STATUS "set": every active schedule as "hour,minute,weekday,port_state,auto_off"
    // (the 6-byte EEPROM record), ordered by time of day. RAM only.
    static void addSettings(JsonArray settings);

    static uint8_t activeCount();
    static uint32_t triggeredCount();
    static uint32_t commandFailureCount();
    // Reply to {"com":13,"fr":firstId}: {"rc":13,"mx":max,"cv":clock valid,
    // "nx":next firstId (0 = last page),"it":[[id,ho,mi,we,po,pos,au,en,dn,date],...]}
    // with the used schedules id >= firstId, at most kListPageSize rows.
    static constexpr uint8_t kListPageSize = 10;
    static String listJson(uint8_t firstId);
    static const char* statusName(Status status);
};

#endif
