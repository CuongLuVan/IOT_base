#pragma once

// DeviceIOT8266 task timing, buffer sizes and network limits.

// Schedules compare local time/date in this timezone. Vietnam: 7 * 3600.
#define SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS 0
// After a delayed scheduler cycle, catch up at most this many minutes.
#define SCHEDULE_CATCHUP_MINUTES 5

// Tasks (SUPPORT_RTOS only). esp8266RTOS stack sizes are in bytes
// (StackType_t is uint8_t). TaskNetwork runs the mbedTLS handshake on its own
// stack. TaskDevice has the highest priority so outputs, button and auto OFF
// keep running while the network task is busy.
#define SERIAL_BAUD_RATE 115200
#define TASK_STACK_SIZE 3072
#if SUPPORT_RTOS
#define TASK_NETWORK_STACK_SIZE 8192
#else
#define TASK_NETWORK_STACK_SIZE 4096
#endif
#define TASK_SYSTEM_STACK_SIZE 3584  // Settings flush: NVS write + printf + schedule table copy.
#define TASK_CREATE_DELAY_MS 10
#define TASK_DEVICE_PRIORITY 3
#define TASK_SENSOR_PRIORITY 2
#define TASK_NETWORK_PRIORITY 2
#define TASK_SYSTEM_PRIORITY 2
#define COOP_LOOP_DELAY_MS 2
#define RTOS_IDLE_LOOP_DELAY_MS 50
// TaskNetwork period under SUPPORT_RTOS.
#define NETWORK_TASK_PERIOD_MS 20

// Task supervision (TaskWatchdog.h, SUPPORT_RTOS): SystemTask / TaskDevice
// restart the device when a subscribed task does not call
// task_watchdog::reset() for TASK_HEARTBEAT_TIMEOUT_MS.
#define TASK_HEARTBEAT_TIMEOUT_MS 30000UL

#define SYSTEM_TASK_CHECK_INTERVAL_MS 5000UL
#define SYSTEM_TASK_TELEMETRY_INTERVAL_MS 30000UL
#define SYSTEM_TASK_DEBUG_LOG 0
#define SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS 60000UL
// Automation settings (schedules, on-timer, countdown, threshold rules) are
// written with one EEPROM commit at most every SETTINGS_FLUSH_INTERVAL_MS. A
// failed commit is retried after a doubling delay (up to
// SETTINGS_FLUSH_RETRY_MAX_MS), at most SETTINGS_FLUSH_MAX_RETRIES times.
#define SETTINGS_FLUSH_INTERVAL_MS 15000UL
#define SETTINGS_FLUSH_RETRY_MAX_MS 600000UL
#define SETTINGS_FLUSH_MAX_RETRIES 5

// Sensors: DHT11 must not be queried more often than once every 2 s.
#define DHT_READ_INTERVAL_MS 2500UL
#define ADC_READ_INTERVAL_MS 1000UL
#define ADC_SAMPLE_COUNT 4
#define SENSOR_TASK_POLL_MS 25UL
// Minimum interval between two sensor publishes.
#define SENSOR_PUBLISH_MIN_INTERVAL_MS 5000UL

#define DEVICE_TASK_PERIOD_MS 25UL
#define BUTTON_DEBOUNCE_MS 50UL
#define BUTTON_LONG_PRESS_MS 3000UL

// How long an MQTT / LAN / HTTP handler waits for room in the device command queue.
#define COMMAND_QUEUE_TIMEOUT_MS 50
#define DEVICE_COMMAND_QUEUE_LENGTH 10

// JSON and MQTT buffers.
#define MQTT_SUBSCRIBE_QOS 1
#define MQTT_PAYLOAD_SIZE 1024
// Wire packet limit: Ascon hex-encodes the payload, so it needs more room
// than the plaintext buffers sized by MQTT_PAYLOAD_SIZE.
#if ENABLE_ASCON_AEAD128
#define MQTT_PACKET_SIZE 2048
#else
#define MQTT_PACKET_SIZE MQTT_PAYLOAD_SIZE
#endif
// BearSSL (NON-OS core) buffers. The Node.js broker does not negotiate the
// max_fragment_length extension, so the receive buffer must hold one whole
// incoming record: the ECDSA handshake flight (~1 KB) and the largest MQTT
// packet plus TLS overhead. Outgoing data is split into records as needed.
#if MQTT_PACKET_SIZE <= 1024
#define TLS_RX_BUFFER_SIZE 2048
#else
#define TLS_RX_BUFFER_SIZE 4096
#endif
#define TLS_TX_BUFFER_SIZE 512
#define MQTT_RETRY_INTERVAL_MS 5000UL
// MQTT reconnection. connect() waits between attempts itself: the first retry
// after MQTT_RECONNECT_BACKOFF_MIN_MS, doubling up to MQTT_RECONNECT_BACKOFF_MAX_MS,
// plus up to MQTT_RECONNECT_JITTER_PERCENT % random jitter; a successful
// connect + subscribe resets it. A connect blocks the NON-OS loop() for
// seconds, so the first retry does not immediately block the main loop.
#define MQTT_RECONNECT_BACKOFF_MIN_MS 10000UL
#define MQTT_RECONNECT_BACKOFF_MAX_MS 60000UL
// Certificate renewal (com 16): failed connects with the renewed certificate
// before the device goes back to the stored one.
#define MQTT_CERT_RENEW_MAX_FAILURES 3
#define MQTT_RECONNECT_JITTER_PERCENT 25
// PINGREQ interval; a connection silent for 2 x keepalive is closed.
#define MQTT_KEEPALIVE_SECONDS 30
// Bounds on the blocking steps of a connect.
// NON-OS core (BearSSL): the client timeout MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS
// bounds DNS, TCP connect and the handshake each; MQTT connects only after the
// asynchronous DNS probe resolved the broker host, so DNS answers from the
// cache. The CONNACK wait is MQTT_SOCKET_TIMEOUT_SECONDS. Every wait yields,
// so TaskDevice (a recurrent scheduled function) keeps running.
// RTOS core (mbedTLS): DNS (core limit 15 s), TCP connect
// (MQTT_SOCKET_TIMEOUT_SECONDS, probed first), handshake and socket reads /
// writes (MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS).
#define MQTT_SOCKET_TIMEOUT_SECONDS 3
#define MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS 6

// HTTP / LAN.
#define WIFI_HTTP_PORT 80
#define HTTP_STATUS_OK 200
#define LAN_CONTROL_PATH "/lan"
#define LAN_REQUEST_MAX_LENGTH (MQTT_PACKET_SIZE + 64)
#define LAN_REPLY_MAX_LENGTH 2048
// Request gate of the web server (HttpServer.cpp): a request reaches the core
// parser only once its header (at most HTTP_HEADER_MAX_LENGTH bytes) and,
// up to HTTP_PREBUFFER_MAX_LENGTH bytes in total, its whole body have arrived.
// A client that does not get there within HTTP_REQUEST_TIMEOUT_MS is closed;
// a Content-Length above the route limit is answered with 413 before any of
// the body is read. lwIP v2 "lower memory" accepts 2144 bytes (4 x 536)
// before the first read; larger bodies are read by the core, which yields
// while it waits (at most HTTP_MAX_POST_WAIT per gap).
#define HTTP_HEADER_MAX_LENGTH 1024
#define HTTP_PREBUFFER_MAX_LENGTH 2048
#define HTTP_REQUEST_TIMEOUT_MS 3000UL

// Wi-Fi and portal.
#define DEVICE_HOSTNAME_PREFIX "deviceiot8266-"
// Access point of the Wi-Fi page (/wifi): WifiMode::ApPortal and the
// fallback when the station stays offline.
#define WIFI_AP_SSID "ESP_Config"
#define WIFI_AP_PASSWORD "12345678"
// Access point of a device without a stored mode (/setup first); the SSID
// doubles as password.
#define SETUP_PORTAL_AP_SSID "setup_now"
#define SETUP_PORTAL_AP_PASSWORD "setup_now"
// Largest /setup body: settings plus three ECDSA P-256 PEMs (~1.4 KB) with
// JSON escaping.
#define SETUP_REQUEST_MAX_LENGTH 4096
// Largest /setup and /wifi HTTP body: the pages send the JSON
// form-urlencoded ("data=" + encodeURIComponent), which grows it.
#define SETUP_HTTP_BODY_MAX_LENGTH (2 * SETUP_REQUEST_MAX_LENGTH)
// Time for the last portal reply to leave before the restart.
#define WIFI_WEB_RESPONSE_DELAY_MS 150
// LoRa: longest wait for the end of a transmission (255 bytes at SF7 /
// 125 kHz take about 0.4 s).
#define LORA_TX_TIMEOUT_MS 2000UL

// Station link and network health (NetworkWifi / TaskNetwork, docs/Connectivity.md).
// Each attempt: associate within WIFI_CONNECT_TIMEOUT_MS, then get a DHCP
// lease within WIFI_DHCP_TIMEOUT_MS. Failed attempts back off from
// WIFI_BACKOFF_MIN_MS, doubling up to WIFI_BACKOFF_MAX_MS, with random jitter;
// every WIFI_HARD_RESET_AFTER_FAILURES consecutive failures the radio is
// switched off for WIFI_RADIO_OFF_MS first.
#define WIFI_CONNECT_TIMEOUT_MS 20000UL
#define WIFI_DHCP_TIMEOUT_MS 15000UL
#define WIFI_BACKOFF_MIN_MS 1000UL
#define WIFI_BACKOFF_MAX_MS 60000UL
#define WIFI_HARD_RESET_AFTER_FAILURES 5
#define WIFI_RADIO_OFF_MS 500UL
// The station keeps retrying while the Wi-Fi page is open (WIFI_AP_STA); the
// access point closes once the station is online again.
#define WIFI_CONFIG_PORTAL_AFTER_MS 120000UL
// Last resort: restart after this long without a lease, unless a phone or PC
// is connected to the access point. 0 = never.
#define WIFI_RESTART_AFTER_OFFLINE_MS 1800000UL
// Gateway ARP and duplicate-address check: WIFI_LINK_FIRST_CHECK_MS after a
// new lease, then every WIFI_LINK_CHECK_INTERVAL_MS, and every
// WIFI_LINK_RECHECK_MS while a check is failing.
#define WIFI_LINK_FIRST_CHECK_MS 3000UL
#define WIFI_LINK_CHECK_INTERVAL_MS 60000UL
#define WIFI_LINK_RECHECK_MS 5000UL
#define WIFI_ARP_REPLY_WAIT_MS 1000UL
#define WIFI_GATEWAY_FAIL_LIMIT 3
#define WIFI_IP_CONFLICT_CONFIRMATIONS 2
// Broker host DNS probe and Internet watchdog: with Wi-Fi online but MQTT
// down for INTERNET_DOWN_RECONNECT_MS, the Wi-Fi link is cycled once.
#define DNS_PROBE_INTERVAL_MS 60000UL
#define DNS_PROBE_TIMEOUT_MS 10000UL
#define INTERNET_DOWN_RECONNECT_MS 300000UL
