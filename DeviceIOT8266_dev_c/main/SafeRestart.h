#pragma once

// Restart requested by the network side (setup pages, offline watchdog).
// Settings changed in RAM but not yet flushed are handed to Memory first;
// Memory::restartSafely() then commits them and restarts while it holds the
// EEPROM lock, so no task is in the middle of an NVS commit.

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
