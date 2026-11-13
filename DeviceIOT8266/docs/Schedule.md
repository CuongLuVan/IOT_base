# Local schedules (ScheduleEngine)

Implements `DeviceIOT/spec_v1.txt`, with the same protocol, EEPROM layout and
logic as DeviceIOT (ESP32): up to **20 schedules**, stored in EEPROM, running
without Internet once the clock is valid; direct MQTT control always takes
priority.

Differences on ESP8266:

- There is only one output (pump, GPIO4/D2): `SCHEDULE_ALLOWED_PORT_MASK` =
  `DEVICE_OUTPUT_MASK` = `0x01`. A `port_mask` with any other bit → `INVALID`.
- `SUPPORT_RTOS 0` (default): everything runs in `loop()`, so no mutex is
  needed; the schedule command queue is a 10-entry ring buffer.
  `SUPPORT_RTOS 1`: uses a FreeRTOS mutex and queue like DeviceIOT.
- `ScheduleCore.h`, `ScheduleEngine.h` and `tests/` are identical to DeviceIOT;
  only the platform part (locking/queue) in `ScheduleEngine.cpp` differs.

## Components

| File | Role |
|---|---|
| `ScheduleCore.h` | Pure logic (no Arduino dependency): 6-byte encoding + metadata, CRC8, dates/weekdays, conflicts, schedule merging, `PortController` (direct-control priority + Auto OFF). Host test: `tests/schedule_core_test.cpp`. |
| `ScheduleEngine.h/.cpp` | Schedule table in RAM, EEPROM read/write, evaluation of due schedules, command queue for `TaskDevice`. |
| `SystemTask.cpp` | Every 5 s cycle calls `ScheduleEngine::process()` then `flush()` (no new task is created; NON-OS: called from `loop()` in `DeviceIOT8266.ino`). |
| `TaskDevice.cpp` | Applies commands to `device_port`, manages per-port control ownership, Auto OFF. |
| `NetworkMqtt.cpp` | Schedule commands `com` 8..13, returns the compact status message (`rc`/`rs`). |

```
MQTT com 8..12 ──> ScheduleEngine (RAM, dirty) ──flush (SystemTask)──> EEPROM
SystemTask 5 s ──> process(time) ──> schedule command queue ──> TaskDevice ──> GPIO
MQTT/HTTP com:1, button ───────────────────────────────────> TaskDevice (priority)
```

## EEPROM region (2831..3054, 224 bytes)

Placed **after** the last region of the old layout (the Ascon keys end at 2830),
so no existing address is shifted. `EEPROM_SIZE` = 3063 (including the 4-byte
auto-off timer and the 4-byte countdown after it) (< 3 KB, within a 4 KB
sector). `EEPROM.begin()` with a larger size keeps old data intact; the schedule
region is formatted on first boot. Region 115..226 (old pump schedules) is
reserved and no longer read; old schedules are not migrated.

| Address | Size | Content |
|---|---|---|
| 2831 | 4 | Header: `'S' 'C'`, version `1`, slot count `20` |
| 2835 | 20 × 6 | Schedule records id 1..20 (spec §2 format, unchanged) |
| 2955 | 20 × 5 | Metadata id 1..20 |

6-byte record: `hour, minute, weekday, port_state, auto_off_lo, auto_off_hi`.
`weekday` bit0 = Monday … bit6 = Sunday; `0x00` = one-time schedule (ONCE).

5-byte metadata: `flags, port_mask, day_lo, day_hi, crc8`.

- `flags`: bit0 in use, bit1 enabled. (bit2 "done" exists only in RAM.)
- `day` (days since 1970-01-01, local time): for ONCE it is the run date; for
  WEEKLY it is always stored as 0.
- `crc8` covers the 6 record bytes + the first 4 metadata bytes. A slot with a
  bad CRC or invalid data is dropped individually; a bad header reformats the
  whole region.

**EEPROM is only written when the configuration changes** (add/update/delete/
enable/disable/clear all schedules, `com` 8..12), never when a schedule runs.
Run history (last WEEKLY run date, ONCE done) lives only in RAM. Writing happens
in `SystemTask`, not in the MQTT callback. `EEPROM.write()` only marks changed
bytes, and `commit()` is skipped when nothing changed.

**ESP8266 note:** `EEPROM.commit()` erases and rewrites the whole flash sector;
it is not an atomic transaction like ESP32 NVS. A power loss exactly during a
commit can corrupt the whole sector (including WiFi/MQTT configuration) — this
risk already exists for every configuration save. Since running schedules never
writes flash, the number of writes equals only the number of schedule
configuration changes.

## MQTT (and LAN) commands

Send to the subscribe topic like the existing commands, or over LAN
(`docs/LanControl.md`). If Ascon is enabled, wrap `{"com":1,"value":...}` like
any other command. On ESP8266 only `po` = 1 exists.

| `com` | Command | Example |
|---|---|---|
| 5 | Auto-off timer (see section below) | `{"com":5,"value":1800}` |
| 8 | Add schedule | `{"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600}` |
| 9 | Update schedule (same fields as add) | `{"com":9,"id":1,"ho":7,"mi":45,"we":31,"po":1,"pos":1,"au":900}` |
| 10 | Delete schedule | `{"com":10,"id":1}` |
| 11 | Enable / disable schedule | `{"com":11,"id":1,"value":1}` (`0` = disable) |
| 12 | Delete all schedules | `{"com":12}` |
| 13 | Read schedule list | `{"com":13,"fr":1}` |
| 14 | Sensor threshold control (see section below) | `{"com":14,"id":1,"value":34671544}` |

Other numbers in use: 1 control, 2 status, 3 (internal), 4 countdown,
7 Ascon, 15 high-speed acquisition (DeviceIOT only). 6 is unused.

Schedule fields (com 8, 9):

| Field | Meaning | |
|---|---|---|
| `id` | schedule number 1..20 | required (except 12, 13) |
| `ho`, `mi` | hour 0..23, minute 0..59 | required |
| `we` | weekday bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64; `0` = one-time | required |
| `po` | port_mask: ports controlled by the schedule (bit0 = port 1 …) | default `0x01` (pump); bits outside this range → rejected |
| `pos` | port_state: bit = 1 on, 0 off (only within `po`) | required |
| `au` | auto_off 0..65535 seconds, `0` = no auto-off | default 0 |
| `en` | `0` = save in disabled state | default 1 |
| `ye`, `mo`, `da` | run date of a one-time schedule (`we` 0); a time already in the past → rejected | when `we` = 0 |

### Command password (`ENABLE_COMMAND_PASSWORD`)

Every command (MQTT, LAN `/lan`, HTTP `/control`) must include `"pa"` = the
device password, i.e. the `mqtt_pwd` saved during setup (web_manager stores it
as `mqtt_pass` when registering the device):

```json
{"com":5,"value":1800,"pa":"mypassword"}
{"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600,"pa":"mypassword"}
{"com":2,"pa":"mypassword"}
```

- Wrong or missing `pa` → the command does not run and the device returns
  `{"rc":<com>,"rs":6}`; `/control` returns HTTP 403. Every command has the form
  `{"com":<number>,...}`; there are no more `"cmd"`-style commands / replies.
- A device with no password set (empty `mqtt_pwd`) accepts commands without `pa`.
- The check happens after Ascon decryption, so `pa` is inside the encrypted
  command.
- `pa` travels in plain text: over MQTT it is protected by TLS up to the broker
  (the broker can still read it); over LAN it is plain HTTP, and other machines
  on the LAN can sniff it.

### Replies

Every command (except 1, 7, 13, 15) returns the **compact status message**
(like `{"com":2}`) plus the result:

```json
{"se":2,"va":"...","co":"1,0,0,12","set":["7,30,31,1,600"],"tim":1800,"cd":0,"cm":0,"cs":600,"ip":"192.168.1.20","rc":8,"rs":0,"id":1}
{"se":2,"va":"...","co":"1,0,0,12","set":["7,30,31,1,600"],"tim":1800,"cd":0,"cm":0,"cs":600,"ip":"192.168.1.20","rc":8,"rs":1,"id":3,"ci":1,"cp":1}
```

| Field | Meaning |
|---|---|
| `rc` | `com` of the command being answered |
| `rs` | result: 0 success, 1 schedule conflict, 2 invalid, 3 no such schedule, 4 id already in use, 5 not ready, 6 wrong password, 7 busy |
| `id` | schedule id of the command (absent for 5, 12) |
| `ci`, `cp` | when `rs` = 1: id of the conflicting schedule and the conflicting ports |

Detailed rejection reasons are only written to the Serial log, not sent.

Idempotent (QoS 1 redelivery): adding a schedule identical to an existing one →
`rs` 0; adding to an id already in use with different content → `rs` 4 (use
com 9); deleting again → `rs` 0; repeated enable/disable → `rs` 0.

`{"com":13,"fr":1}` returns at most 10 schedules per call (to stay under 1024
bytes):

```json
{"rc":13,"rs":0,"mx":20,"cv":1,"nx":0,"it":[[1,7,30,31,1,1,600,1,0,""],[2,18,0,0,1,1,0,1,0,"2026-12-24"]]}
```

Each `it` row: `id,ho,mi,we,po,pos,au,en,dn,date` (`dn` = one-time schedule has
run; `date` = run date of a one-time schedule, or the most recent run date since
boot for a weekly schedule). `mx` = maximum number of schedules, `cv` = 1 when
the clock is valid, `nx` ≠ 0 → send again with `"fr":nx`.

The existing direct command is unchanged: `{"com":1,"value":X}` (X = 0..1) still
sets all outputs. New optional `"mask"`: `{"com":1,"value":1,"mask":1}`.
Reply: short status message (`se`, `va`, `co`) + `"rc":1,"rs":0`; the message is
sent before the device applies the command, so `co` may still show the old
state. Invalid `value` / `mask` → `{"rc":1,"rs":2}`; command queue full →
`{"rc":1,"rs":5}`.

## Reading status and current schedules: `com:2`

```json
{"com":2}
```

Replaces the old `{"cmd":"STATUS_GET"}` command. The device replies with the
compact status message above with `"rc":2,"rs":0`: `se`, `va`, `co` as in the
periodic message, plus `set` (active schedules), `tim` (auto-off timer, seconds;
`0` = unused), `cd` (auto-on countdown, seconds remaining; `0` = not counting),
`cm` (ports the countdown will turn on), `cs` (seconds of the most recent
countdown), `ip` (LAN address) and `th` (threshold settings).

Each `set` element is exactly the 6-byte EEPROM record, as text
`"hour,minute,weekday,port_state,auto_off"`:

| Example `"8,20,1,4,5"` | Meaning |
|---|---|
| `8,20` | 08:20 |
| `1` | weekday bitmask: bit0 = Monday → every Monday (`0` = one-time schedule) |
| `4` | port_state `0x04`: port 3 on |
| `5` | auto_off: turn off after 5 seconds (byte 4 + byte 5 × 256; `0` = no auto-off) |

- Contains only **active** schedules (enabled, one-time schedules not yet run),
  sorted by scheduled time (same time → by id).
- Like the 6-byte record, `set` has no `port_mask`, id or one-time date; a
  schedule that only turns a port off shows `port_state` = 0. If you need that
  information (to update/delete schedules), use `{"com":13}`.
- Read from RAM, no EEPROM write. With 20 schedules the message is about 600
  bytes.

## Auto-off timer (OnTimer, independent of schedules)

Any port that has been **on continuously for N seconds is turned off
automatically**, whether it was turned on by MQTT (`com:1`), a 3 s button hold
or a schedule. N is a single value shared by all ports.

- Stored as **4 bytes** at 3055..3058 (`ON_TIMER_EEPROM_ADDRESS`, right after
  the schedule region): uint32 little-endian, in seconds, **1..86400 (24 h)**;
  `0` = unused. Blank/corrupt bytes (e.g. `FF FF FF FF`) are treated as `0`.
- EEPROM is only written when the value **changes**, in `SystemTask`
  (`OnTimer::flush()`), not in the MQTT callback.
- Counted with `millis()` (no NTP needed). If a port is turned off and on again
  the count restarts. Changing N takes effect immediately for ports that are
  already on (e.g. setting 60 s for a port that has been on for 10 minutes →
  it turns off on the next `TaskDevice` cycle).
- Does not change schedules or `PortController`: if a schedule has a shorter
  `auto_off`, `auto_off` turns the port off first; whichever deadline comes
  first wins.

```json
{"com":5,"value":1800}
{"com":5,"value":0}
{"com":5}
```

`value` = seconds (1..86400), `0` = disable the timer, no `value` = read only.
The reply is the compact status message with `"rc":5`, `rs` 0 (or 2 when
`value` is invalid) and `tim` = the value in use.

## Auto-on countdown (Countdown, independent of schedules)

A **one-shot** countdown: after N seconds the device turns the ports on, then
stops. N ranges from **1 second to 86400 (24 h)**.

```json
{"com":4,"value":600}
{"com":4,"value":600,"mask":2}
{"com":4,"value":0}
{"com":4}
```

- `com` = 4 (`COMMAND_TYPE_COUNTDOWN`), `value` = seconds. Sending a new command
  while counting restarts the count with the new value.
- `mask` (optional): ports to turn on, bit0 = port 1, bit1 = port 2; defaults to
  all output ports (`SCHEDULE_ALLOWED_PORT_MASK`).
- `value` = 0: cancel the countdown. No `value`: read status only.
- When time is up, the ports are turned on like a direct command (`com:1`): the
  schedule's Auto OFF on that port is cancelled; the auto-off timer (if enabled)
  starts counting from that moment.
- The counter lives only in RAM and is counted with `millis()` (no NTP needed):
  **a power loss or reboot cancels the countdown**.
- **4 bytes** at 3059..3062 (`COUNTDOWN_EEPROM_ADDRESS`): uint32
  little-endian, only stores the N of the most recent countdown so the web can
  display it again. Written only when N differs from the previous one, in
  `SystemTask` (`Countdown::flush()`).

Reply: compact status message + `"rc":4,"rs"` (replaces the old
`COUNTDOWN_ACK`):

```json
{"se":2,"va":"...","co":"0,0,0,12","set":[],"tim":0,"cd":600,"cm":3,"cs":600,"ip":"192.168.1.20","th":[0,0],"rc":4,"rs":0}
{"se":2,"va":"...","co":"0,0,0,12","set":[],"tim":0,"cd":0,"cm":0,"cs":600,"ip":"192.168.1.20","th":[0,0],"rc":4,"rs":0}
```

`cd` = seconds remaining (0 = not counting), `cm` = ports that will turn on,
`cs` = most recent N. `rs`: 0 success, 2 invalid `value` / `mask`, 5 not ready.
`{"com":2}` also returns `cd`, `cm`, `cs`.

## Sensor threshold control (ThresholdControl, independent of schedules)

Up to **2 settings**, each setting is **4 bytes** packed into one `value`
number:

| Byte | Bit | Meaning |
|---|---|---|
| 1 | 31..24 | Sensor index in the `va` string, starting at 1; `0` = empty |
| 2 | 19..16 (bit0-3) | Target ports (bit0 = port 1 …) |
| 2 | 20 (bit4) | `1` = turn on, `0` = turn off |
| 2 | 21 (bit5) | `0` = when sensor **≥** threshold, `1` = when sensor **≤** threshold |
| 3-4 | 15..0 | Threshold `int16`, same unit as `va` |

Sensors: 1 humidity ×100, 2 temperature ×100, 3 ADC (ports: bit0 only).

```json
{"com":14,"id":1,"value":34671544,"pa":"..."}
{"com":14,"id":2,"value":35719920,"pa":"..."}
{"com":14,"id":1,"value":0,"pa":"..."}
{"com":14,"pa":"..."}
```

- Example 1: `34671544` = `0x02110BB8` → sensor 2 (temperature), `0x11` = port 1 + on, ≥ `3000` (30.00 °C).
- Example 2: `35719920` = `0x02210AF0` → temperature ≤ `2800` (28.00 °C) turns port 1 off: this pair creates a hysteresis band.
- `value` 0 = delete the setting; no `id`/`value` = read only.
- The action runs **once each time the condition changes from false to true**
  (not repeated on every sensor read), applied like a direct `com:1` command. A
  newly saved setting whose condition is already true runs on the next sensor
  read.
- If two settings are true at the same time on the same port but opposite → the
  port stays unchanged.
- Humidity / temperature: skipped when the DHT read fails (`dhtValid` = false).
- Stored as 8 bytes at 3063..3070 (`THRESHOLD_EEPROM_ADDRESS`), written only on
  change, in `SystemTask`. `EEPROM_SIZE` = 3071 (limit 3072).

Reply: compact status message + `"rc":14,"rs":0|2[,"id":n]`, with
`"th":[v1,v2]` (both settings). `{"com":2}` also returns `th`.

## Conflicts

Two schedules conflict when they have the same hour:minute, overlapping days
(WEEKLY∩WEEKLY by bit, ONCE by the weekday of that date), control the same port
and request different things: different ON/OFF, or both ON but with a different
`auto_off`.

- On ADD/UPDATE/ENABLE: the new schedule is rejected (`CONFLICT`), the old one
  is kept.
- At run time (in case any slipped through): the conflicting port is skipped
  for all schedules in that minute; other ports still run; schedules with the
  same state are merged.

## Direct control priority

`TaskDevice` keeps a `PortController` for 8 ports (`manualOverride`,
`scheduleGeneration`, `autoOffDeadline`):

- Direct command (MQTT/HTTP `com:1`, 3 s button hold): immediately changes the
  ports in the mask, sets override, increments generation → the old Auto OFF on
  that port is invalidated.
- The next schedule event on that port: clears override, applies the state,
  sets a new Auto OFF if turning on and `auto_off > 0`.
- Auto OFF only turns off when the generation still matches and there is no
  override, so an old schedule cannot turn off a port that was just turned on
  again by a direct command or another schedule.
- A schedule command and a direct command arriving in the same `TaskDevice`
  cycle: the schedule is applied first, the direct command afterwards (wins).

## Time and recovery after reboot

- Runs only when `time()` is valid (NTP; ≥ 2024-01-01). `millis()` is not used.
  Once synchronized, the ESP8266 clock keeps running when the Internet is lost.
- Local time = UTC + `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS`
  (default 0; **for Vietnam set `7 * 3600`**).
- The first time a valid clock is available after boot: only the current minute
  is considered. Schedules with an earlier time do not run again; ONCE schedules
  whose time has passed are marked done (in RAM) and do not run late. No
  history in EEPROM is needed for this.
- The only exception: if the device reboots **within the same minute** in which
  a schedule just ran, that schedule runs one more time. The ON/OFF command is
  repeated for the same state; Auto OFF is recalculated from the later run.
- Task delayed: catches up at most `SCHEDULE_CATCHUP_MINUTES` (5) minutes.
- Command queue full: not marked as run, retried on the next cycle.

## Testing

`tests/schedule_core_test.cpp` (runs on a host PC) covers spec test cases 1–10
and 15 at the logic level: correct day, port isolation, Auto OFF 600/0,
conflicts, Direct OFF/ON, stale Auto OFF ignored, schedule ownership restored,
duplicate ADD, encoding/CRC.

```
g++ -std=c++17 -Wall -Wextra tests/schedule_core_test.cpp -o schedule_core_test && ./schedule_core_test
```

The test for `port_mask` 3 (Port 2) lives in the shared logic test file and does
not depend on the board's number of outputs.

Tests 11–14 (reboot, Internet loss, power loss, schedule deletion) must be run
on the device.
