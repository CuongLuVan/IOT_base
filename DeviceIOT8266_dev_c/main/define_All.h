#pragma once

// DeviceIOT8266_V1 configuration (ESP8266_RTOS_SDK). Each part lives in its own header:
//   config_features.h   feature and security switches (0/1)
//   config_checks.h     constraints between the switches
//   protocol_commands.h MQTT / LAN command numbers      (same as DeviceIOT8266)
//   eeprom_layout.h     EEPROM (NVS image) addresses    (same as DeviceIOT8266)
//   board_pins.h        GPIO wiring and output ports
//   timing.h            task timing, buffer sizes, network limits

#include "config_features.h"
#include "config_checks.h"
#include "protocol_commands.h"
#include "eeprom_layout.h"
#include "board_pins.h"
#include "timing.h"
