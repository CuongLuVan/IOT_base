#pragma once

// DeviceIOT (ESP32) configuration. Each part lives in its own header:
//   config_features.h   feature and security switches (0/1)
//   config_checks.h     constraints between the switches      (shared)
//   protocol_commands.h MQTT / LAN command numbers            (shared)
//   eeprom_layout.h     EEPROM addresses                      (shared)
//   board_pins.h        GPIO wiring and output ports
//   timing.h            task timing, buffer sizes, network limits
// "shared" files are identical in DeviceIOT8266 (tools/check_shared_files.sh).

#include "config_features.h"
#include "config_checks.h"
#include "protocol_commands.h"
#include "eeprom_layout.h"
#include "board_pins.h"
#include "timing.h"
