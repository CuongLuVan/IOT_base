# DeviceIOT8266 build modes

`define_All.h` chooses exactly one runtime:

- `#define SUPPORT_RTOS 0` (default): build with the official ESP8266 Arduino core. The sketch uses the cooperative scheduler in `loop()`.
- `#define SUPPORT_RTOS 1`: build with `alexCajas/esp8266RTOSArduCore`. The sketch creates four FreeRTOS tasks: device I/O, sensors, network/LoRa, and system telemetry.

Do not enable RTOS with the official ESP8266 Arduino core; it does not supply the FreeRTOS task API used by this sketch. Install the RTOS board package and run its documented Windows `setup_env.bat` before building.

## Required Arduino libraries

- DHT sensor library (DHT11)
- LoRa (SX127x)
- ArduinoJson 6
- PubSubClient

## Retained hardware

Only DHT11, the on-chip ADC (`A0`), and LoRa remain enabled. PMS, IMU, ADS, and high-speed UDP capture are removed; the old high-speed class is a disabled compatibility stub.

| Function | ESP8266 GPIO |
| --- | --- |
| DHT11 data | GPIO2 / D4 |
| ADC | A0 / TOUT |
| LoRa SCK / MISO / MOSI | GPIO14 / GPIO12 / GPIO13 |
| LoRa NSS / reset | GPIO15 / GPIO16 |
| LoRa IRQ | not connected; receive uses polling |
| Pump output | GPIO4 / D2 |
| Device button | GPIO0 / D3 |

GPIO14 is required for LoRa SPI, so the former second device output is deliberately disabled. Ensure DHT11 has an appropriate pull-up to 3.3 V and that the external signal presented to the ESP8266 TOUT pin is within the board/chip ADC limits.

## MQTT security

Each switch in `define_All.h` mirrors one flag in `mqttBroker/MqttBroker1885.js`; keep both sides equal. Every layer fails closed: missing credentials block MQTT traffic instead of falling back to plaintext. There is no plaintext MQTT mode because the broker only accepts TLS.

| Device switch | Broker flag | Default | Effect |
| --- | --- | --- | --- |
| `ENABLE_TLS_SSL` | `enable_TLS_SSL` | on | Verifies the broker certificate with the stored CA. |
| `ENABLE_mTLS` | `enableTLSCertificate` | on | The broker matches `clientId` and certificate fingerprint in `mqtt_device_certs.json`. |
| `ENABLE_MQTT_USER_AUTH` | (mTLS off) `mqtt_users.json` | off | Sends `mqtt_user`/`mqtt_pwd`. Required when mTLS is off. |
| `ENABLE_REPLAY_PROTECTION` | `enableAttack` | on | Adds `timestamp` (ms) and `nonce`; the clock must be within `maxSkewSeconds` (300 s). |
| `ENABLE_MESSAGE_AUTHENTICATION` | `enableMessageAuthentication` | off | HMAC-SHA256 over the sorted JSON without `signature`/`keyId`, as in `canonicalizePayloadValue()`. Verifies incoming commands too. |
| `ENABLE_MQTT_CONNECT_RATE_LIMIT` | `enableBruteForce` | off | At most `MQTT_CONNECT_MAX_FAILURES` failed CONNECTs per `MQTT_CONNECT_FAILURE_WINDOW_MS`, so the broker does not block the device. |
| `ENABLE_ASCON_AEAD128` | (none) | off | End-to-end encryption with the server/mobile app; the broker only relays it. |

Topic access (`mqtt_acl.json`) is configured only on the broker: `public_topic`/`subcribe_topic` must be allowed for the device's `clientId`, for example `devices/device1/data` and `devices/device1/commands/#`.

Outgoing messages are processed in the order encrypt, add `timestamp`/`nonce`, sign, so the broker can verify replay data and signatures without the Ascon key. Incoming commands are verified, then decrypted. Messages are never retained.

Ascon protocol:

- The session key is the XOR of the table keys chosen by 5 random digits. The device announces the digits with `{"rc":7,"rs":0,"ky":"<digits>"}` (formerly `{"co":6,"va":...}`) after each MQTT connect, after each key rotation (`ASCON_KEY_ROTATION_MS`, default 24 h), and when it receives `{"com":7}`.
- Encrypted messages in both directions use `{"com":1,"value":"<hex nonce(16) | ciphertext | tag(16)>"}` with no associated data. The decrypted value must be a JSON object.
- The HTTP info endpoints return the same envelope, or `{"error":"ascon_key_not_ready"}` before the first key exists.

### Certificates

Use ECDSA P-256 only (`enableECDSA` in `MqttBroker1885.js`; generate with `mqttBroker/certs/generate_ecdsa_certs.ps1`). Provision `ca.crt`, `<clientId>.crt` and `<clientId>.esp.key` (SEC1 without the public key, 130 B). RSA certificates no longer fit the EEPROM, and the broker rejects them.

On the NON-OS core the PEM text is parsed into BearSSL objects (`X509List`, `PrivateKey`, `setClientECCert`) and then freed, so it does not stay in RAM. The BearSSL receive buffer is `TLS_RX_BUFFER_SIZE` (2048 B, or 4096 B with Ascon): the Node.js broker does not negotiate max_fragment_length, so one whole TLS record (the ECDSA handshake flight is about 1 KB) must fit.

### EEPROM layout

Identical to DeviceIOT. Strings are null-terminated; "max" excludes the `'\0'`. `EEPROM_SIZE` ends at the last enabled region.

| Address | Max | Content | Needed for |
| --- | --- | --- | --- |
| 1 | 1 B | Wi-Fi mode (`WIFI_MODE`) | always |
| 2 | 32 | SSID | always |
| 35 | 63 | Wi-Fi password | always |
| 99 | 15 | Firmware version (OTA) | always |
| 115 | 112 B | Reserved (former pump schedules, no longer read) | always |
| 227 | 447 | Compact MQTT settings JSON | always |
| 675 | 703 | CA PEM (`ca.crt`, 611 B) | TLS/mTLS |
| 1379 | 767 | Client certificate PEM (~630 B) | mTLS |
| 2147 | 255 | Client private key PEM (`.esp.key`, 130 B) | mTLS |
| 2403 | 32 | HMAC `keyId` (key in `mqtt_message_auth.json`) | HMAC |
| 2436 | 64 | HMAC secret | HMAC |
| 2501 | 10 × 33 | Ascon key table, 32 hex chars per key | Ascon |
| 2831 | 4 + 20 × 6 + 20 × 5 | Local schedules (`ScheduleEngine`, see `Schedule.md`) | always |

`EEPROM_SIZE` is always **3055 B**: the schedule region sits after the Ascon table so that no address moves, which reserves the HMAC/Ascon regions even when those features are off. The build fails with `#error` above 3072 B. This fits the 4 KB sector of the NON-OS core. Growing `EEPROM_SIZE` keeps the stored configuration; the schedule region is formatted on first boot.

`/setup` stores only `mqtt_host`, `mqtt_port`, `mqtt_client`, `mqtt_user`, `mqtt_pwd`, `public_topic` and `subcribe_topic`, and answers 400 if that JSON exceeds 447 B. All addresses changed from earlier layouts (the schedules used to overlap the settings JSON at 700), so re-provision Wi-Fi, MQTT settings, certificates and keys.
