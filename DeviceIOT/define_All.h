

#define MODE_WIFI_ADRESS          1
#define SUPPORT_RTOS true
#define SUPPORT_LORA 0
#define SUPPORT_MQTT 1

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
#define EEPROM_SIZE                    2048

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

#define DHT_PIN                        12
#define DHT_TYPE                       DHT11
#define SENSOR_TASK_INTERVAL_MS        1000
#define SENSOR_READ_STEP_COUNT         5
#define SENSOR_SERIAL_BAUD_RATE        9600
#define SENSOR_QUEUE_SEND_DELAY_MS     100
#define SENSOR_MUTEX_WAIT_MS           10

// ======== CẢM BIẾN LỰC FSR402 - PHÁT HIỆN ĐẬP KÍNH ========
// Chân ADC kết nối FSR402 (GPIO34 = ADC1_CH6, chân chỉ input, phù hợp analog)
// Sơ đồ đấu nối: 3.3V --- [FSR402] ---+--- GPIO34
//                                      |
//                                   [10kΩ]
//                                      |
//                                     GND
#define FSR_PIN                        34

// Ngưỡng phát hiện đập kính (0-4095, ADC 12-bit ESP32)
// Giá trị càng cao = cần lực càng mạnh mới báo động
// ~500  = nhạy (chạm nhẹ cũng phát hiện)
// ~2000 = trung bình (đập mạnh mới phát hiện)
// ~3500 = kém nhạy (chỉ đập rất mạnh)
#define FSR_GLASS_BREAK_THRESHOLD      2000

// Thời gian chờ giữa 2 lần cảnh báo (ms) - tránh gửi MQTT liên tục
#define FSR_ALERT_COOLDOWN_MS          5000

// Số lần đọc liên tiếp vượt ngưỡng để xác nhận đập kính (chống nhiễu)
#define FSR_CONFIRM_COUNT              2

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

