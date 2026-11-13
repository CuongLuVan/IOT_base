# LAN control

Use this when the MQTT broker or the Internet is down but the LAN still works:
send **the exact MQTT command** to the device over HTTP on the local network.

Enable/disable with `ENABLE_LAN_CONTROL` in `define_All.h` (enabled by default).

## Request

```
POST http://<device ip>/lan
Content-Type: application/json

{"data": <MQTT command>}
```

`data` is the full MQTT command: a JSON object, or a string containing that JSON.

```json
{"data":{"com":1,"value":1}}
{"data":{"com":2}}
{"data":{"com":5,"value":1800}}
{"data":{"com":4,"value":600}}
{"data":{"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600}}
```

## Response

```json
{"ip":"192.168.1.20","data":[{"se":2,"va":"...","co":"1,0,0,12","set":[],"tim":1800,"cd":0,"ip":"192.168.1.20","rc":5,"rs":0}]}
```

- `data` holds the messages the device would otherwise have published to MQTT
  for that command, in the same format. Over LAN they are **not** published to
  MQTT.
- `ip` is the device's current LAN address.

| HTTP | When |
|---|---|
| 200 | The command ran and `data` contains at least one message |
| 400 | The body is not `{"data":<command>}` or exceeds `LAN_REQUEST_MAX_LENGTH` |
| 408 | The headers (and body up to `HTTP_PREBUFFER_MAX_LENGTH` bytes) did not arrive within `HTTP_REQUEST_TIMEOUT_MS` (3 s); the connection is closed |
| 413 | `Content-Length` is larger than `LAN_REQUEST_MAX_LENGTH`: rejected before reading the body |
| 431 | Headers longer than `HTTP_HEADER_MAX_LENGTH` (1024 bytes) |
| 422 | No reply message: invalid JSON, bad signature / Ascon, or `{"com":7}` while Ascon is enabled (the handshake always replies over MQTT; with Ascon disabled, com 7 returns `rs` 2). An unknown or rejected command (bad field, wrong password, schedule conflict...) still returns 200 with `rs` ≠ 0, e.g. `[{"rc":99,"rs":2}]` |

## How it works

- The command goes into **the same MQTT message handler** (`mqtt::dispatch` in
  `CommandDispatcher.cpp`): same size limits, same signature
  (`ENABLE_MESSAGE_AUTHENTICATION`) and Ascon (`ENABLE_ASCON_AEAD128`) checks,
  same `com` commands (1, 2, 4, 5, 8..14; 15 is DeviceIOT only) — every command
  is `{"com":<number>}`, there is no `"cmd"` anymore.
- Reply messages are collected into the HTTP response instead of being
  published. No broker replay/signature fields are added; if Ascon is enabled
  they are still encrypted as over MQTT.
- The Ascon handshake message (`{"rc":7,...}`, when replying to `{"com":7}` or
  when the key is due for rotation while a LAN command runs) is always published
  to the broker and is not part of the LAN response. If the broker is not
  connected, the new key is not announced and a LAN reply that needs encryption
  is dropped (422).
- So with Ascon enabled, LAN is **not a fallback path** when the broker is
  lost: the session key only exists after the handshake message has been
  published over MQTT, so if the broker has never connected since boot (or the
  key is due for rotation while the broker is down), `/update`, `/control` and
  `/lan` all return errors (fail-closed). If you need LAN as a fallback, disable
  `ENABLE_ASCON_AEAD128` and use the command password.
- Runs in TaskNetwork, on the same thread as the MQTT callback, so no extra
  locking is needed.
- `{"com":2}` (also over MQTT) additionally returns `"ip"` so web_manager knows
  the LAN address while MQTT is still connected.
- DeviceIOT (ESP32): when only the broker / Internet fails but WiFi is still
  connected, the device **no longer drops WiFi** (previously it disconnected and
  reconnected every ~20 s), the HTTP server is served even when MQTT is down,
  and MQTT connection attempts are spaced `MQTT_RETRY_INTERVAL_MS` (5 s) apart
  so the LAN server can still reply in time.
- DeviceIOT8266: the HTTP server already runs whenever WiFi is connected, even
  when MQTT is down, and MQTT reconnects are already spaced out by
  `MQTT_RECONNECT_DELAY_MS`.

## Security

LAN commands must also include `"pa"` = the device password (see `Schedule.md`,
section "Command password"); wrong → `{"rc":<com>,"rs":6}`. web_manager attaches
`pa` from `mqtt_pass`. The password travels in plain text over HTTP on the LAN.

Apart from the command password (`pa`, sent in plain text) there is no separate
authentication for LAN. On an untrusted LAN:

- enable `ENABLE_MESSAGE_AUTHENTICATION`: LAN commands must then carry an HMAC
  signature like MQTT commands. The device does not check for replay, so a
  signed command captured on the LAN can be resent;
- or disable `ENABLE_LAN_CONTROL`.

## web_manager

LAN control **does not go through the web_manager server**: the browser on the
user's machine (on the same LAN as the device) sends `POST http://<ip>/lan`
directly, builds the `{"com":...}` command itself and parses the reply messages
itself (status, `set`, `tim`, `cd`, schedule list, `rs` code). The server is
only used for MQTT.

- The **Connection** section on the device page: Auto / MQTT / LAN, the IP
  reported by the device, and a manual IP field (stored in the browser). "Auto"
  uses MQTT when the server, broker and device are answering over MQTT (within
  60 s), otherwise LAN.
- The IP comes from the `"ip"` field the device sends over MQTT (reply to
  `{"com":2}`) or in a LAN reply, and is stored in the browser; the device list
  is also stored so devices can still be controlled over LAN when the server is
  unreachable.
- The device answers CORS (`Access-Control-Allow-Origin: *`) and the
  `OPTIONS /lan` preflight (with `Access-Control-Allow-Private-Network: true` for
  Chrome). The page sends `Content-Type: text/plain` to avoid a preflight when
  possible.
- If the web_manager page is opened over **HTTPS**, the browser may block
  `http://` calls to the device (mixed content / local network access): allow
  local network access in the browser, or open the page over HTTP on the LAN.
- The browser has no HMAC key: when `ENABLE_MESSAGE_AUTHENTICATION` is enabled,
  LAN commands from the page will be rejected (422).
