# SystemTask scheduling

`SystemTask` keeps its monitoring role and, every `SYSTEM_TASK_CHECK_INTERVAL_MS` (default five seconds), evaluates the local schedules of `ScheduleEngine` and saves schedule changes to EEPROM. A schedule runs only after SNTP has produced a valid clock. With `SUPPORT_RTOS 0` it is called from `TaskNetWork::loopNetWork()`; with `SUPPORT_RTOS 1` it runs in its own task.

The scheduler never writes a GPIO. Due schedules produce `COMMAND_TYPE_SCHEDULE_CONTROL` commands (port mask, port state, auto OFF) for `TaskDevice`, which owns direct-control priority and auto OFF. On this board only the pump output (GPIO4/D2, bit `0x01`, `SCHEDULE_ALLOWED_PORT_MASK`) can be scheduled.

Up to 20 schedules are stored in EEPROM at `SCHEDULE_EEPROM_ADDRESS` (2831), the same layout as DeviceIOT. Commands, conflict rules, auto OFF and reboot behaviour are described in `Schedule.md`.

The former weekly/monthly/yearly pump rules (`StoredSchedules` at 115) are no longer used and are not migrated. The string commands `{"cmd":"schedule.*"}` were removed together with every other `"cmd"` command: the device ignores them. Schedule state is read with `{"com":2}` (status report, `set`) and `{"com":13}` (schedule list).

Schedules use `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS`, defaulting to UTC. Set it to `7 * 3600` before building for Vietnam/ICT. Telemetry includes a `scheduler` object with enabled schedule count, triggered schedule count, failed queue submissions, and the schedulable port mask.
