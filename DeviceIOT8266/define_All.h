
// =====================================================================
// ESP8266 Platform Compatibility Layer
// =====================================================================
// Detect platform: ESP32 vs ESP8266
#if defined(ESP32)
  #define PLATFORM_ESP32 1
  #define PLATFORM_ESP8266 0
#elif defined(ESP8266)
  #define PLATFORM_ESP32 0
  #define PLATFORM_ESP8266 1
#else
  #error "Unsupported platform. Only ESP32 and ESP8266 are supported."
#endif

#define MODE_WIFI_ADRESS          1
#define SUPPORT_RTOS true
#define SUPPORT_LORA 0
#define SUPPORT_MQTT 1

// Broker MqttBroker1885.js yêu cầu TLS; CA certificate được provision vào EEPROM.
#define ENABLE_TLS_SSL true

// Broker yêu cầu mTLS; client certificate/private key phải được provision vào EEPROM.
#define ENABLE_mTLS true

// false = giữ nguyên payload MQTT hiện tại.
// true  = ký và kiểm tra JSON MQTT bằng HMAC-SHA256.
#define ENABLE_MESSAGE_AUTHENTICATION false

// false = giữ nguyên luồng MQTT hiện tại.
// true  = bật mã hóa Ascon-AEAD128 cho các payload MQTT ngoài lệnh handshake.
#define ENABLE_ASCON_AEAD128 false
#define ASCON_RANDOM_DIGITS 5
#define ASCON_KEY_ROTATION_MS 86400000UL
#define ASCON_PUBLIC_KEY_COUNT 10
#define ASCON_PUBLIC_KEY_HEX_LENGTH 32
#define ASCON_PUBLIC_KEY_ENTRY_LENGTH 33
#define ASCON_PUBLIC_KEYS_ADDRESS 18000
#define ASCON_HANDSHAKE_DIGITS_ADDRESS 18330
#define ASCON_HANDSHAKE_DIGITS_MAX_LENGTH 8
#define ASCON_KEY_ROTATION_TIME_ADDRESS 18350

// TLS/mTLS MQTT connection; never fall back to an insecure client.
#define MQTT_NO_TLS 0

#define COMMAND_TYPE_CONTROL      0x01
#define COMMAND_TYPE_OTHER        0x02

#define COMMAND_RESERVED_NONE     0x00
#define COMMAND_RESERVED_CONTROL  0x01

#define SERIAL_BAUD_RATE               115200

// =====================================================================
// Task/RTOS settings – adjusted for ESP8266 limited RAM (~50 KB heap)
// =====================================================================
#if PLATFORM_ESP8266
  #define TASK_STACK_SIZE                2048
  #define TASK_NETWORK_STACK_SIZE        4096
  #define TASK_SYSTEM_STACK_SIZE         2048
#else
  #define TASK_STACK_SIZE                10000
  #define TASK_NETWORK_STACK_SIZE        10000
  #define TASK_SYSTEM_STACK_SIZE         4096
#endif

#define TASK_CREATE_DELAY_MS           500
#define TASK_SENSOR_PRIORITY           3
#define TASK_NETWORK_PRIORITY          2
#define TASK_DEVICE_PRIORITY           1
#define TASK_SYSTEM_PRIORITY           1
#define SYSTEM_TASK_CHECK_INTERVAL_MS  5000
#define SYSTEM_TASK_NTP_RETRY_INTERVAL_MS 60000
#define SYSTEM_TASK_TELEMETRY_INTERVAL_MS 30000
#define SYSTEM_TASK_DEBUG_LOG          0
#define SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS 60000
#define COOP_LOOP_DELAY_MS             10
#define RTOS_IDLE_LOOP_DELAY_MS        1000

#define UART_BUFFER_SIZE               1024
#define UART_READ_TIMEOUT_MS           100

#if PLATFORM_ESP8266
  // ESP8266 has max 4KB SPI Flash EEPROM emulation by default
  #if ENABLE_MESSAGE_AUTHENTICATION
    #define EEPROM_SIZE                    (32 * 1024)
  #else
    #define EEPROM_SIZE                    (20 * 1024)
  #endif
#else
  #if ENABLE_MESSAGE_AUTHENTICATION
    #define EEPROM_SIZE                    (32 * 1024)
  #else
    #define EEPROM_SIZE                    (20 * 1024)
  #endif
#endif

#define TLS_SSL_DATA_ADDRESS            1300
#if ENABLE_MESSAGE_AUTHENTICATION
#define TLS_SSL_DATA_MAX_LENGTH         (MESSAGE_AUTH_KEY_ID_ADDRESS - TLS_SSL_DATA_ADDRESS - 1)
#else
#define TLS_SSL_DATA_MAX_LENGTH         (EEPROM_SIZE - TLS_SSL_DATA_ADDRESS - 1)
#endif

// Mỗi dữ liệu PEM phải kết thúc bằng '\0'. Các vùng không chồng lấp nhau trong EEPROM.
#define MTLS_CA_CERT_ADDRESS             1300
#define MTLS_CA_CERT_MAX_LENGTH          4095
#define MTLS_CLIENT_CERT_ADDRESS         5500
#define MTLS_CLIENT_CERT_MAX_LENGTH      4095
#define MTLS_PRIVATE_KEY_ADDRESS         9700
#if ENABLE_MESSAGE_AUTHENTICATION
#define MTLS_PRIVATE_KEY_MAX_LENGTH      (MESSAGE_AUTH_KEY_ID_ADDRESS - MTLS_PRIVATE_KEY_ADDRESS - 1)
#else
#define MTLS_PRIVATE_KEY_MAX_LENGTH      (EEPROM_SIZE - MTLS_PRIVATE_KEY_ADDRESS - 1)
#endif

// Message-authentication data: null-terminated key id and HMAC secret.
#define MESSAGE_AUTH_KEY_ID_ADDRESS      20000
#define MESSAGE_AUTH_KEY_ID_MAX_LENGTH   127
#define MESSAGE_AUTH_SECRET_ADDRESS      20200
#define MESSAGE_AUTH_SECRET_MAX_LENGTH   255

#define JSON_BUFFER_SIZE               512
#define JSON_SMALL_BUFFER_SIZE         128
#define DEVICE_INFO_DEFAULT_VALUE      2
// Identifier of the service type supported by this firmware/application.
#define DEVICE_SERVICE_ID              2

#define MQTT_JSON_DOC_SIZE             512
#define MQTT_COMMAND_DOC_SIZE          128
#define MQTT_PUBLISH_QOS               1
#define MQTT_RECONNECT_DELAY_MS        5000

#define WIFI_HTTP_PORT                 80
#define WIFI_WEB_RESPONSE_DELAY_MS     2000
#define WIFI_CONFIG_DELAY_MS           100
#define WIFI_PING_TIMEOUT_MS           2000
#define WIFI_OTA_UPLOAD_TIMEOUT_MS     120000
#define WIFI_OTA_RESTART_DELAY_MS      1000
#define NTP_LOCALTIME_TIMEOUT_MS       5000

#define WIFI_AP_SSID                   "ESP_Config"
#define WIFI_AP_PASSWORD               "12345678"

#define WIFI_PROV_POP                  "abcd1234"
#define WIFI_PROV_SERVICE_NAME         "PROV_123"

// =====================================================================
// GPIO Pin mapping – adjusted for ESP8266 (NodeMCU / ESP-12E)
// =====================================================================
#if PLATFORM_ESP8266
  // ESP8266 available GPIOs: 0,2,4,5,12,13,14,15,16
  #define DHT_PIN                        2     // GPIO2 (D4)
  #define DHT_TYPE                       DHT11
  #define SENSOR_TASK_INTERVAL_MS        1000
  #define SENSOR_READ_STEP_COUNT         4
  #define SENSOR_SERIAL_BAUD_RATE        9600
  #define SENSOR_QUEUE_SEND_DELAY_MS     100
  #define SENSOR_MUTEX_WAIT_MS           10

  #define BUTTON_DEBOUNCE_MS             50
  #define BUTTON_LONG_PRESS_MS           3000
  #define DEVICE_BUTTON_PIN              0     // GPIO0 (D3/FLASH button)
  #define INPUT_PULLUP_PIN               5     // GPIO5 (D1)
  #define OUTPUT_PUMP_PIN                4     // GPIO4 (D2)
  #define OUTPUT_DEVICE_1_PIN            14    // GPIO14 (D5)
#else
  // ESP32 pin assignments (original)
  #define DHT_PIN                        12
  #define DHT_TYPE                       DHT11
  #define SENSOR_TASK_INTERVAL_MS        1000
  #define SENSOR_READ_STEP_COUNT         4
  #define SENSOR_SERIAL_BAUD_RATE        9600
  #define SENSOR_QUEUE_SEND_DELAY_MS     100
  #define SENSOR_MUTEX_WAIT_MS           10

  #define BUTTON_DEBOUNCE_MS             50
  #define BUTTON_LONG_PRESS_MS           3000
  #define DEVICE_BUTTON_PIN              14
  #define INPUT_PULLUP_PIN               13
  #define OUTPUT_PUMP_PIN                22
  #define OUTPUT_DEVICE_1_PIN            23
#endif

#define DEVICE_QUEUE_SEND_DELAY_MS     50
#define DEVICE_TASK_PERIOD_MS          1000

#define HTTP_STATUS_OK                 200
#define OTA_STATE_TIMEOUT_MS           120000

#define NETWORK_ERROR_LIMIT            200
#define NETWORK_RECOVERY_LIMIT         3
#define MQTT_RETRY_LIMIT               30
#define WIFI_CHECK_LIMIT               10
#define WIFI_RECONNECT_LIMIT           4
#define WIFI_PING_RETRY_LIMIT          120
#define REALTIME_POLL_LIMIT            240
#define NETWORK_POLL_INTERVAL_MS       500

#define LORA_BUFFER_SIZE               255
#define MQTT_PAYLOAD_SIZE              1024
#define SENSOR_PAYLOAD_SIZE            256
#define DEVICE_PAYLOAD_SIZE            256

// =====================================================================
// High-speed capture – ESP32 only (disabled on ESP8266)
// =====================================================================
#if PLATFORM_ESP8266
  // ESP8266 does not support high-speed multi-channel capture.
  // These defines are kept for compilation compatibility but the
  // HighSpeedSampler will be effectively disabled.
  #define HS_ADC_PIN                      A0
  #define HS_ICM_SCK_PIN                  14
  #define HS_ICM_MISO_PIN                 12
  #define HS_ICM_MOSI_PIN                 13
  #define HS_ICM_CS_PIN                   15
  #define HS_ICM_SPI_HZ                   1000000
  #define HS_ADS_SCK_PIN                  14
  #define HS_ADS_MISO_PIN                 12
  #define HS_ADS_CNV_PIN                  16
  #define HS_ADS_SPI_HZ                   1000000
#else
  // High-speed capture defaults for ESP32-WROOM-32 DevKit V1.
  // Reassign these pins if they conflict with the project board wiring.
  #define HS_ADC_PIN                      34
  #define HS_ICM_SCK_PIN                  25
  #define HS_ICM_MISO_PIN                 26
  #define HS_ICM_MOSI_PIN                 27
  #define HS_ICM_CS_PIN                   33
  #define HS_ICM_SPI_HZ                   8000000
  #define HS_ADS_SCK_PIN                  18
  #define HS_ADS_MISO_PIN                 19
  #define HS_ADS_CNV_PIN                  21
  #define HS_ADS_SPI_HZ                   16000000
#endif

// High-speed sampling rates in samples per second (Hz).
#define HS_AUDIO_ADC_SAMPLE_RATE_HZ     10000UL
#define HS_ICM42688_SAMPLE_RATE_HZ      32000UL
#define HS_ADS8866_SAMPLE_RATE_HZ       100000UL
#define HS_CAPTURE_MAX_DURATION_MS      60000
#define HS_NETWORK_DRAIN_BATCH          8
