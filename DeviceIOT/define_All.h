

#define MODE_WIFI_ADRESS          1
#define SUPPORT_RTOS true
#define SUPPORT_LORA 0
#define SUPPORT_MQTT 1

// Pressure sensor G1/4, 0..1.2 MPa.  Set SUPPORT_LORA to 1 to use LoRa.
// LORA_ROLE_GATEWAY=1: this unit publishes its own and remote-node values to MQTT.
// LORA_ROLE_GATEWAY=0: this unit is a LoRa pressure node (its id must be > 1).
#define PRESSURE_SENSOR_PIN             34
#define PRESSURE_ADC_MAX                4095.0f
#define PRESSURE_ADC_REFERENCE_VOLT     3.30f
// Voltage at the ESP32 ADC after any external divider. Typical 0.5..4.5 V
// transmitters need a divider before connecting to an ESP32 ADC pin.
#define PRESSURE_SENSOR_ZERO_VOLT       0.50f
#define PRESSURE_SENSOR_FULL_VOLT       3.00f
#define PRESSURE_SENSOR_FULL_SCALE_KPA  1200.0f
#define PRESSURE_SENSOR_SAMPLES         8

// A pressure difference is compared with the last published sample.
#define PRESSURE_STABLE_DELTA_KPA       1.0f
#define PRESSURE_SMALL_DELTA_KPA        5.0f
#define PRESSURE_REPORT_STABLE_MS       600000UL // 10 minutes
#define PRESSURE_REPORT_SMALL_MS        60000UL  // 1 minute
#define PRESSURE_REPORT_LARGE_MS        10000UL  // 10 seconds

// LoRa network settings. All nodes must share radio settings and network id.
#define LORA_ROLE_GATEWAY               1
#define LORA_NODE_ID                    1       // gateway/master is always 1
#define LORA_NETWORK_ID                 0x31
#define LORA_FREQUENCY                  915E6L  // change to legal local band, e.g. 433E6/868E6
#define LORA_CS_PIN                     5
#define LORA_RESET_PIN                  27
#define LORA_IRQ_PIN                    26
#define LORA_SLOT_LENGTH_MS             750UL
#define LORA_SLOT_COUNT                 32
#define LORA_RANDOM_BACKOFF_MS          300UL
#define LORA_ACK_TIMEOUT_MS             250UL
#define LORA_MAX_RETRIES                4
#define LORA_REMOTE_NODE_CAPACITY       24

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

#define MQTT_JSON_DOC_SIZE             1024
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
#define MQTT_PAYLOAD_SIZE              1024
#define SENSOR_PAYLOAD_SIZE            256
#define DEVICE_PAYLOAD_SIZE            256

