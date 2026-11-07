#pragma once

// Result of any MQTT / LAN command, sent back as "rs". Shared by every command
// handler (control, schedule, on-timer, countdown, threshold, high-speed), so
// nothing outside ScheduleEngine has to borrow schedule types.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <stdint.h>

enum class CommandStatus : uint8_t {
    Ok = 0,
    Conflict = 1,
    Invalid = 2,
    NotFound = 3,
    IdExists = 4,
    NotReady = 5,
    WrongPassword = 6,
    Busy = 7,
};

inline uint8_t toWire(CommandStatus status)
{
    return static_cast<uint8_t>(status);
}

struct CommandResult {
    CommandStatus status;
    uint8_t conflictId;     // Valid for CommandStatus::Conflict.
    uint8_t conflictPorts;  // Valid for CommandStatus::Conflict.
    const char* message;    // For the log only; never sent.

    static CommandResult ok()
    {
        return {CommandStatus::Ok, 0, 0, "ok"};
    }

    static CommandResult make(CommandStatus status, const char* message)
    {
        return {status, 0, 0, message};
    }

    static CommandResult invalid(const char* message)
    {
        return make(CommandStatus::Invalid, message);
    }

    bool isOk() const
    {
        return status == CommandStatus::Ok;
    }
};

#ifdef ARDUINO
#include <ArduinoJson.h>

// Reads an integer field into out. A missing key gives fallback; a value that
// is not an integer, or lies outside min..max, makes it return false.
inline bool readIntField(JsonVariantConst document, const char* key, long fallback, long min, long max,
                         long& out)
{
    JsonVariantConst value = document[key];
    if (value.isNull()) {
        out = fallback;
    } else if (value.is<long>()) {
        out = value.as<long>();
    } else {
        return false;
    }
    return out >= min && out <= max;
}
#endif
