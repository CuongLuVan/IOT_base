# Connectivity

How the network task keeps Wi-Fi, the Internet path and the broker connected.
The same code runs on DeviceIOT (ESP32) and DeviceIOT8266; this file is
identical in both `docs` folders. Constants live in `timing.h` (section
"Station link and network health").

## Modules

| File | Role |
|------|------|
| `TaskNetwork.cpp` | One pass: `collectTaskState()`, `serviceConnectivity()`, `serviceHttp()`, `serviceMqtt()`, `receiveLora()`, `publishTelemetry()`. |
| `NetworkWifi.cpp` | Station reconnect state machine, access points, ARP link checks, last-resort restart. |
| `LinkProbe.cpp` | Non-blocking lwIP probes: gateway / duplicate-address ARP, broker DNS lookup. |
| `HttpServer.cpp` | The web server; restarted on every new lease. |
| `SetupPortal.cpp` | `/`, `/setup`, `/wifi`. |
| `DeviceHttpApi.cpp` | `/update`, `/control`, `/lan`, `/lora`. |
| ESP32 only: `WifiProvisioning.cpp`, `OtaUpdater.cpp`, `HighSpeedUdpSender.cpp` | BLE / SmartConfig, HTTP OTA, capture datagrams. |

## Blocking and the task watchdog

Most of a network pass takes a few milliseconds. The steps below block
longer; each is bounded, and every wait in them sleeps or yields, so the
other tasks (and, on the NON-OS core, TaskDevice as a recurrent scheduled
function) keep running. Under SUPPORT_RTOS the network task is subscribed to
the task watchdog (`TaskWatchdog.h`, `TASK_WATCHDOG_TIMEOUT_MS` 20 s on ESP32,
heartbeat `TASK_HEARTBEAT_TIMEOUT_MS` 30 s on both) and feeds it every pass
and between the blocking steps.

| Step | Bound |
|------|-------|
| HTTP request | The request gate (`DeviceWebServer::handleClient()`) hands a request to the core parser only when its header and, up to `HTTP_PREBUFFER_MAX_LENGTH` bytes, its body have arrived; otherwise it returns at once. A client that does not get there in `HTTP_REQUEST_TIMEOUT_MS` is closed (408), a header over `HTTP_HEADER_MAX_LENGTH` gets 431, a Content-Length over the route limit (`LAN_REQUEST_MAX_LENGTH`, or `SETUP_HTTP_BODY_MAX_LENGTH` on the setup pages) gets 413 before any of the body is read. Only a setup-page body larger than `HTTP_PREBUFFER_MAX_LENGTH` is read by the core while it arrives (yielding, at most `HTTP_MAX_POST_WAIT` 5 s per pause). Sending a reply waits for TCP send space (a few seconds at most). |
| MQTT connect | Attempted only after the asynchronous DNS probe resolved the broker host, at most every `MQTT_RETRY_INTERVAL_MS` and after the MQTT back-off. ESP32: TCP connect and TLS reads / writes `MQTT_SOCKET_TIMEOUT_SECONDS` (3 s), handshake `MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS` (10 s), CONNACK `MQTT_SOCKET_TIMEOUT_SECONDS`: at most about 16 s. ESP8266 NON-OS (BearSSL): DNS (cached), TCP connect and handshake `MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS` (6 s) each, CONNACK 3 s; the whole loop() waits, TaskDevice keeps running. ESP8266 RTOS: DNS up to 15 s (core limit, no DNS probe there), TCP probe 3 s, handshake 6 s, CONNACK 3 s. |
| MQTT publish / loop | TLS writes wait for send space up to the socket timeout; PubSubClient waits for the rest of a packet up to `MQTT_SOCKET_TIMEOUT_SECONDS`, sleeping 1 ms per empty poll. |
| LoRa send (`/lora`) | Waits for the end of the transmission, at most `LORA_TX_TIMEOUT_MS`. |
| OTA (ESP32, OTA mode only) | HTTP connect `OTA_HTTP_CONNECT_TIMEOUT_MS`, reads `OTA_HTTP_TIMEOUT_MS`; the download gives up after `OTA_STALL_TIMEOUT_MS` without data and feeds the watchdog while it runs. |
| Setup pages, provisioning | One EEPROM commit (tens of milliseconds). |

Restarts requested from the network side (setup pages, provisioning, network
button, OTA, offline watchdog) go through `safe_restart::restart()`
(`SafeRestart.h`): pending settings are flushed and the restart happens
while holding the EEPROM lock, so it never interrupts a flash commit.

## Wi-Fi modes

`EEPROM_ADDR_WIFI_MODE` (`WifiMode`, `eeprom_layout.h`) selects what starts:

| Stored value | Runs |
|--------------|------|
| 1 Station | Station, MQTT, LAN API. No stored SSID: the Wi-Fi page access point. |
| 4 ApPortal | Access point `WIFI_AP_SSID` with `/`, `/setup`, `/wifi`. |
| anything else (new device) | Access point `SETUP_PORTAL_AP_SSID` ("setup_now") with the same pages. |
| 2 BleProvision, 3 SmartConfig, 5 Ota | ESP32 only; DeviceIOT8266 opens the Wi-Fi page instead. |

`/setup` stores the MQTT settings and certificates in one EEPROM commit, sets
ApPortal and restarts; `/wifi` stores the network, sets Station and restarts.
On ESP32 a long press of `NETWORK_CONFIG_BUTTON_PIN` (GPIO0) only stores a
mode (3 s BLE, 6 s SmartConfig, 10 s Wi-Fi page, 20 s OTA) and restarts.

## Station link

The station never relies on the SDK auto-reconnect: `WiFi.persistent(false)`,
`setAutoReconnect(false)`, modem sleep off (`WiFi.setSleep(false)` /
`WIFI_NONE_SLEEP`), DHCP (no static address) and the host name
`DEVICE_HOSTNAME_PREFIX` + the last three MAC bytes.

Wi-Fi event handlers (ESP32 `WiFi.onEvent`; ESP8266
`onStationModeConnected / Disconnected / GotIP / DHCPTimeout`) only count
events and record the disconnect reason; the network task acts on them and
also polls `WiFi.status()`, so a missed event is caught too. Each disconnect
is logged once with its reason code (WARNING; the station's own leave,
reason 8, at DEBUG).

```
           +-------------------- back-off elapsed ---------------------+
           v                                                           |
  Connecting --associated--> WaitingForIp --lease--> Online --lost--> Disconnected
     | timeout WIFI_CONNECT_TIMEOUT_MS   | timeout WIFI_DHCP_TIMEOUT_MS      ^
     | or rejected                       | or DHCP timeout event            |
     +-----------------------------------+------> attempt failed ----------+
                                                   every WIFI_HARD_RESET_AFTER_FAILURES:
                                                   RadioReset (off WIFI_RADIO_OFF_MS) -> Connecting
```

* Back-off after a failed attempt: `WIFI_BACKOFF_MIN_MS` doubling up to
  `WIFI_BACKOFF_MAX_MS`; the wait is half fixed, half random. A lost link
  retries after `WIFI_BACKOFF_MIN_MS`; a lease resets the count.
* Radio reset: `WiFi.disconnect(true)`, mode OFF, and after
  `WIFI_RADIO_OFF_MS` (timed by the state machine, not `delay`) mode STA and a
  new attempt.
* Access point fallback: offline for `WIFI_CONFIG_PORTAL_AFTER_MS` opens
  `WIFI_AP_SSID` in `WIFI_AP_STA` mode, so the station keeps retrying; it
  closes as soon as the station has a lease again.
* Last resort: no lease for `WIFI_RESTART_AFTER_OFFLINE_MS` (0 = never)
  restarts the device, but not while a phone or PC is connected to the access
  point.

## New lease

Every new lease (and radio reset) increments `linkGeneration()`. The network
task then restarts the web server, reopens the high-speed UDP socket (ESP32)
and drops the MQTT session so it reconnects from the new address. `/lan`
replies and telemetry read the address live.

## Link checks (gateway and IP conflicts)

`WIFI_LINK_FIRST_CHECK_MS` after a lease and then every
`WIFI_LINK_CHECK_INTERVAL_MS`, `LinkProbe` flushes the station ARP cache and
sends two ARP requests: for the gateway and for the device's own address.
`WIFI_ARP_REPLY_WAIT_MS` later it reads the ARP table:

* No entry for the gateway: the gateway did not answer. After
  `WIFI_GATEWAY_FAIL_LIMIT` checks in a row (`WIFI_LINK_RECHECK_MS` apart) the
  lease is dropped and the station reconnects.
* An entry for our own address with another MAC: another host uses the
  address. After `WIFI_IP_CONFLICT_CONFIRMATIONS` detections the lease is
  dropped and the station reconnects, which makes DHCP hand out a lease
  again; while the conflict persists every further reconnect waits one
  back-off step longer.

No check starts while a high-speed capture runs (ESP32), because the ARP
flush would cost capture datagrams. The calls run inside the lwIP tcpip thread on ESP32 (`esp_netif_tcpip_exec`)
and directly from `loop()` on the ESP8266 NON-OS core.

Core support:

* ESP32: lwIP is built with `DHCP_DOES_ARP_CHECK` / `LWIP_DHCP_DOES_ACD_CHECK`,
  so DHCP itself probes an offered address and declines it when another host
  answers; the periodic check above covers conflicts that appear later.
* ESP8266 NON-OS: the prebuilt lwIP has no DHCP ARP check
  (`DHCP_DOES_ARP_CHECK 0`); only the periodic check runs. A DHCP server that
  keeps offering the conflicting address cannot be told to decline it (lwIP
  does not export `dhcp_decline`), so the device keeps reconnecting with
  growing back-off until the conflict is resolved.
* ESP8266 RTOS core: no probes (gateway, conflict and DNS report "not
  supported"); the reconnect state machine works by polling `WiFi.status()`.

## Internet and broker

While Wi-Fi is online and MQTT is not connected, the broker host (from the
stored MQTT settings) is resolved with an asynchronous lwIP DNS lookup at most
every `DNS_PROBE_INTERVAL_MS` (timeout `DNS_PROBE_TIMEOUT_MS`). MQTT connects
are attempted at most every `MQTT_RETRY_INTERVAL_MS` and the MQTT module adds
its own back-off. If MQTT stays down for `INTERNET_DOWN_RECONNECT_MS` with
Wi-Fi online, the Wi-Fi link is cycled once (a fresh lease often fixes stale
DHCP / DNS / NAT state); the normal back-off continues afterwards, and the
cycle is armed again only after MQTT connected.

## Recovery ladder

1. Station rejected / timeout: retry with back-off.
2. Every `WIFI_HARD_RESET_AFTER_FAILURES` failures: radio reset.
3. Gateway silent or IP conflict: drop the lease and reconnect.
4. Broker unreachable for `INTERNET_DOWN_RECONNECT_MS`: cycle Wi-Fi once.
5. Offline for `WIFI_CONFIG_PORTAL_AFTER_MS`: Wi-Fi page access point (station keeps retrying).
6. Offline for `WIFI_RESTART_AFTER_OFFLINE_MS`: restart.

## Telemetry

The system telemetry message (`SystemTask::telemetryJson()`, every
`SYSTEM_TASK_TELEMETRY_INTERVAL_MS`) gets a `"net"` object. When the combined
message does not fit the MQTT packet (DeviceIOT8266, `MQTT_PAYLOAD_SIZE`
1024), the system part and `{"net":{...}}` are published as two messages:

```json
"net": {"link":"online","ip":"192.168.1.23","host":"deviceiot-a1b2c3","rssi":-61,
        "gateway":true,"dns":"ok","mqtt":true,"reconnects":2,"reason":201,
        "conflicts":0,"portal":false}
```

`link` is one of off, disconnected, connecting, dhcp, online, radio_reset;
`dns` one of idle, pending, ok, failed; `reason` is the last disconnect reason
code of the Wi-Fi driver.
