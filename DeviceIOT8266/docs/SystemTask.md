# SystemTask — supervision, automation and telemetry

`SystemTask::service()` runs one cycle every `SYSTEM_TASK_CHECK_INTERVAL_MS`
(default five seconds). With `SUPPORT_RTOS 0` it is called from `loop()`; with
`SUPPORT_RTOS 1` `taskRun()` calls it every 100 ms in its own task (priority 2,
equal to `TaskNetwork`, below `TaskDevice`).

With `SUPPORT_RTOS 0`, `TaskDevice::service()` does not run from `loop()`: a
recurrent scheduled function (core `Schedule.h`) runs it every
`DEVICE_TASK_PERIOD_MS` at each `yield()` / `delay()`, so the outputs, the
button and auto OFF keep working while `loop()` is blocked in a network call
(DNS, TLS handshake, MQTT CONNACK).

## Who calls what

| Module | Set up by | Runs in | Does |
|---|---|---|---|
| `TaskDevice` | `.ino` `setup()` | TaskDevice / recurrent scheduled function | owns the pump output and the button; applies commands (`PortArbiter.h`) |
| `TaskSensor` | `.ino` `setup()` | TaskSensor / `loop()` | reads DHT11 and the ADC, calls `ThresholdControl::evaluate()` on each sample |
| `Automation` (`ScheduleEngine`, `OnTimer`, `Countdown`, `ThresholdControl`) | `SystemTask::setup()` | settings edited by the network task in RAM; `runSchedules()` / `flushSettingsIfDue()` in SystemTask | schedules, auto OFF, countdown, threshold rules |
| `SystemTask` | `.ino` `setup()` | SystemTask / `loop()` | heartbeat check, automation cycle, settings commit, telemetry snapshot |

## One cycle

1. `SUPPORT_RTOS 1`: `task_watchdog::restartIfStalled()` restarts the device
   when a supervised task has not reported for `TASK_HEARTBEAT_TIMEOUT_MS`
   (`TaskWatchdog.h`; `TaskDevice` checks it every second too). A task that
   cannot be created at boot also restarts the device.
2. `Automation::runSchedules(time(nullptr))`: due schedules become commands for
   `TaskDevice`; nothing runs before SNTP (started by the network task) has
   produced a valid clock.
3. `Automation::flushSettingsIfDue()`: schedule, on-timer, countdown and
   threshold changes are saved with one EEPROM commit, at most every
   `SETTINGS_FLUSH_INTERVAL_MS` (15 s). A failed commit is retried with a
   doubling delay, at most `SETTINGS_FLUSH_MAX_RETRIES` times, then logged as
   ERROR. A command is answered "saved" before the commit: a power loss within
   that interval loses the change.
4. A telemetry snapshot is stored for `telemetryJson()`: with `SUPPORT_RTOS 1`
   a `tasks` array with the stack high-water mark of each task
   (`stack_hwm_units`, bytes), with `SUPPORT_RTOS 0` `cont_stack_free_bytes`.

The scheduler never writes a GPIO. Due schedules produce
`COMMAND_TYPE_INTERNAL_SCHEDULE` commands (port mask, port state, auto OFF)
for `TaskDevice`, which applies them with the priority documented in
`PortArbiter.h`. On this board only the pump output (GPIO4/D2, bit `0x01`,
`AUTOMATION_PORT_MASK`) can be scheduled.

Up to 20 schedules are stored in EEPROM at `SCHEDULE_EEPROM_ADDRESS` (2831),
the same layout as DeviceIOT. Commands, conflict rules, auto OFF and reboot
behaviour are described in `Schedule.md`. Schedule state is read with
`{"com":2}` (status report, `set`) and `{"com":13}` (schedule list).

Schedules use `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS`, defaulting to UTC. Set it
to `7 * 3600` before building for Vietnam/ICT. Telemetry includes
`schedule_misses` (cycles started at least one interval late) and a
`scheduler` object with enabled schedule count, triggered schedule count,
failed queue submissions, and the schedulable port mask.
