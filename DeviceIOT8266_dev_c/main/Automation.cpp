// Logic copied unchanged from DeviceIOT8266.

#include "Automation.h"

#include "Countdown.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "OnTimer.h"
#include "ScheduleEngine.h"
#include "ThresholdControl.h"
#include "define_All.h"

namespace {

// SystemTask only (flushSettingsIfDue).
bool commitAttempted = false;
bool commitPending = false;
uint32_t lastCommitAttemptMs = 0;
uint32_t commitDelayMs = SETTINGS_FLUSH_INTERVAL_MS;
uint8_t commitFailures = 0;

// Copies every changed setting into the EEPROM RAM copy; true when one changed.
bool stageAll()
{
    bool staged = ScheduleEngine::stage();
    staged = OnTimer::stage() || staged;
    staged = Countdown::stage() || staged;
    staged = ThresholdControl::stage() || staged;
    return staged;
}

}  // namespace

void Automation::setup()
{
    ScheduleEngine::setup();
    OnTimer::setup();
    Countdown::setup();
    ThresholdControl::setup();
}

void Automation::runSchedules(time_t epoch)
{
    ScheduleEngine::process(epoch);
}

void Automation::flushSettingsIfDue(uint32_t nowMs, bool allowCommit)
{
    if (commitAttempted && nowMs - lastCommitAttemptMs < commitDelayMs) return;
    if (!allowCommit) return;
    if (stageAll()) {
        commitPending = true;
        commitFailures = 0;
    }
    if (!commitPending) return;

    commitAttempted = true;
    lastCommitAttemptMs = nowMs;
    if (Memory::GetInstance()->commitPending()) {
        DEVICE_LOG_DEBUG("[Automation] Settings saved to EEPROM");
        commitPending = false;
        commitFailures = 0;
        commitDelayMs = SETTINGS_FLUSH_INTERVAL_MS;
        return;
    }
    ++commitFailures;
    if (commitFailures >= SETTINGS_FLUSH_MAX_RETRIES) {
        DEVICE_LOGF_ERROR("[Automation] Settings not saved after %u attempts; retried on the next change\n",
                          static_cast<unsigned>(commitFailures));
        commitPending = false;
        commitFailures = 0;
        return;
    }
    commitDelayMs = commitDelayMs >= SETTINGS_FLUSH_RETRY_MAX_MS / 2 ? SETTINGS_FLUSH_RETRY_MAX_MS : commitDelayMs * 2;
    DEVICE_LOGF_WARNING("[Automation] Settings commit failed; retry in %lu ms\n",
                        static_cast<unsigned long>(commitDelayMs));
}

bool Automation::flushSettings()
{
    (void)stageAll();
    return Memory::GetInstance()->commitPending();
}
