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

// Transport security remains fail-closed: no insecure TLS fallback is enabled.
#define ENABLE_TLS_SSL 1
#define ENABLE_mTLS 1
#define ENABLE_MESSAGE_AUTHENTICATION 0
#define ENABLE_ASCON_AEAD128 0
#define MQTT_NO_TLS 0

// The former authentication/Ascon implementation was tied to removed sensor
// paths and is deliberately not silently enabled in this reduced firmware.
#if ENABLE_MESSAGE_AUTHENTICATION || ENABLE_ASCON_AEAD128
  #error "Message authentication/Ascon must be reimplemented and reviewed before enabling it."
#endif

#define MODE_WIFI_ADRESS 1
#define SERIAL_BAUD_RATE 115200

#define COMMAND_TYPE_CONTROL 0x01
#define COMMAND_TYPE_OTHER 0x02
#define COMMAND_RESERVED_NONE 0x00
#define COMMAND_RESERVED_CONTROL 0x01
#define DEVICE_OUTPUT_MASK 0x01

// FreeRTOS stack-depth values are intentionally conservative for ESP8266 RAM.
#define TASK_STACK_SIZE 2048
#define TASK_NETWORK_STACK_SIZE 4096
#define TASK_SYSTEM_STACK_SIZE 1536
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

#define EEPROM_SIZE (20 * 1024)
#define TLS_SSL_DATA_ADDRESS 1300
#define MTLS_CA_CERT_ADDRESS 1300
#define MTLS_CA_CERT_MAX_LENGTH 4095
#define MTLS_CLIENT_CERT_ADDRESS 5500
#define MTLS_CLIENT_CERT_MAX_LENGTH 4095
#define MTLS_PRIVATE_KEY_ADDRESS 9700
#define MTLS_PRIVATE_KEY_MAX_LENGTH (EEPROM_SIZE - MTLS_PRIVATE_KEY_ADDRESS - 1)
#define TLS_SSL_DATA_MAX_LENGTH (EEPROM_SIZE - TLS_SSL_DATA_ADDRESS - 1)

#define MESSAGE_AUTH_KEY_ID_ADDRESS 20000
#define MESSAGE_AUTH_KEY_ID_MAX_LENGTH 127
#define MESSAGE_AUTH_SECRET_ADDRESS 20200
#define MESSAGE_AUTH_SECRET_MAX_LENGTH 255

#define ASCON_RANDOM_DIGITS 5
#define ASCON_KEY_ROTATION_MS 86400000UL
#define ASCON_PUBLIC_KEY_COUNT 10
#define ASCON_PUBLIC_KEY_HEX_LENGTH 32
#define ASCON_PUBLIC_KEY_ENTRY_LENGTH 33
#define ASCON_PUBLIC_KEYS_ADDRESS 18000
#define ASCON_HANDSHAKE_DIGITS_ADDRESS 18330
#define ASCON_HANDSHAKE_DIGITS_MAX_LENGTH 8
#define ASCON_KEY_ROTATION_TIME_ADDRESS 18350

#define JSON_BUFFER_SIZE 512
#define JSON_SMALL_BUFFER_SIZE 128
#define MQTT_JSON_DOC_SIZE 512
#define MQTT_COMMAND_DOC_SIZE 128
#define MQTT_PAYLOAD_SIZE 1024
#define SENSOR_PAYLOAD_SIZE 256
#define DEVICE_PAYLOAD_SIZE 256
#define DEVICE_INFO_DEFAULT_VALUE 2
#define DEVICE_SERVICE_ID 2
#define MQTT_RECONNECT_DELAY_MS 5000UL

#define WIFI_HTTP_PORT 80
#define HTTP_STATUS_OK 200
#define WIFI_RECONNECT_DELAY_MS 10000UL
#define WIFI_CONFIG_PORTAL_AFTER_MS 120000UL
#define WIFI_AP_SSID "ESP_Config"
#define WIFI_AP_PASSWORD "12345678"
#define WIFI_PROV_POP "abcd1234"
#define WIFI_PROV_SERVICE_NAME "PROV_123"
#define NTP_LOCALTIME_TIMEOUT_MS 5000UL
