#pragma once

// DeviceIOT (ESP32) task timing, buffer sizes and network limits.

// Schedules compare local time/date in this timezone. Vietnam: 7 * 3600.
#define SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS 0
// After a delayed scheduler cycle, catch up at most this many minutes.
#define SCHEDULE_CATCHUP_MINUTES 5

// Tasks (xTaskCreatePinnedToCore stack sizes are in bytes on ESP32).
// TaskDevice and SystemTask run on core 0 with TaskNetwork: TaskDevice has the
// higher priority so outputs, button and auto OFF keep running while the
// network task is busy (TLS handshake, slow HTTP client); TaskDevice sleeps
// almost all the time, so it never starves the network.
#define SERIAL_BAUD_RATE 115200
#define TASK_STACK_SIZE 10000
#define TASK_NETWORK_STACK_SIZE 10000
#define TASK_SYSTEM_STACK_SIZE 6144  // Settings flush: NVS write + printf + schedule table copy.
#define TASK_CREATE_DELAY_MS 10
#define TASK_DEVICE_PRIORITY 3
#define TASK_SENSOR_PRIORITY 3  // Alone on core 1.
#define TASK_NETWORK_PRIORITY 2
#define TASK_SYSTEM_PRIORITY 2
#define RTOS_IDLE_LOOP_DELAY_MS 1000

// Task supervision (TaskWatchdog.h): a subscribed task that does not call
// task_watchdog::reset() for TASK_WATCHDOG_TIMEOUT_MS triggers the ESP32 task
// watchdog (panic + restart); TASK_HEARTBEAT_TIMEOUT_MS is the logged
// heartbeat check of SystemTask / TaskDevice.
#define TASK_WATCHDOG_TIMEOUT_MS 20000UL
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

// Sensors: the PMS UART is polled every SENSOR_TASK_POLL_MS; DHT11 needs at
// least 2 s between reads.
#define SENSOR_TASK_POLL_MS 20UL
#define DHT_READ_INTERVAL_MS 4000UL
// Minimum interval between two sensor publishes.
#define SENSOR_PUBLISH_MIN_INTERVAL_MS 5000UL

// TaskDevice polls the button and applies commands every period, so the
// button debounce works and queued commands are applied without delay.
#define DEVICE_TASK_PERIOD_MS 25UL
#define BUTTON_DEBOUNCE_MS 50UL
#define BUTTON_LONG_PRESS_MS 3000UL

// How long an MQTT / LAN / HTTP handler waits for room in the device command queue.
#define COMMAND_QUEUE_TIMEOUT_MS 50
#define DEVICE_COMMAND_QUEUE_LENGTH 10

// JSON and MQTT buffers.
#define MQTT_SUBSCRIBE_QOS 1
// The telemetry message (system, tasks, capture and "net" blocks) needs
// about 1.2 KB, so the ESP32 buffers are 2 KB.
#define MQTT_PAYLOAD_SIZE 2048
// Wire packet limit: Ascon hex-encodes the payload, so it needs twice the room.
#if ENABLE_ASCON_AEAD128
#define MQTT_PACKET_SIZE 4096
#else
#define MQTT_PACKET_SIZE MQTT_PAYLOAD_SIZE
#endif
// Each failed MQTT connect can block TaskNetwork for a few seconds; space the
// attempts so the LAN server keeps answering when the broker is unreachable.
#define MQTT_RETRY_INTERVAL_MS 5000UL
// MQTT reconnection. connect() waits between attempts itself: the first retry
// after MQTT_RECONNECT_BACKOFF_MIN_MS, doubling up to MQTT_RECONNECT_BACKOFF_MAX_MS,
// plus up to MQTT_RECONNECT_JITTER_PERCENT % random jitter; a successful
// connect + subscribe resets it.
#define MQTT_RECONNECT_BACKOFF_MIN_MS 2000UL
#define MQTT_RECONNECT_BACKOFF_MAX_MS 60000UL
#define MQTT_RECONNECT_JITTER_PERCENT 25
// PINGREQ interval; a connection silent for 2 x keepalive is closed.
#define MQTT_KEEPALIVE_SECONDS 30
// Bounds on the blocking steps of a connect, so the network task stays well
// inside TASK_WATCHDOG_TIMEOUT_MS: TCP connect and every TLS read / write
// (MQTT_SOCKET_TIMEOUT_SECONDS, also the CONNACK wait), TLS handshake
// (MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS). The broker host is resolved by the
// asynchronous DNS probe first, so the connect itself finds it in the cache.
// Worst case of one attempt: 3 + 10 + 3 = 16 s.
#define MQTT_SOCKET_TIMEOUT_SECONDS 3
#define MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS 10

// HTTP / LAN.
#define WIFI_HTTP_PORT 80
#define HTTP_STATUS_OK 200
#define LAN_CONTROL_PATH "/lan"
#define LAN_REQUEST_MAX_LENGTH (MQTT_PACKET_SIZE + 64)
#define LAN_REPLY_MAX_LENGTH 3072
// Request gate of the web server (HttpServer.cpp): a request reaches the core
// parser only once its header (at most HTTP_HEADER_MAX_LENGTH bytes) and,
// up to HTTP_PREBUFFER_MAX_LENGTH bytes in total, its whole body have arrived,
// so the parser never waits on the socket. A client that does not get there
// within HTTP_REQUEST_TIMEOUT_MS is closed; a Content-Length above the route
// limit is answered with 413 before any of the body is read. lwIP accepts
// 5760 bytes (CONFIG_LWIP_TCP_WND_DEFAULT) before the first read.
#define HTTP_HEADER_MAX_LENGTH 1024
#define HTTP_PREBUFFER_MAX_LENGTH 5120
#define HTTP_REQUEST_TIMEOUT_MS 3000UL

// Wi-Fi, portal and provisioning.
#define DEVICE_HOSTNAME_PREFIX "deviceiot-"
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
#define WIFI_WEB_RESPONSE_DELAY_MS 2000
#define WIFI_PROV_POP "abcd1234"
#define WIFI_PROV_SERVICE_NAME "PROV_123"
#define WIFI_PROVISIONING_TIMEOUT_MS 300000UL
// WifiMode::Ota downloads {"version":"x.y.z","bin":"http://..."} from this
// URL and flashes "bin" when version is newer. Empty = OTA disabled.
#define OTA_VERSION_URL ""
#define WIFI_OTA_RESTART_DELAY_MS 1000
// OTA HTTP: connect and per-read timeouts, and the longest pause in the
// firmware download before it is abandoned.
#define OTA_HTTP_CONNECT_TIMEOUT_MS 5000
#define OTA_HTTP_TIMEOUT_MS 2000
#define OTA_STALL_TIMEOUT_MS 10000UL

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

// Network task period: 1 ms during a high-speed capture keeps the UDP queue
// drained, NETWORK_TASK_IDLE_PERIOD_MS otherwise.
#define NETWORK_TASK_PERIOD_MS 1
#define NETWORK_TASK_IDLE_PERIOD_MS 10
// LoRa: longest wait for the end of a transmission (255 bytes at SF7 /
// 125 kHz take about 0.4 s).
#define LORA_TX_TIMEOUT_MS 2000UL
// Long press of NETWORK_CONFIG_BUTTON_PIN: held this long selects WifiMode 2..5.
#define NETWORK_BUTTON_HOLD_BLE_MS 3000
#define NETWORK_BUTTON_HOLD_SMART_CONFIG_MS 6000
#define NETWORK_BUTTON_HOLD_AP_PORTAL_MS 10000
#define NETWORK_BUTTON_HOLD_OTA_MS 20000

// High-speed capture sampling rates in samples per second (Hz).
#define HS_AUDIO_ADC_SAMPLE_RATE_HZ 10000UL
#define HS_ICM42688_SAMPLE_RATE_HZ 32000UL
// Polled sampling needs ~12 us per ADS8866 sample (conversion + SPI), so
// 100 kHz is not reachable; 50 kHz leaves margin for the other streams.
#define HS_ADS8866_SAMPLE_RATE_HZ 50000UL
#define HS_CAPTURE_MAX_DURATION_MS 60000
#define HS_NETWORK_DRAIN_BATCH 8
