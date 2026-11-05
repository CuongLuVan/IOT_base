#pragma once

// Select the runtime before compiling the sketch.
// 0 = official ESP8266 Arduino core (cooperative/NON-OS scheduler)
// 1 = alexCajas/esp8266RTOSArduCore (FreeRTOS scheduler)
#define SUPPORT_RTOS 0

#if defined(ESP8266)
  #define PLATFORM_ESP8266 1
  #define PLATFORM_ESP32 0
#elif defined(ESP32)
  #define PLATFORM_ESP8266 0
  #define PLATFORM_ESP32 1
#else
  #error "DeviceIOT8266 requires an ESP8266 target."
#endif

#if !PLATFORM_ESP8266
  #error "Select an ESP8266 board for DeviceIOT8266."
#endif

// Feature switches.  LoRa stays enabled; it is owned exclusively by TaskNetWork.
#define SUPPORT_LORA 1
#define SUPPORT_MQTT 1

// MQTT security. Each switch mirrors a flag in mqttBroker/MqttBroker1885.js;
// keep both sides equal. Features the broker does not use stay 0 so they cost
// no flash, RAM or EEPROM. There is no plaintext MQTT mode: the broker
// requires TLS.

// enable_TLS_SSL: verify the broker certificate with the CA stored in EEPROM.
#define ENABLE_TLS_SSL 1
// enableTLSCertificate: the broker identifies the device by clientId and
// client-certificate fingerprint (mqtt_device_certs.json).
#define ENABLE_mTLS 1
// Send mqtt_user/mqtt_pwd on CONNECT. The broker checks passwords
// (mqtt_users.json) only when mTLS is off, so this is redundant with mTLS.
#define ENABLE_MQTT_USER_AUTH 0
// enableAttack: add "timestamp" (ms) and "nonce" to every publish
// (mqtt_replay.json, maxSkewSeconds 300 s by default -> NTP required).
#define ENABLE_REPLAY_PROTECTION 1
// enableMessageAuthentication: sign every publish and verify every command
// with HMAC-SHA256 over the broker's canonical form (sorted keys, without
// keyId/signature).
#define ENABLE_MESSAGE_AUTHENTICATION 0
// enableBruteForce: the broker blocks a client after maxFailedAttempts failed
// CONNECTs within windowSeconds (mqtt_bruteforce.json); stay below that.
#define ENABLE_MQTT_CONNECT_RATE_LIMIT 0
#define MQTT_CONNECT_MAX_FAILURES 4                // = maxFailedAttempts - 1
#define MQTT_CONNECT_FAILURE_WINDOW_MS 300000UL    // = windowSeconds * 1000
// End-to-end Ascon-AEAD128 with the server; the broker only relays it.
// Encrypts every publish except the key handshake and rejects plaintext
// commands other than the handshake request.
#define ENABLE_ASCON_AEAD128 0

#if !ENABLE_TLS_SSL && !ENABLE_mTLS
  #error "MqttBroker1885.js only accepts MQTT over TLS."
#endif
#if !ENABLE_mTLS && !ENABLE_MQTT_USER_AUTH
  #error "Without mTLS the broker authenticates with username/password: enable ENABLE_MQTT_USER_AUTH."
#endif

#define SERIAL_BAUD_RATE 115200

#define COMMAND_TYPE_CONTROL 0x01
#define COMMAND_TYPE_OTHER 0x02
#define COMMAND_TYPE_SCHEDULE_CONTROL 0x03
// {"com":4,"value":N}: count down N seconds (1..86400), then switch on; 0 = cancel.
#define COMMAND_TYPE_COUNTDOWN 0x04
// Numeric commands (MQTT / LAN), answered with the compact status report
// plus "rc"/"rs": {"com":5,"value":N} auto OFF on-timer N seconds (0 = off);
// schedules: 8 add, 9 update, 10 delete, 11 enable/disable (value 1/0),
// 12 clear, 13 list. 6 and 7 belong to Ascon ({"co":6} / {"com":7}).
#define COMMAND_TYPE_ON_TIMER 5
#define COMMAND_TYPE_SCHEDULE_ADD 8
#define COMMAND_TYPE_SCHEDULE_UPDATE 9
#define COMMAND_TYPE_SCHEDULE_DELETE 10
#define COMMAND_TYPE_SCHEDULE_ENABLE 11
#define COMMAND_TYPE_SCHEDULE_CLEAR 12
#define COMMAND_TYPE_SCHEDULE_LIST 13
#define COMMAND_TYPE_ASCON_HANDSHAKE 0x07
#define COMMAND_RESERVED_NONE 0x00
#define COMMAND_RESERVED_CONTROL 0x01
#define DEVICE_OUTPUT_MASK 0x01

// Output bit toggled by the device button (the pump).
#define SYSTEM_TASK_SCHEDULE_PORT_MASK 0x01
// Schedules (SCHEDULE_*, DeviceIOT/spec_v1.txt) compare local time/date in
// this timezone. Vietnam: 7 * 3600.
#define SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS 0
#if SYSTEM_TASK_SCHEDULE_PORT_MASK != 0x01
  #error "The device button is wired to the fixed pump output bit (0x01)."
#endif

// Local schedules (ScheduleEngine): up to 20, ids 1..SCHEDULE_MAX_COUNT.
#define SCHEDULE_MAX_COUNT 20
// Ports a schedule may drive. Only the pump output exists on this board
// (OUTPUT_DEVICE_1 is disabled), so a port_mask outside it is rejected.
#define SCHEDULE_ALLOWED_PORT_MASK DEVICE_OUTPUT_MASK
// After a delayed scheduler cycle, catch up at most this many minutes.
#define SCHEDULE_CATCHUP_MINUTES 5

// FreeRTOS stack-depth values are intentionally conservative for ESP8266 RAM.
#define TASK_STACK_SIZE 2048
#define TASK_NETWORK_STACK_SIZE 4096
#define TASK_SYSTEM_STACK_SIZE 2048  // Schedule evaluation needs ~1 KB of locals.
#define TASK_CREATE_DELAY_MS 25
#define TASK_SENSOR_PRIORITY 2
#define TASK_NETWORK_PRIORITY 2
#define TASK_DEVICE_PRIORITY 1
#define TASK_SYSTEM_PRIORITY 1
#define COOP_LOOP_DELAY_MS 2
#define RTOS_IDLE_LOOP_DELAY_MS 50

#define SYSTEM_TASK_CHECK_INTERVAL_MS 5000UL
#define SYSTEM_TASK_NTP_RETRY_INTERVAL_MS 60000UL
#define SYSTEM_TASK_TELEMETRY_INTERVAL_MS 30000UL
#define SYSTEM_TASK_DEBUG_LOG 0
#define SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS 60000UL

// Sensor schedule: DHT11 must not be queried more often than once every 2 s.
#define DHT_PIN 2                 // GPIO2 / D4
#define DHT_TYPE DHT11
#define DHT_READ_INTERVAL_MS 2500UL
#define ADC_READ_INTERVAL_MS 1000UL
#define ADC_SAMPLE_COUNT 4
#define SENSOR_TASK_POLL_MS 25UL

// GPIO0 is the flash button; DHT11 needs the GPIO2 boot pull-up.
#define DEVICE_BUTTON_PIN 0       // GPIO0 / D3
#define INPUT_PULLUP_PIN 5        // GPIO5 / D1
#define OUTPUT_PUMP_PIN 4         // GPIO4 / D2
// GPIO14 is SPI SCK for LoRa, so the second legacy output is disabled.
#define OUTPUT_DEVICE_1_PIN (-1)
#define SUPPORT_DEVICE_OUTPUT_1 0
#define BUTTON_DEBOUNCE_MS 50UL
#define BUTTON_LONG_PRESS_MS 3000UL
#define DEVICE_TASK_PERIOD_MS 25UL
#define DEVICE_QUEUE_SEND_DELAY_MS 20UL

// SX127x on the ESP8266 hardware SPI bus: SCK=14, MISO=12, MOSI=13.
// Polling receive avoids another GPIO conflict; do not wire DIO0/IRQ for this setup.
#define LORA_FREQUENCY_HZ 915E6L
#define LORA_CS_PIN 15            // GPIO15 / D8
#define LORA_RESET_PIN 16         // GPIO16 / D0
#define LORA_IRQ_PIN (-1)
#define LORA_BUFFER_SIZE 255
#define LORA_MAX_PAYLOAD_SIZE 255

// EEPROM layout (identical to DeviceIOT). Strings are null-terminated and
// *_MAX_LENGTH excludes the '\0'. EEPROM keeps a RAM copy of the whole area,
// so EEPROM_SIZE ends at the last enabled region. Every configuration stays
// below 3 KB (3063 B including the schedule, on-timer and countdown regions), inside the 4 KB sector of the
// NON-OS core.
#define MODE_WIFI_ADRESS 1
#define WIFI_SSSID 2
#define WIFI_SSID_MAX_LENGTH 32
#define WIFI_PASS (WIFI_SSSID + WIFI_SSID_MAX_LENGTH + 1)
#define WIFI_PASS_MAX_LENGTH 63
#define VERSJON_SETUP_JSON (WIFI_PASS + WIFI_PASS_MAX_LENGTH + 1)
#define VERSJON_MAX_LENGTH 15
// Reserved: former StoredSchedules pump rules, no longer read. Kept so that
// no later address moves; schedules now live at SCHEDULE_EEPROM_ADDRESS.
#define SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS (VERSJON_SETUP_JSON + VERSJON_MAX_LENGTH + 1)
#define SYSTEM_TASK_SCHEDULE_STORAGE_SIZE 112
// Compact MQTT settings JSON (only the fields NetWork_Mqtt reads).
#define WIFI_SETUP_JSON (SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS + SYSTEM_TASK_SCHEDULE_STORAGE_SIZE)
#define WIFI_SETUP_JSON_MAX_LENGTH 447

// ECDSA P-256 credentials (mqttBroker/certs/generate_ecdsa_certs.ps1).
// Measured: ca.crt 622 B, deviceX.crt 642 B, SEC1 key without public key
// 134 B (PKCS#8 246 B); about 11 B more with CRLF line endings.
// RSA certificates no longer fit these regions.
#define SECURITY_DATA_ADDRESS (WIFI_SETUP_JSON + WIFI_SETUP_JSON_MAX_LENGTH + 1)
#define MTLS_CA_CERT_ADDRESS SECURITY_DATA_ADDRESS
#define MTLS_CA_CERT_MAX_LENGTH 703
#define MTLS_CLIENT_CERT_ADDRESS (MTLS_CA_CERT_ADDRESS + MTLS_CA_CERT_MAX_LENGTH + 1)
#define MTLS_CLIENT_CERT_MAX_LENGTH 767
#define MTLS_PRIVATE_KEY_ADDRESS (MTLS_CLIENT_CERT_ADDRESS + MTLS_CLIENT_CERT_MAX_LENGTH + 1)
#define MTLS_PRIVATE_KEY_MAX_LENGTH 255
// One-way TLS uses only the CA at the same address.
#define TLS_SSL_DATA_ADDRESS MTLS_CA_CERT_ADDRESS
#define TLS_SSL_DATA_MAX_LENGTH MTLS_CA_CERT_MAX_LENGTH

// keyId is the key name in mqtt_message_auth.json (usually the clientId);
// the secret is at most 64 characters (e.g. 32 bytes as hex).
#define MESSAGE_AUTH_KEY_ID_ADDRESS (MTLS_PRIVATE_KEY_ADDRESS + MTLS_PRIVATE_KEY_MAX_LENGTH + 1)
#define MESSAGE_AUTH_KEY_ID_MAX_LENGTH 32
#define MESSAGE_AUTH_SECRET_ADDRESS (MESSAGE_AUTH_KEY_ID_ADDRESS + MESSAGE_AUTH_KEY_ID_MAX_LENGTH + 1)
#define MESSAGE_AUTH_SECRET_MAX_LENGTH 64
#define MESSAGE_AUTH_MAX_FIELDS 24

// Ascon key table: ASCON_PUBLIC_KEY_COUNT null-terminated 32-char hex keys.
// The session key is the XOR of the keys selected by ASCON_RANDOM_DIGITS
// random digits; the digits are sent to the server in {"co":6,"va":"..."}.
#define ASCON_RANDOM_DIGITS 5
#define ASCON_KEY_ROTATION_MS 86400000UL
#define ASCON_PUBLIC_KEY_COUNT 10
#define ASCON_PUBLIC_KEY_HEX_LENGTH 32
#define ASCON_PUBLIC_KEY_ENTRY_LENGTH 33
#define ASCON_PUBLIC_KEYS_ADDRESS (MESSAGE_AUTH_SECRET_ADDRESS + MESSAGE_AUTH_SECRET_MAX_LENGTH + 1)
#define ASCON_PUBLIC_KEYS_END (ASCON_PUBLIC_KEYS_ADDRESS + ASCON_PUBLIC_KEY_COUNT * ASCON_PUBLIC_KEY_ENTRY_LENGTH)

// Local schedules, after the last region of the full layout so that no older
// address moves whichever security features are enabled (same as DeviceIOT).
//   header   4 B: 'S' 'C' version SCHEDULE_MAX_COUNT
//   records 20 x 6 B: hour minute weekday port_state auto_off_lo auto_off_hi
//   meta    20 x 5 B: flags port_mask day_lo day_hi crc8
#define SCHEDULE_EEPROM_ADDRESS ASCON_PUBLIC_KEYS_END
#define SCHEDULE_EEPROM_HEADER_SIZE 4
#define SCHEDULE_EEPROM_VERSION 1
#define SCHEDULE_RECORD_SIZE 6
#define SCHEDULE_META_SIZE 5
#define SCHEDULE_RECORDS_ADDRESS (SCHEDULE_EEPROM_ADDRESS + SCHEDULE_EEPROM_HEADER_SIZE)
#define SCHEDULE_META_ADDRESS (SCHEDULE_RECORDS_ADDRESS + SCHEDULE_MAX_COUNT * SCHEDULE_RECORD_SIZE)
#define SCHEDULE_EEPROM_END (SCHEDULE_META_ADDRESS + SCHEDULE_MAX_COUNT * SCHEDULE_META_SIZE)

// Auto OFF on-timer (OnTimer, independent of schedules): 4 B uint32
// little-endian, seconds 1..86400 (24 h); 0 = off.
#define ON_TIMER_EEPROM_ADDRESS SCHEDULE_EEPROM_END
#define ON_TIMER_EEPROM_SIZE 4
#define ON_TIMER_EEPROM_END (ON_TIMER_EEPROM_ADDRESS + ON_TIMER_EEPROM_SIZE)

// Countdown auto ON (Countdown, independent of schedules): 4 B uint32
// little-endian, seconds of the last countdown 1..86400. The running
// countdown lives in RAM only and is lost on power loss.
#define COUNTDOWN_EEPROM_ADDRESS ON_TIMER_EEPROM_END
#define COUNTDOWN_EEPROM_SIZE 4
#define COUNTDOWN_EEPROM_END (COUNTDOWN_EEPROM_ADDRESS + COUNTDOWN_EEPROM_SIZE)

// The EEPROM sector keeps its old bytes when EEPROM_SIZE grows, so the stored
// configuration survives; the new regions are formatted on first boot.
#define EEPROM_SIZE COUNTDOWN_EEPROM_END

#if EEPROM_SIZE > 3072
  #error "EEPROM layout exceeds the 3 KB budget."
#endif

#define JSON_BUFFER_SIZE 512
#define JSON_SMALL_BUFFER_SIZE 128
#define MQTT_JSON_DOC_SIZE 512
#define MQTT_COMMAND_DOC_SIZE 256
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
#define SENSOR_PAYLOAD_SIZE 256
#define DEVICE_PAYLOAD_SIZE 256
#define DEVICE_INFO_DEFAULT_VALUE 2
#define DEVICE_SERVICE_ID 2
#define MQTT_RECONNECT_DELAY_MS 5000UL

#define WIFI_HTTP_PORT 80
// LAN control: POST http://<ip>/lan {"data":<MQTT command>} runs the command
// exactly like an MQTT message (same signature / Ascon checks) and answers
// {"ip":"...","data":[the replies the device would publish]}. For when the
// broker or the Internet is down. No separate authentication: enable
// ENABLE_MESSAGE_AUTHENTICATION on an untrusted LAN.
#define ENABLE_LAN_CONTROL 1
#define LAN_CONTROL_PATH "/lan"
#define LAN_REQUEST_MAX_LENGTH (MQTT_PACKET_SIZE + 64)
#define LAN_REPLY_MAX_LENGTH 2048
#define HTTP_STATUS_OK 200
#define WIFI_RECONNECT_DELAY_MS 10000UL
#define WIFI_CONFIG_PORTAL_AFTER_MS 120000UL
#define WIFI_AP_SSID "ESP_Config"
#define WIFI_AP_PASSWORD "12345678"
#define WIFI_PROV_POP "abcd1234"
#define WIFI_PROV_SERVICE_NAME "PROV_123"
#define NTP_LOCALTIME_TIMEOUT_MS 5000UL
