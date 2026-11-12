// Handlers of the device commands (protocol_commands.h). Each one validates
// its fields, acts, and answers through context.reply. Every command is
// idempotent, so a QoS 1 redelivery is safe. Same logic as DeviceIOT8266.

#include <stdint.h>

#include "Countdown.h"
#include "DebugInfo.h"
#include "MqttInternal.h"
#include "OnTimer.h"
#include "ScheduleCore.h"
#include "ScheduleEngine.h"
#include "TaskDevice.h"
#include "ThresholdControl.h"

namespace mqtt {
namespace {

// Range of "ye" of a once schedule: the 16-bit day number of ScheduleCore.h.
constexpr long kScheduleYearMin = 2024;
constexpr long kScheduleYearMax = 2149;
// A threshold rule is 4 bytes packed in a non-negative JSON integer.
constexpr long kThresholdValueMax = 0x7FFFFFFFL;
// Marks a field without a default: missing -> invalid.
constexpr long kRequired = -1;

// {"ho","mi","we","po","pos","au"[,"en"][,"ye","mo","da"]} -> entry.
CommandResult parseScheduleEntry(const cJSON* fields, schedule::Entry& entry)
{
    long hour = 0, minute = 0, weekday = 0, portMask = 0, portState = 0, autoOff = 0;
    if (!json::readIntField(fields, "ho", kRequired, 0, 23, hour) ||
        !json::readIntField(fields, "mi", kRequired, 0, 59, minute)) {
        return CommandResult::invalid("ho (0-23) and mi (0-59) are required");
    }
    if (!json::readIntField(fields, "we", kRequired, 0, 127, weekday)) {
        return CommandResult::invalid("we bitmask (0-127, 0 = once) is required");
    }
    if (!json::readIntField(fields, "po", AUTOMATION_PORT_MASK, 1, 255, portMask) ||
        !json::readIntField(fields, "pos", kRequired, 0, 255, portState)) {
        return CommandResult::invalid("pos (0-255) is required; po must be 1-255");
    }
    if (!json::readIntField(fields, "au", 0, 0, 65535, autoOff)) {
        return CommandResult::invalid("au must be 0-65535 seconds");
    }

    entry = {};
    entry.hour = static_cast<uint8_t>(hour);
    entry.minute = static_cast<uint8_t>(minute);
    entry.weekday = static_cast<uint8_t>(weekday);
    entry.portMask = static_cast<uint8_t>(portMask);
    entry.portState = static_cast<uint8_t>(portState);
    entry.autoOff = static_cast<uint16_t>(autoOff);
    // "en": a bool, or an integer (0 = disabled); anything else / missing = enabled.
    const cJSON* enabled = json::get(fields, "en");
    long enabledValue = 1;
    bool isEnabled = true;
    if (enabled != nullptr && cJSON_IsBool(enabled)) {
        isEnabled = cJSON_IsTrue(enabled) != 0;
    } else if (json::isInteger(enabled, enabledValue)) {
        isEnabled = enabledValue != 0;
    }
    entry.flags = isEnabled ? schedule::kFlagEnabled : 0;

    if (entry.weekday == schedule::kWeekdayOnce) {
        long year = 0, month = 0, day = 0;
        if (!json::readIntField(fields, "ye", kRequired, kScheduleYearMin, kScheduleYearMax, year) ||
            !json::readIntField(fields, "mo", kRequired, 1, 12, month) ||
            !json::readIntField(fields, "da", kRequired, 1, 31, day) ||
            !schedule::isValidDate(year, static_cast<uint32_t>(month), static_cast<uint32_t>(day))) {
            return CommandResult::invalid("once schedule (we 0) needs a valid ye/mo/da");
        }
        entry.day = static_cast<uint16_t>(
            schedule::daysFromCivil(year, static_cast<uint32_t>(month), static_cast<uint32_t>(day)));
    }
    return CommandResult::ok();
}

}  // namespace

// {"com":1,"value":<bits>[,"mask":<bits>]}: value may only contain output
// bits (DEVICE_OUTPUT_MASK); optional mask 0-255 limits the outputs that
// change (0 = all). Reply: the short status with "rc":1 / "rs".
void handleControlCommand(const CommandContext& context)
{
    long value = 0;
    long mask = 0;
    if (!json::readIntField(context.fields, "value", kRequired, 0, 255, value) || (value & ~DEVICE_OUTPUT_MASK) != 0 ||
        !json::readIntField(context.fields, "mask", 0, 0, 255, mask)) {
        DEVICE_LOG_WARNING("[MQTT] Rejected control: value must only use output bits, mask 0-255");
        status::sendResult(context.reply, COMMAND_TYPE_CONTROL, CommandStatus::Invalid);
        return;
    }
    DeviceCommand command = {};
    command.commandType = COMMAND_TYPE_CONTROL;
    command.commandValue = static_cast<uint8_t>(value);
    command.reserved = COMMAND_RESERVED_CONTROL;
    command.portMask = static_cast<uint8_t>(mask);
    if (!TaskDevice::postCommand(command)) {
        DEVICE_LOG_WARNING("[MQTT] Device command queue is full");
        status::sendResult(context.reply, COMMAND_TYPE_CONTROL, CommandStatus::NotReady);
        return;
    }
    // Sent before TaskDevice applies the command: "co" may still show the old outputs.
    status::sendShortReply(context.reply, COMMAND_TYPE_CONTROL, CommandStatus::Ok);
}

// {"com":2}: the full status report.
void handleStatusCommand(const CommandContext& context)
{
    status::sendReport(context.reply, COMMAND_TYPE_STATUS, CommandResult::ok());
}

// {"com":4,"value":N[,"mask":ports]}: switch the ports on after N seconds
// (1-86400), once; 0 cancels, no value only reports. mask defaults to every
// automation port. Lost on reboot.
void handleCountdownCommand(const CommandContext& context)
{
    CommandResult result = CommandResult::ok();
    long seconds = 0;
    long mask = 0;
    if (json::isNull(context.fields, "value")) {
        result.message = "Countdown status";
    } else if (!json::readIntField(context.fields, "value", kRequired, 0, countdown::kMaxSeconds, seconds) ||
               !json::readIntField(context.fields, "mask", AUTOMATION_PORT_MASK, 1, 255, mask) ||
               (mask & ~AUTOMATION_PORT_MASK) != 0) {
        result = CommandResult::invalid("value must be 0 (cancel) or 1-86400 s; mask must only contain output ports");
    } else if (seconds == 0) {
        Countdown::cancel();
        result.message = "Countdown cancelled";
    } else if (Countdown::start(static_cast<uint32_t>(seconds), static_cast<uint8_t>(mask))) {
        result.message = "Countdown started";
    } else {
        result = CommandResult::make(CommandStatus::NotReady, "Countdown not ready");
    }
    if (result.isOk()) {
        DEVICE_LOGF_INFO("[Countdown] %s\n", result.message);
    } else {
        DEVICE_LOGF_WARNING("[Countdown] %s\n", result.message);
    }
    status::sendReport(context.reply, COMMAND_TYPE_COUNTDOWN, result);
}

// {"com":5,"value":N}: auto-OFF on-timer of N seconds (1-86400, 0 = off),
// independent of schedules; no value only reports ("tim").
void handleOnTimerCommand(const CommandContext& context)
{
    CommandResult result = CommandResult::ok();
    long seconds = 0;
    if (!json::isNull(context.fields, "value") &&
        (!json::readIntField(context.fields, "value", kRequired, 0, on_timer::kMaxSeconds, seconds) ||
         !OnTimer::set(static_cast<uint32_t>(seconds)))) {
        result = CommandResult::invalid("value must be 0 (off) or 1-86400 seconds");
        DEVICE_LOGF_WARNING("[OnTimer] %s\n", result.message);
    }
    status::sendReport(context.reply, COMMAND_TYPE_ON_TIMER, result);
}

// {"com":7}: Ascon key handshake. The reply always goes to the broker, never
// into a LAN response: the server learns session keys only over MQTT.
void handleHandshakeCommand(const CommandContext& context)
{
    if (!ascon::kEnabled) {
        DEVICE_LOG_WARNING("[ASCON] Handshake requested but Ascon is disabled");
        status::sendResult(context.reply, context.com, CommandStatus::Invalid);
        return;
    }
    if (!ascon::announceKey()) {
        DEVICE_LOG_WARNING("[ASCON] Handshake reply failed");
    }
}

// Schedules (docs/Schedule.md):
//   {"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600}  add
//   {"com":9,...same fields...} update, {"com":10,"id":1} delete,
//   {"com":11,"id":1,"value":1|0} enable / disable, {"com":12} clear,
//   {"com":13,"fr":1} list one page (ScheduleEngine::listJson).
// Optional: "en":0 (saved disabled), "ye"/"mo"/"da" for a once schedule (we 0).
// Every command except list is answered with the status report (rc/rs/id).
void handleScheduleCommand(const CommandContext& context)
{
    const long com = context.com;
    if (com == COMMAND_TYPE_SCHEDULE_LIST) {
        long firstId = 1;
        if (!json::readIntField(context.fields, "fr", 1, 1, SCHEDULE_MAX_COUNT, firstId)) {
            firstId = 1;
        }
        const std::string page = ScheduleEngine::listJson(static_cast<uint8_t>(firstId));
        if (!page.empty()) {
            (void)context.reply.sendText(page);
        }
        return;
    }

    CommandResult result = CommandResult::ok();
    long id = 0;
    if (com == COMMAND_TYPE_SCHEDULE_CLEAR) {
        result = ScheduleEngine::clear();
    } else {
        if (!json::readIntField(context.fields, "id", kRequired, 1, SCHEDULE_MAX_COUNT, id)) {
            id = 0;  // ScheduleEngine rejects id 0.
        }
        const uint8_t scheduleId = static_cast<uint8_t>(id);
        switch (com) {
            case COMMAND_TYPE_SCHEDULE_ADD:
            case COMMAND_TYPE_SCHEDULE_UPDATE: {
                schedule::Entry entry = {};
                result = parseScheduleEntry(context.fields, entry);
                if (result.isOk()) {
                    result = com == COMMAND_TYPE_SCHEDULE_ADD ? ScheduleEngine::add(scheduleId, entry)
                                                              : ScheduleEngine::update(scheduleId, entry);
                }
                break;
            }
            case COMMAND_TYPE_SCHEDULE_DELETE:
                result = ScheduleEngine::remove(scheduleId);
                break;
            default: {
                long enabled = 0;
                result = json::readIntField(context.fields, "value", kRequired, 0, 1, enabled)
                             ? ScheduleEngine::setEnabled(scheduleId, enabled == 1)
                             : CommandResult::invalid("value must be 1 (enable) or 0 (disable)");
                break;
            }
        }
    }
    if (!result.isOk()) {
        DEVICE_LOGF_WARNING("[Schedule] com:%ld id=%ld %s\n", com, id, result.message);
    }
    status::sendReport(context.reply, com, result, id);
}

// {"com":14,"id":1|2,"value":N}: sensor threshold rule (4 bytes packed in N,
// ThresholdControl.h); value 0 deletes, without "value" (and "id") only
// reports ("th" = both rules).
void handleThresholdCommand(const CommandContext& context)
{
    CommandResult result = CommandResult::ok();
    long id = 0;
    long value = 0;
    if (!json::isNull(context.fields, "id") || !json::isNull(context.fields, "value")) {
        if (!json::readIntField(context.fields, "id", kRequired, 1, threshold::kRuleCount, id)) {
            id = 0;
            result = CommandResult::invalid("id must be 1 or 2");
        } else if (!json::isNull(context.fields, "value") &&
                   (!json::readIntField(context.fields, "value", kRequired, 0, kThresholdValueMax, value) ||
                    !ThresholdControl::set(static_cast<uint8_t>(id), static_cast<uint32_t>(value)))) {
            result = CommandResult::invalid("invalid threshold rule (sensor, ports or flags)");
        }
    }
    if (!result.isOk()) {
        DEVICE_LOGF_WARNING("[Threshold] %s\n", result.message);
    }
    status::sendReport(context.reply, COMMAND_TYPE_THRESHOLD, result, id);
}

}  // namespace mqtt
