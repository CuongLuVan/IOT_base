# SystemTask — supervision, automation and telemetry

`SystemTask` runs as its own FreeRTOS task (priority 2, equal to
`TaskNetwork`, below `TaskDevice`). `taskRun()` calls `service()` every
100 ms; `service()` runs one cycle every `SYSTEM_TASK_CHECK_INTERVAL_MS` (5 s).

## Who calls what

| Module | Set up by | Runs in | Does |
|---|---|---|---|
| `TaskDevice` | `.ino` `setup()` | TaskDevice (every `DEVICE_TASK_PERIOD_MS`, priority 3) | owns the outputs and the device button; applies commands (`PortArbiter.h`) |
| `TaskSensor` | `.ino` `setup()` | TaskSensor (core 1) | reads DHT11 / PMS, calls `ThresholdControl::evaluate()` on each sample, runs high-speed capture |
| `Automation` (`ScheduleEngine`, `OnTimer`, `Countdown`, `ThresholdControl`) | `SystemTask::setup()` | settings edited by TaskNetwork in RAM; `runSchedules()` / `flushSettingsIfDue()` in SystemTask | schedules, auto OFF, countdown, threshold rules |
| `SystemTask` | `.ino` `setup()` | SystemTask | heartbeat check, automation cycle, settings commit, telemetry snapshot |

SNTP is started by `TaskNetwork` only (`device_clock::startSync()`, Clock.h).

## One cycle

1. `task_watchdog::restartIfStalled()`: restarts the device when a supervised
   task has not reported for `TASK_HEARTBEAT_TIMEOUT_MS` (see below).
2. `Automation::runSchedules(time(nullptr))`: due schedules become commands on
   the `ScheduleEngine` queue (nothing runs while the clock is invalid).
3. `Automation::flushSettingsIfDue()`: schedule, on-timer, countdown and
   threshold changes are copied into the EEPROM RAM copy and saved with **one**
   commit, at most every `SETTINGS_FLUSH_INTERVAL_MS` (15 s) and never during
   a high-speed capture (an NVS write stalls both cores). A failed commit is
   retried after a doubling delay (up to `SETTINGS_FLUSH_RETRY_MAX_MS`), at
   most `SETTINGS_FLUSH_MAX_RETRIES` times; then an ERROR is logged and the
   next change tries again. EEPROM is never written inside an MQTT callback.
   A command is answered "saved" before the commit: a power loss within that
   interval loses the change. A restart requested by the firmware commits the
   pending changes first (`Automation::flushSettings()`).
4. A telemetry snapshot is stored for `telemetryJson()`.

`SystemTask` never writes a GPIO. Due schedules produce
`COMMAND_TYPE_INTERNAL_SCHEDULE` commands (port mask, port state, auto OFF);
`TaskDevice` applies them with the priority documented in `PortArbiter.h`.

## Task supervision

`TaskWatchdog.h`: `setup()` sets the ESP32 task watchdog to
`TASK_WATCHDOG_TIMEOUT_MS` (20 s, panic + restart). `TaskDevice`, `TaskSensor`,
`SystemTask` and `TaskNetwork` subscribe themselves and reset it every cycle.
Each reset is also a heartbeat: `SystemTask` (every cycle) and `TaskDevice`
(every second) restart the device, with an ERROR log, when a subscribed task
is silent for `TASK_HEARTBEAT_TIMEOUT_MS` (30 s). A task that cannot be
created at boot also restarts the device.

## Telemetry

`system.status` (published by `TaskNetwork` every 30 s while MQTT is
connected) contains `uptime_ms`, `epoch_s`, `clock_valid`, `schedule_misses`
(monitoring cycles that started at least one interval late, each counted
once), heap values, UDP queue depth, network state, task state and stack
high-water marks (`stack_hwm_units`, bytes never used, for `TaskDevice`,
`TaskSensor`, `TaskNetwork`, `SystemTask`), capture counters, and a
`scheduler` object with enabled rule count, successful triggers, failed queue
submissions and `AUTOMATION_PORT_MASK`.

The snapshot is guarded by a mutex; when it is busy for more than 10 ms the
update (or the telemetry read) is skipped and happens again next cycle.

## Relevant configuration

| Define | Default |
|---|---:|
| `TASK_SYSTEM_PRIORITY` | 2 |
| `TASK_SYSTEM_STACK_SIZE` | 6144 |
| `SYSTEM_TASK_CHECK_INTERVAL_MS` | 5000 ms |
| `SETTINGS_FLUSH_INTERVAL_MS` | 15000 ms |
| `TASK_WATCHDOG_TIMEOUT_MS` | 20000 ms |
| `TASK_HEARTBEAT_TIMEOUT_MS` | 30000 ms |
| `SCHEDULE_MAX_COUNT` | 20 |
| `AUTOMATION_PORT_MASK` | `0x03` |
| `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS` | 0 (UTC) |

Counters and snapshots are RAM-only and reset at boot. The last evaluated
schedule minute is kept in RTC memory across a software restart, so a restart
inside the minute a schedule ran does not run it twice.
