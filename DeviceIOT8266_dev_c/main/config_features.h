#pragma once

// DeviceIOT8266_V1 feature switches. Every flag is 0 or 1.
//
// Runtime: Espressif ESP8266_RTOS_SDK (FreeRTOS, esp_wifi, lwIP, mbedTLS,
// NVS, cJSON). TaskDevice, TaskSensor, TaskNetwork and SystemTask are real
// FreeRTOS tasks (preemptive), exactly like the SUPPORT_RTOS 1 branch of
// DeviceIOT8266. No Arduino library is used.
#define SUPPORT_RTOS 1

// LoRa stays enabled; it is owned exclusively by TaskNetwork.
#define SUPPORT_LORA 1

// ---------------------------------------------------------------------------
// MQTT security. Each switch mirrors a flag in mqttBroker/MqttBroker1885.js;
// keep both sides equal. There is no plaintext MQTT mode: the broker
// requires TLS.
// ---------------------------------------------------------------------------

// enable_TLS_SSL: verify the broker certificate with the CA stored in EEPROM.
#define ENABLE_TLS_SSL 1
// enableTLSCertificate: the broker identifies the device by clientId and
// client-certificate fingerprint (mqtt_device_certs.json).
#define ENABLE_MTLS 1
// Send mqtt_user/mqtt_pwd on CONNECT. Required when mTLS is off; with mTLS
// only needed when the broker enables enableClientID and matches the username
// in mqtt_client_ids.json.
#define ENABLE_MQTT_USER_AUTH 0
// enableAttack: add "timestamp" (ms) and "nonce" to every publish
// (mqtt_replay.json, maxSkewSeconds 300 s by default -> NTP required).
#define ENABLE_REPLAY_PROTECTION 1
// enableMessageAuthentication: sign every publish and verify every command
// with HMAC-SHA256 over the broker's canonical form (sorted keys, without
// keyId/signature).
#define ENABLE_MESSAGE_AUTHENTICATION 0
#define MESSAGE_AUTH_MAX_FIELDS 24
// enableBruteForce: the broker blocks a client after maxFailedAttempts failed
// CONNECTs within windowSeconds (mqtt_bruteforce.json); stay below that.
#define ENABLE_MQTT_CONNECT_RATE_LIMIT 0
#define MQTT_CONNECT_MAX_FAILURES 4              // = maxFailedAttempts - 1
#define MQTT_CONNECT_FAILURE_WINDOW_MS 300000UL  // = windowSeconds * 1000
// End-to-end Ascon-AEAD128 with the server; the broker only relays it.
#define ENABLE_ASCON_AEAD128 0
#define ASCON_RANDOM_DIGITS 5
#define ASCON_KEY_ROTATION_MS 86400000UL

// LAN control: POST http://<ip>/lan {"data":<MQTT command>} runs the command
// exactly like an MQTT message and answers {"ip":"...","data":[replies]}.
#define ENABLE_LAN_CONTROL 1
// Command password: every command (MQTT, LAN, /control) must carry "pa" equal
// to the device password ("mqtt_pwd" stored at setup). Wrong -> {"rc":<com>,"rs":6}.
#define ENABLE_COMMAND_PASSWORD 1

// Identifier of the service type supported by this firmware/application.
#define DEVICE_SERVICE_ID 2
