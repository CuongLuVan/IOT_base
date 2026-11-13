#pragma once

// Restart requested by the network side (setup pages, provisioning, network
// button, OTA, offline watchdog). Settings changed in RAM but not yet flushed
// are handed to Memory first; Memory::restartSafely() then commits them and
// restarts while it holds the EEPROM lock, so no task can write during restart.
//
// DeviceIOT keeps its own ESP32-only copy of this file (ESP8266 branches
// removed); DeviceIOT8266 has the ESP8266 version. Not checked by
// tools/check_shared_files.sh.

#include <Arduino.h>

#include "Automation.h"
#include "DebugInfo.h"
#include "Memory.h"

namespace safe_restart {

[[noreturn]] inline void restart(const char* reason)
{
    DEVICE_LOGF_INFO("[System] Restarting: %s\n", reason);
    Automation::flushSettings();
    Memory::GetInstance()->restartSafely();
}

}  // namespace safe_restart
