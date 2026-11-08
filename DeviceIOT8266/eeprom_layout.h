#pragma once

// EEPROM layout, identical on both firmwares so a configuration moves between
// them unchanged. Strings are null-terminated and *_MAX_LENGTH excludes the
// '\0'. EEPROM.begin() keeps a RAM copy of EEPROM_SIZE bytes; growing it keeps
// the stored bytes, and new regions are formatted on first boot.
//
//   name                                  start  size   end
//   (unused)                                  0     1     1
//   EEPROM_ADDR_WIFI_MODE (WifiMode)          1     1     2
//   EEPROM_ADDR_WIFI_SSID                     2    33    35
//   EEPROM_ADDR_WIFI_PASS                    35    64    99
//   EEPROM_ADDR_FW_VERSION                   99    16   115
//   EEPROM_RESERVED_LEGACY_SCHEDULE         115   112   227   old pump rules, never read
//   EEPROM_ADDR_MQTT_SETTINGS (JSON)        227   448   675
//   MTLS_CA_CERT_ADDRESS                    675   704  1379
//   MTLS_CLIENT_CERT_ADDRESS               1379   768  2147
//   MTLS_PRIVATE_KEY_ADDRESS               2147   256  2403
//   MESSAGE_AUTH_KEY_ID_ADDRESS            2403    33  2436
//   MESSAGE_AUTH_SECRET_ADDRESS            2436    65  2501
//   ASCON_PUBLIC_KEYS_ADDRESS              2501   330  2831
//   SCHEDULE_EEPROM_ADDRESS                2831   224  3055
//   ON_TIMER_EEPROM_ADDRESS                3055     4  3059
//   COUNTDOWN_EEPROM_ADDRESS               3059     4  3063
//   THRESHOLD_EEPROM_ADDRESS               3063     8  3071 = EEPROM_SIZE
//
// Multi-byte numbers are little-endian (low byte first).
//
#include <stdint.h>

// Value stored at EEPROM_ADDR_WIFI_MODE: what the network task starts in.
enum class WifiMode : uint8_t {
    Station = 1,       // Join the stored Wi-Fi, run MQTT / LAN.
    BleProvision = 2,  // Reserved legacy value, unsupported on ESP8266.
    SmartConfig = 3,   // Reserved legacy value, unsupported on ESP8266.
    ApPortal = 4,      // Access point with the /setup and /wifi pages.
    Ota = 5,           // Reserved legacy value, unsupported on ESP8266.
};

#define EEPROM_ADDR_WIFI_MODE 1
#define EEPROM_ADDR_WIFI_SSID 2
#define WIFI_SSID_MAX_LENGTH 32
#define EEPROM_ADDR_WIFI_PASS (EEPROM_ADDR_WIFI_SSID + WIFI_SSID_MAX_LENGTH + 1)
#define WIFI_PASS_MAX_LENGTH 63
#define EEPROM_ADDR_FW_VERSION (EEPROM_ADDR_WIFI_PASS + WIFI_PASS_MAX_LENGTH + 1)
#define FW_VERSION_MAX_LENGTH 15
#define EEPROM_RESERVED_LEGACY_SCHEDULE_ADDRESS (EEPROM_ADDR_FW_VERSION + FW_VERSION_MAX_LENGTH + 1)
#define EEPROM_RESERVED_LEGACY_SCHEDULE_SIZE 112

// Compact MQTT settings JSON (only the fields NetworkMqtt reads).
#define EEPROM_ADDR_MQTT_SETTINGS (EEPROM_RESERVED_LEGACY_SCHEDULE_ADDRESS + EEPROM_RESERVED_LEGACY_SCHEDULE_SIZE)
#define MQTT_SETTINGS_MAX_LENGTH 447

// ECDSA P-256 credentials (mqttBroker/certs/generate_ecdsa_certs.ps1).
// Measured: ca.crt 622 B, deviceX.crt 642 B, SEC1 key without public key
// 134 B (PKCS#8 246 B); about 11 B more with CRLF line endings. RSA
// certificates do not fit. One-way TLS uses only the CA.
#define MTLS_CA_CERT_ADDRESS (EEPROM_ADDR_MQTT_SETTINGS + MQTT_SETTINGS_MAX_LENGTH + 1)
#define MTLS_CA_CERT_MAX_LENGTH 703
#define MTLS_CLIENT_CERT_ADDRESS (MTLS_CA_CERT_ADDRESS + MTLS_CA_CERT_MAX_LENGTH + 1)
#define MTLS_CLIENT_CERT_MAX_LENGTH 767
#define MTLS_PRIVATE_KEY_ADDRESS (MTLS_CLIENT_CERT_ADDRESS + MTLS_CLIENT_CERT_MAX_LENGTH + 1)
#define MTLS_PRIVATE_KEY_MAX_LENGTH 255

// keyId is the key name in mqtt_message_auth.json (usually the clientId); the
// secret is at most 64 characters (e.g. 32 bytes as hex).
#define MESSAGE_AUTH_KEY_ID_ADDRESS (MTLS_PRIVATE_KEY_ADDRESS + MTLS_PRIVATE_KEY_MAX_LENGTH + 1)
#define MESSAGE_AUTH_KEY_ID_MAX_LENGTH 32
#define MESSAGE_AUTH_SECRET_ADDRESS (MESSAGE_AUTH_KEY_ID_ADDRESS + MESSAGE_AUTH_KEY_ID_MAX_LENGTH + 1)
#define MESSAGE_AUTH_SECRET_MAX_LENGTH 64

// Ascon key table: ASCON_PUBLIC_KEY_COUNT null-terminated 32-char hex keys.
#define ASCON_PUBLIC_KEY_COUNT 10
#define ASCON_PUBLIC_KEY_HEX_LENGTH 32
#define ASCON_PUBLIC_KEY_ENTRY_LENGTH (ASCON_PUBLIC_KEY_HEX_LENGTH + 1)
#define ASCON_PUBLIC_KEYS_ADDRESS (MESSAGE_AUTH_SECRET_ADDRESS + MESSAGE_AUTH_SECRET_MAX_LENGTH + 1)
#define ASCON_PUBLIC_KEYS_END (ASCON_PUBLIC_KEYS_ADDRESS + ASCON_PUBLIC_KEY_COUNT * ASCON_PUBLIC_KEY_ENTRY_LENGTH)

// Local schedules (ScheduleEngine), ids 1..SCHEDULE_MAX_COUNT:
//   header   4 B: 'S' 'C' version SCHEDULE_MAX_COUNT
//   records 20 x 6 B: hour minute weekday port_state auto_off_lo auto_off_hi
//   meta    20 x 5 B: flags port_mask day_lo day_hi crc8
#define SCHEDULE_MAX_COUNT 20
#define SCHEDULE_EEPROM_ADDRESS ASCON_PUBLIC_KEYS_END
#define SCHEDULE_EEPROM_HEADER_SIZE 4
#define SCHEDULE_EEPROM_VERSION 1
#define SCHEDULE_RECORD_SIZE 6
#define SCHEDULE_META_SIZE 5
#define SCHEDULE_RECORDS_ADDRESS (SCHEDULE_EEPROM_ADDRESS + SCHEDULE_EEPROM_HEADER_SIZE)
#define SCHEDULE_META_ADDRESS (SCHEDULE_RECORDS_ADDRESS + SCHEDULE_MAX_COUNT * SCHEDULE_RECORD_SIZE)
#define SCHEDULE_EEPROM_END (SCHEDULE_META_ADDRESS + SCHEDULE_MAX_COUNT * SCHEDULE_META_SIZE)

// Auto OFF on-timer (OnTimer): uint32 seconds 1..86400; 0 = off.
#define ON_TIMER_EEPROM_ADDRESS SCHEDULE_EEPROM_END
#define ON_TIMER_EEPROM_SIZE 4
#define ON_TIMER_EEPROM_END (ON_TIMER_EEPROM_ADDRESS + ON_TIMER_EEPROM_SIZE)

// Countdown auto ON (Countdown): uint32 seconds of the last countdown. The
// running countdown lives in RAM only and is lost on power loss.
#define COUNTDOWN_EEPROM_ADDRESS ON_TIMER_EEPROM_END
#define COUNTDOWN_EEPROM_SIZE 4
#define COUNTDOWN_EEPROM_END (COUNTDOWN_EEPROM_ADDRESS + COUNTDOWN_EEPROM_SIZE)

// Sensor threshold rules: 2 x uint32 (ThresholdControl.h).
#define THRESHOLD_EEPROM_ADDRESS COUNTDOWN_EEPROM_END
#define THRESHOLD_EEPROM_SIZE 8
#define THRESHOLD_EEPROM_END (THRESHOLD_EEPROM_ADDRESS + THRESHOLD_EEPROM_SIZE)

#define EEPROM_SIZE THRESHOLD_EEPROM_END

// Pin the addresses that are already stored on devices in the field: if one of
// these fails, an edit above moved a region and old configurations break.
static_assert(EEPROM_ADDR_WIFI_PASS == 35, "EEPROM layout moved: Wi-Fi password");
static_assert(EEPROM_ADDR_FW_VERSION == 99, "EEPROM layout moved: firmware version");
static_assert(EEPROM_ADDR_MQTT_SETTINGS == 227, "EEPROM layout moved: MQTT settings");
static_assert(MTLS_CA_CERT_ADDRESS == 675, "EEPROM layout moved: CA certificate");
static_assert(ASCON_PUBLIC_KEYS_ADDRESS == 2501, "EEPROM layout moved: Ascon keys");
static_assert(SCHEDULE_EEPROM_ADDRESS == 2831, "EEPROM layout moved: schedules");
static_assert(THRESHOLD_EEPROM_ADDRESS == 3063, "EEPROM layout moved: threshold rules");
static_assert(EEPROM_SIZE <= 3072, "EEPROM layout exceeds the 3 KB budget");
