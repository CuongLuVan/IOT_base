

#define MODE_WIFI_ADRESS          1
#define SUPPORT_RTOS true
#define SUPPORT_LORA 0
#define SUPPORT_MQTT 1

// false = giữ nguyên luồng MQTT hiện tại.
// true  = xác thực chứng chỉ TLS/SSL bằng CA certificate lưu trong ROM/EEPROM.
#define ENABLE_TLS_SSL false

// false = giữ nguyên luồng MQTT/TLS hiện tại.
// true  = bật mutual TLS: broker xác thực thiết bị bằng client certificate và private key.
#define ENABLE_mTLS false

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

// 0 = use standard WiFiClient
// 1 = use WiFiClientSecure for TLS-capable MQTT connections
#define MQTT_NO_TLS 1

#define COMMAND_TYPE_CONTROL      0x01
#define COMMAND_TYPE_OTHER        0x02

#define COMMAND_RESERVED_NONE     0x00
#define COMMAND_RESERVED_CONTROL  0x01

#define SERIAL_BAUD_RATE               115200
#define TASK_STACK_SIZE                10000
#define TASK_CREATE_DELAY_MS           500
#define COOP_LOOP_DELAY_MS             10
#define RTOS_IDLE_LOOP_DELAY_MS        1000

#define UART_BUFFER_SIZE               1024
#define UART_READ_TIMEOUT_MS           100
#if ENABLE_MESSAGE_AUTHENTICATION
#define EEPROM_SIZE                    (32 * 1024)
#else
#define EEPROM_SIZE                    (20 * 1024)
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
#define MQTT_PAYLOAD_SIZE              512
#define SENSOR_PAYLOAD_SIZE            256
#define DEVICE_PAYLOAD_SIZE            256

