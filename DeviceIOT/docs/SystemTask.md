# SystemTask — monitoring and scheduled pump control

`SystemTask` runs on core 0 in RTOS mode with priority 1, below `TaskNetWork`
(priority 2) and `TaskSensor` (priority 3).  It wakes every five seconds.
In cooperative mode the same work is called from `loop()` without blocking.

## Responsibilities

- Collect FreeRTOS state and stack high-water marks for `TaskDevice`,
  `TaskSensor`, `TaskNetwork`, and `SystemTask`.
- Track free/minimum heap, uptime, Unix epoch, clock validity, capture/UDP
  counters, and Wi-Fi/MQTT/UDP availability.
- Request SNTP non-blockingly while Wi-Fi is connected and the clock is invalid;
  retries occur no more than once per 60 seconds.
- Create a snapshot for `TaskNetWork`, which alone publishes `system.status`
  every 30 seconds while MQTT is connected.
- Evaluate the local schedules (`ScheduleEngine`, see `Schedule.md`) when the
  clock is valid, then save schedule changes to EEPROM.

`SystemTask` never writes a GPIO directly.  Due schedules produce
`COMMAND_TYPE_SCHEDULE_CONTROL` commands (port mask, port state, auto OFF) on
the `ScheduleEngine` queue; `TaskDevice` applies them and owns direct-control
priority and auto OFF.

Schedules are stored in EEPROM (`SCHEDULE_EEPROM_ADDRESS`, up to 20) and
configured with the schedule MQTT commands (`com` 8..13) described in `Schedule.md`.
The former NVS pump rules (`schedule.set` / `schedule.clear`,
`systemtask/rules_v1`) are no longer used; those commands now reply
`schedule.error`.  `{"cmd":"schedule.status"}` still returns the scheduler
status.

## Telemetry and realtime constraints

`system.status` contains `uptime_ms`, `epoch_s`, `clock_valid`,
`schedule_misses`, heap values, UDP queue depth, network state, task state,
capture counters, and a `scheduler` object with enabled rule count, successful
triggers, failed queue submissions, and the fixed port mask.

The task does not read sensors, publish MQTT directly, reconnect Wi-Fi/MQTT,
reset the device, or alter the watchdog.  It increments missed scheduler cycles
only when its monitoring interval is delayed by at least a full interval.

## Relevant configuration

| Define | Default |
|---|---:|
| `TASK_SYSTEM_PRIORITY` | 1 |
| `TASK_SYSTEM_STACK_SIZE` | 4096 |
| `SYSTEM_TASK_CHECK_INTERVAL_MS` | 5000 ms |
| `SYSTEM_TASK_NTP_RETRY_INTERVAL_MS` | 60000 ms |
| `SCHEDULE_MAX_COUNT` | 20 |
| `SCHEDULE_ALLOWED_PORT_MASK` | `0x03` |
| `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS` | 0 (UTC) |

Counters and snapshots are RAM-only and reset at boot.  Schedules (EEPROM)
are the only SystemTask state persisted across reboot.
