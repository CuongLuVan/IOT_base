#pragma once

// Restart requested by the network side (setup pages, provisioning, network
// button, OTA, offline watchdog). Settings changed in RAM but not yet flushed
// are handed to Memory first; Memory::restartSafely() then commits them and
// restarts while it holds the EEPROM lock, so no task is between the erase
// and the write of an ESP8266 flash commit.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

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
