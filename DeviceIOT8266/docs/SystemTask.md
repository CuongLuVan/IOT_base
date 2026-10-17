# SystemTask scheduling

`SystemTask` retains its monitoring role and additionally evaluates persisted weekly, monthly, and yearly schedules every `SYSTEM_TASK_CHECK_INTERVAL_MS` (default five seconds). A rule runs only after SNTP has produced a valid clock.

The scheduler never writes a GPIO. It sends `COMMAND_TYPE_SCHEDULE_CONTROL` to `TaskDevice`, which changes only `SYSTEM_TASK_SCHEDULE_PORT_MASK` (`0x01`): the pump output on GPIO4/D2. The only actions are `on` and `off`; schedules cannot select another port or alter another output bit.

Rules are stored in a checksummed EEPROM block at `SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS` (700). This fits within the 4 KB EEPROM emulation available with the official ESP8266 Arduino core and does not overlap Wi-Fi/MQTT setup or certificate regions. Eight rules are available by default. The last-fired minute is RAM-only, so an ON/OFF rule may run once after a reboot during its matching minute; this is safe because the action is idempotent.

## MQTT commands

Use the normal subscribed MQTT control topic. A `port` field is rejected.

```json
{"cmd":"schedule.set","id":0,"period":"weekly","weekday":1,"hour":7,"minute":30,"action":"on"}
```

`weekday` is `0` (Sunday) through `6` (Saturday).

```json
{"cmd":"schedule.set","id":1,"period":"monthly","day":1,"hour":22,"minute":0,"action":"off"}
```

```json
{"cmd":"schedule.set","id":2,"period":"yearly","month":12,"day":31,"hour":23,"minute":55,"action":"off"}
```

Use `{"cmd":"schedule.clear","id":2}` to delete a rule and `{"cmd":"schedule.status"}` for status. Replies contain `schedule.saved`, `schedule.cleared`, `schedule.status`, or `schedule.error`.

If rules collide in the same minute, the highest ID wins and exactly one pump command is queued. Dates absent from a month do not run in that month.

Schedules use `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS`, defaulting to UTC. Set it to `7 * 3600` before building for Vietnam/ICT. Telemetry includes a `scheduler` object with enabled rule count, triggered rule count, failed queue submissions, and the fixed port mask.
