#pragma once

// MQTT / LAN command protocol. Every command is {"com":<number>,...}; every
// reply carries "rc" (the com answered) and "rs" (a CommandStatus value from
// CommandResult.h: 0 ok, 1 conflict, 2 invalid, 3 not found, 4 id exists,
// 5 not ready, 6 wrong password, 7 busy).
//
// DeviceIOT also defines the high-speed capture command (com 15).

#include <stdint.h>

enum CommandType : uint8_t {
    // {"com":1,"value":<bitmask>[,"mask":<bitmask>]}: set outputs -> short status + "rc":1.
    COMMAND_TYPE_CONTROL = 1,
    // {"com":2}: full status report + "rc":2.
    COMMAND_TYPE_STATUS = 2,
    // Internal only, never on the wire: a command produced by a due schedule.
    COMMAND_TYPE_INTERNAL_SCHEDULE = 3,
    // {"com":4,"value":N}: count down N seconds (1..86400), then switch on; 0 = cancel.
    // Reply: status report + "rc":4, "cd" (seconds left), "cm" (ports), "cs" (last N).
    COMMAND_TYPE_COUNTDOWN = 4,
    // {"com":5,"value":N}: auto OFF on-timer N seconds (0 = off).
    COMMAND_TYPE_ON_TIMER = 5,
    // {"com":7}: Ascon key handshake -> {"rc":7,"rs":0,"ky":"<digits>"}.
    COMMAND_TYPE_ASCON_HANDSHAKE = 7,
    // Schedules (docs/Schedule.md): 8 add, 9 update, 10 delete,
    // 11 enable/disable (value 1/0), 12 clear, 13 list.
    COMMAND_TYPE_SCHEDULE_ADD = 8,
    COMMAND_TYPE_SCHEDULE_UPDATE = 9,
    COMMAND_TYPE_SCHEDULE_DELETE = 10,
    COMMAND_TYPE_SCHEDULE_ENABLE = 11,
    COMMAND_TYPE_SCHEDULE_CLEAR = 12,
    COMMAND_TYPE_SCHEDULE_LIST = 13,
    // {"com":14,"id":1|2,"value":N}: sensor threshold rule (ThresholdControl.h).
    COMMAND_TYPE_THRESHOLD = 14,
    // {"com":15,"value":<ms>,"mode":1..4,"udp_host":"..","udp_port":n}: high-speed
    // capture, DeviceIOT (ESP32) only. value 0 = stop, no value = read state.
    // Reply {"rc":15,"rs":n,"act":0|1}.
    COMMAND_TYPE_HIGH_SPEED_CAPTURE = 15,
};

// Valid "com" range on the wire; anything else is rejected with rs=2.
constexpr long kCommandTypeMin = 1;
constexpr long kCommandTypeMax = 255;

// DeviceCommand::reserved.
enum CommandReserved : uint16_t {
    COMMAND_RESERVED_NONE = 0,
    COMMAND_RESERVED_CONTROL = 1,
};
