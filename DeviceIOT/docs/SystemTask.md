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
- Evaluate persisted weekly, monthly, and yearly pump schedules when the clock
  is valid.  A matching rule is executed once per minute.

`SystemTask` never writes a GPIO directly.  A schedule produces one bounded
`COMMAND_TYPE_SCHEDULE_CONTROL` command for `TaskDevice`.  The command can
only change `SYSTEM_TASK_SCHEDULE_PORT_MASK` (default `0x01`, the pump output)
and has only two actions: `on` or `off`.  It cannot select another port and it
does not overwrite the state of other output bits.

Rules are stored in ESP32 Preferences/NVS under `systemtask/rules_v1`, so they
survive reboot.  The last-fired marker is intentionally RAM-only: an already
matching rule may run once after a reboot, which is safe because ON/OFF writes
are idempotent.

## MQTT schedule commands

All configuration uses the existing MQTT command path.  A command containing
`port` is rejected deliberately.

```json
{"cmd":"schedule.set","id":0,"period":"weekly","weekday":1,"hour":7,"minute":30,"action":"on"}
```

`weekday` uses `0 = Sunday` through `6 = Saturday`.

```json
{"cmd":"schedule.set","id":1,"period":"monthly","day":1,"hour":22,"minute":0,"action":"off"}
```

```json
{"cmd":"schedule.set","id":2,"period":"yearly","month":12,"day":31,"hour":23,"minute":55,"action":"off"}
```

Rules occupy IDs `0` through `SYSTEM_TASK_SCHEDULE_MAX_RULES - 1` (default
eight).  Use `{"cmd":"schedule.clear","id":2}` to remove one rule and
`{"cmd":"schedule.status"}` to receive scheduler status.  Replies use
`schedule.saved`, `schedule.cleared`, `schedule.status`, or `schedule.error`.

Schedules use local time configured by `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS`.
The default is `0` (UTC); set it to `7 * 3600` for Vietnam/ICT before building.
Dates absent from a month simply do not run in that month.
If multiple rules match in the same minute, the highest rule ID wins and only
one pump command is queued.

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
| `SYSTEM_TASK_SCHEDULE_MAX_RULES` | 8 |
| `SYSTEM_TASK_SCHEDULE_PORT_MASK` | `0x01` |
| `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS` | 0 (UTC) |

Counters and snapshots are RAM-only and reset at boot.  Schedule definitions
are the only SystemTask state persisted across reboot.
