

#define SUPPORT_RTOS true
#define SUPPORT_LORA 0
#define SUPPORT_MQTT 1

// ---------------------------------------------------------------------------
// MQTT security. Mỗi cờ tương ứng một cờ trong mqttBroker/MqttBroker1885.js;
// giữ hai bên giống nhau. Tính năng nào broker không dùng thì để 0 để không
// tốn flash/RAM/EEPROM. Không có chế độ MQTT không mã hóa: broker bắt buộc TLS.
// ---------------------------------------------------------------------------

// enable_TLS_SSL: xác thực chứng chỉ broker bằng CA trong EEPROM.
#define ENABLE_TLS_SSL true

// enableTLSCertificate: mTLS, broker xác thực thiết bị bằng fingerprint
// chứng chỉ client (mqtt_device_certs.json).
#define ENABLE_mTLS true

#if !ENABLE_TLS_SSL || !ENABLE_mTLS
  #error "Secure MQTT requires TLS server verification and mutual TLS client authentication."
#endif

// Gửi thêm mqtt_user/mqtt_pwd khi CONNECT. Firmware luôn dùng mTLS, broker xác
// thực thiết bị bằng chứng chỉ; chỉ bật khi broker bật enableClientID và cần
// khớp username trong mqtt_client_ids.json.
#define ENABLE_MQTT_USER_AUTH false

// enableAttack: thêm "timestamp" (ms) và "nonce" vào mọi publish
// (mqtt_replay.json, maxSkewSeconds mặc định 300 s -> cần đồng bộ NTP).
#define ENABLE_REPLAY_PROTECTION true

// enableMessageAuthentication: ký HMAC-SHA256 theo dạng canonical của broker
// (key sắp xếp, bỏ "signature"/"keyId") và kiểm tra chữ ký lệnh nhận về.
#define ENABLE_MESSAGE_AUTHENTICATION false

// enableBruteForce: broker khóa client sau maxFailedAttempts lần CONNECT lỗi
// trong windowSeconds (mqtt_bruteforce.json). Cờ này giới hạn số lần thử để
// thiết bị không tự làm mình bị khóa.
#define ENABLE_MQTT_CONNECT_RATE_LIMIT false
#define MQTT_CONNECT_MAX_FAILURES 4            // = maxFailedAttempts - 1
#define MQTT_CONNECT_FAILURE_WINDOW_MS 300000UL // = windowSeconds * 1000

// Ascon-AEAD128 mã hóa đầu cuối với server; broker chỉ chuyển tiếp, không hỗ trợ.
#define ENABLE_ASCON_AEAD128 false
#define ASCON_RANDOM_DIGITS 5
#define ASCON_KEY_ROTATION_MS 86400000UL
#define ASCON_PUBLIC_KEY_COUNT 10
#define ASCON_PUBLIC_KEY_HEX_LENGTH 32
#define ASCON_PUBLIC_KEY_ENTRY_LENGTH 33

// Mọi lệnh MQTT / LAN là {"com":<số>,...}; mọi trả lời mang "rc" (com được
// trả lời) và "rs" (kết quả: 0 ok, 1 xung đột, 2 không hợp lệ, 3 không có,
// 4 id đã có, 5 chưa sẵn sàng, 6 sai mật khẩu, 7 đang bận). Không còn lệnh / trả lời dạng "cmd".
// {"com":1,"value":<bitmask>[,"mask"]}: điều khiển cổng -> trạng thái ngắn + "rc":1.
#define COMMAND_TYPE_CONTROL      0x01
// {"com":2}: đọc trạng thái đầy đủ (thay {"cmd":"STATUS_GET"}) -> bản tin trạng thái + "rc":2.
#define COMMAND_TYPE_OTHER        0x02
#define COMMAND_TYPE_STATUS       COMMAND_TYPE_OTHER
#define COMMAND_TYPE_SCHEDULE_CONTROL 0x03
// {"com":4,"value":N}: đếm ngược N giây (1..86400) rồi bật cổng; 0 = hủy.
// Trả lời: bản tin trạng thái + "rc":4, "cd" (giây còn lại), "cm" (cổng), "cs" (N gần nhất).
#define COMMAND_TYPE_COUNTDOWN    0x04
// Lệnh số (MQTT / LAN), trả lời bằng bản tin trạng thái rút gọn + "rc"/"rs":
// {"com":5,"value":N} hẹn giờ tự tắt N giây (0 = tắt); lịch: 8 thêm, 9 sửa,
// 10 xóa, 11 bật/tắt (value 1/0), 12 xóa hết, 13 đọc danh sách.
// 7 dành cho Ascon ({"com":7} -> {"rc":7,"rs":0,"ky":"<chữ số chọn khóa>"}).
#define COMMAND_TYPE_ON_TIMER         5
#define COMMAND_TYPE_SCHEDULE_ADD     8
#define COMMAND_TYPE_SCHEDULE_UPDATE  9
#define COMMAND_TYPE_SCHEDULE_DELETE  10
#define COMMAND_TYPE_SCHEDULE_ENABLE  11
#define COMMAND_TYPE_SCHEDULE_CLEAR   12
#define COMMAND_TYPE_SCHEDULE_LIST    13
// {"com":14,"id":1|2,"value":N}: điều khiển theo ngưỡng sensor (ThresholdControl.h).
#define COMMAND_TYPE_THRESHOLD        14
// Số sensor trong "va" mà ngưỡng dùng được: độ ẩm, nhiệt độ, bụi, PM2.5, PM10, PM1.
#define THRESHOLD_SENSOR_COUNT        6
#define COMMAND_TYPE_ASCON_HANDSHAKE  0x07
// {"com":15,"value":<ms>,"mode":1..4,"udp_host":"..","udp_port":n}: thu mẫu tốc
// độ cao (thay {"cmd":"capture.*"}); value 0 = dừng, không value = đọc trạng thái.
// mode: 1 ADC 10 kHz, 2 IMU 32 kHz, 3 ADS 100 kHz, 4 tất cả. Trả lời {"rc":15,"rs":n,"act":0|1}.
#define COMMAND_TYPE_HIGH_SPEED_CAPTURE 15

#define COMMAND_RESERVED_NONE     0x00
#define COMMAND_RESERVED_CONTROL  0x01

// Output bit toggled by the device button (the pump).
#define SYSTEM_TASK_SCHEDULE_PORT_MASK 0x01
// Lịch (SCHEDULE_*, spec_v1.txt) dùng múi giờ này để so giờ/ngày.
// Việt Nam: 7 * 3600.
#define SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS 0

#if SYSTEM_TASK_SCHEDULE_PORT_MASK != 0x01
  #error "The device button is wired to the fixed pump output bit (0x01)."
#endif

// Lịch cục bộ (ScheduleEngine). Tối đa 20 lịch, id 1..SCHEDULE_MAX_COUNT.
#define SCHEDULE_MAX_COUNT             20
// Cổng lịch được phép điều khiển: bit0 = bơm (OUTPUT_PUMP_PIN),
// bit1 = thiết bị 1 (OUTPUT_DEVICE_1_PIN). Lịch có port_mask ngoài vùng này bị từ chối.
#define SCHEDULE_ALLOWED_PORT_MASK     0x03
// Sau khi task bị trễ, chỉ bù tối đa số phút này; lịch lỡ lâu hơn bị bỏ qua.
#define SCHEDULE_CATCHUP_MINUTES       5

#define SERIAL_BAUD_RATE               115200
#define TASK_STACK_SIZE                10000
#define TASK_CREATE_DELAY_MS           500
#define TASK_SENSOR_PRIORITY           3
#define TASK_NETWORK_PRIORITY          2
#define TASK_DEVICE_PRIORITY           1
#define TASK_SYSTEM_PRIORITY           1
#define TASK_SYSTEM_STACK_SIZE         4096
#define SYSTEM_TASK_CHECK_INTERVAL_MS  5000
#define SYSTEM_TASK_NTP_RETRY_INTERVAL_MS 60000
#define SYSTEM_TASK_TELEMETRY_INTERVAL_MS 30000
#define SYSTEM_TASK_DEBUG_LOG          0
#define SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS 60000
#define COOP_LOOP_DELAY_MS             10
#define RTOS_IDLE_LOOP_DELAY_MS        1000

#define UART_BUFFER_SIZE               1024
#define UART_READ_TIMEOUT_MS           100
// ---------------------------------------------------------------------------
// EEPROM layout (giống hệt DeviceIOT8266). Mỗi chuỗi kết thúc bằng '\0';
// *_MAX_LENGTH không tính ký tự '\0'. Trên ESP32, EEPROM.begin() giữ bản sao
// RAM đúng bằng EEPROM_SIZE, nên EEPROM_SIZE chỉ kéo dài đến vùng cuối cùng
// đang bật. Mục tiêu: mọi cấu hình < 3 KB (tối đa 2831 B khi bật tất cả).
// ---------------------------------------------------------------------------
#define MODE_WIFI_ADRESS                 1
#define WIFI_SSSID                       2      // SSID tối đa 32 ký tự
#define WIFI_SSID_MAX_LENGTH             32
#define WIFI_PASS                        (WIFI_SSSID + WIFI_SSID_MAX_LENGTH + 1)
#define WIFI_PASS_MAX_LENGTH             63
#define VERSJON_SETUP_JSON               (WIFI_PASS + WIFI_PASS_MAX_LENGTH + 1)
#define VERSJON_MAX_LENGTH               15
// Lịch bơm của DeviceIOT8266 (ESP32 lưu lịch trong NVS Preferences).
#define SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS (VERSJON_SETUP_JSON + VERSJON_MAX_LENGTH + 1)
#define SYSTEM_TASK_SCHEDULE_STORAGE_SIZE    112
// JSON cấu hình MQTT đã thu gọn (chỉ các trường NetWork_Mqtt đọc).
#define WIFI_SETUP_JSON                  (SYSTEM_TASK_SCHEDULE_STORAGE_ADDRESS + SYSTEM_TASK_SCHEDULE_STORAGE_SIZE)
#define WIFI_SETUP_JSON_MAX_LENGTH       447

// Dữ liệu bảo mật: chứng chỉ ECDSA P-256 (mqttBroker/certs/generate_ecdsa_certs.ps1).
// Đo thực tế: ca.crt 622 B, deviceX.crt 642 B, key SEC1 không public key
// 134 B (PKCS#8 246 B); cộng thêm ~11 B nếu xuống dòng CRLF.
// Chứng chỉ RSA không còn vừa các vùng này.
#define SECURITY_DATA_ADDRESS            (WIFI_SETUP_JSON + WIFI_SETUP_JSON_MAX_LENGTH + 1)
#define MTLS_CA_CERT_ADDRESS             SECURITY_DATA_ADDRESS
#define MTLS_CA_CERT_MAX_LENGTH          703
#define MTLS_CLIENT_CERT_ADDRESS         (MTLS_CA_CERT_ADDRESS + MTLS_CA_CERT_MAX_LENGTH + 1)
#define MTLS_CLIENT_CERT_MAX_LENGTH      767
#define MTLS_PRIVATE_KEY_ADDRESS         (MTLS_CLIENT_CERT_ADDRESS + MTLS_CLIENT_CERT_MAX_LENGTH + 1)
#define MTLS_PRIVATE_KEY_MAX_LENGTH      255
// TLS một chiều chỉ dùng CA tại cùng địa chỉ.
#define TLS_SSL_DATA_ADDRESS             MTLS_CA_CERT_ADDRESS
#define TLS_SSL_DATA_MAX_LENGTH          MTLS_CA_CERT_MAX_LENGTH

// keyId trùng tên key trong mqtt_message_auth.json (thường là clientId);
// secret tối đa 64 ký tự (ví dụ 32 byte dạng hex).
#define MESSAGE_AUTH_KEY_ID_ADDRESS      (MTLS_PRIVATE_KEY_ADDRESS + MTLS_PRIVATE_KEY_MAX_LENGTH + 1)
#define MESSAGE_AUTH_KEY_ID_MAX_LENGTH   32
#define MESSAGE_AUTH_SECRET_ADDRESS      (MESSAGE_AUTH_KEY_ID_ADDRESS + MESSAGE_AUTH_KEY_ID_MAX_LENGTH + 1)
#define MESSAGE_AUTH_SECRET_MAX_LENGTH   64
#define MESSAGE_AUTH_MAX_FIELDS          24

#define ASCON_PUBLIC_KEYS_ADDRESS        (MESSAGE_AUTH_SECRET_ADDRESS + MESSAGE_AUTH_SECRET_MAX_LENGTH + 1)
#define ASCON_PUBLIC_KEYS_END            (ASCON_PUBLIC_KEYS_ADDRESS + ASCON_PUBLIC_KEY_COUNT * ASCON_PUBLIC_KEY_ENTRY_LENGTH)

// Lịch cục bộ: đặt sau vùng cuối cùng của layout đầy đủ để không địa chỉ cũ
// nào bị dịch, dù các cờ bảo mật bật hay tắt.
//   header   4 B: 'S' 'C' version SCHEDULE_MAX_COUNT
//   records 20 x 6 B: hour minute weekday port_state auto_off_lo auto_off_hi
//   meta    20 x 5 B: flags port_mask day_lo day_hi crc8
// Bản ghi 6 B giữ nguyên định dạng spec_v1 §2; metadata nằm ở vùng riêng.
#define SCHEDULE_EEPROM_ADDRESS          ASCON_PUBLIC_KEYS_END
#define SCHEDULE_EEPROM_HEADER_SIZE      4
#define SCHEDULE_EEPROM_VERSION          1
#define SCHEDULE_RECORD_SIZE             6
#define SCHEDULE_META_SIZE               5
#define SCHEDULE_RECORDS_ADDRESS         (SCHEDULE_EEPROM_ADDRESS + SCHEDULE_EEPROM_HEADER_SIZE)
#define SCHEDULE_META_ADDRESS            (SCHEDULE_RECORDS_ADDRESS + SCHEDULE_MAX_COUNT * SCHEDULE_RECORD_SIZE)
#define SCHEDULE_EEPROM_END              (SCHEDULE_META_ADDRESS + SCHEDULE_MAX_COUNT * SCHEDULE_META_SIZE)

// Hẹn giờ tự tắt (OnTimer, độc lập với lịch): 4 B uint32 little-endian, số
// giây 1..86400 (24 h); 0 = không dùng.
#define ON_TIMER_EEPROM_ADDRESS          SCHEDULE_EEPROM_END
#define ON_TIMER_EEPROM_SIZE             4
#define ON_TIMER_EEPROM_END              (ON_TIMER_EEPROM_ADDRESS + ON_TIMER_EEPROM_SIZE)

// Đếm ngược tự bật (Countdown, độc lập với lịch): 4 B uint32 little-endian,
// số giây của lần đếm gần nhất 1..86400. Bộ đếm chỉ ở RAM, không nhớ khi mất điện.
#define COUNTDOWN_EEPROM_ADDRESS         ON_TIMER_EEPROM_END
#define COUNTDOWN_EEPROM_SIZE            4
#define COUNTDOWN_EEPROM_END             (COUNTDOWN_EEPROM_ADDRESS + COUNTDOWN_EEPROM_SIZE)

// EEPROM.begin() trên ESP32 mở rộng blob cũ và giữ nguyên dữ liệu, nên tăng
// EEPROM_SIZE để chứa vùng lịch / hẹn giờ không làm mất cấu hình đã lưu.
// Điều khiển theo ngưỡng sensor: 2 x 4 B (ThresholdControl.h).
#define THRESHOLD_EEPROM_ADDRESS         COUNTDOWN_EEPROM_END
#define THRESHOLD_EEPROM_SIZE            8
#define THRESHOLD_EEPROM_END             (THRESHOLD_EEPROM_ADDRESS + THRESHOLD_EEPROM_SIZE)

#define EEPROM_SIZE                      THRESHOLD_EEPROM_END

#if SCHEDULE_EEPROM_ADDRESS < ASCON_PUBLIC_KEYS_END
  #error "Schedule EEPROM region overlaps the Ascon key region."
#endif

#if EEPROM_SIZE > 3072
  #error "EEPROM layout exceeds the 3 KB budget."
#endif

#if MTLS_CA_CERT_ADDRESS + MTLS_CA_CERT_MAX_LENGTH >= MTLS_CLIENT_CERT_ADDRESS
  #error "CA certificate EEPROM region overlaps the client certificate region."
#endif
#if MTLS_CLIENT_CERT_ADDRESS + MTLS_CLIENT_CERT_MAX_LENGTH >= MTLS_PRIVATE_KEY_ADDRESS
  #error "Client certificate EEPROM region overlaps the private key region."
#endif
#if MTLS_PRIVATE_KEY_MAX_LENGTH <= 0
  #error "No EEPROM space remains for the mTLS private key."
#endif
#if ENABLE_ASCON_AEAD128 && MTLS_PRIVATE_KEY_ADDRESS + MTLS_PRIVATE_KEY_MAX_LENGTH >= ASCON_PUBLIC_KEYS_ADDRESS
  #error "mTLS private key EEPROM region overlaps the Ascon key region."
#endif

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
// Điều khiển LAN: POST http://<ip>/lan {"data":<lệnh MQTT>} chạy lệnh giống hệt
// khi nhận qua MQTT (cùng kiểm tra chữ ký / Ascon) và trả
// {"ip":"...","data":[các bản tin thiết bị lẽ ra publish]}. Dùng khi broker /
// Internet lỗi. Lệnh vẫn phải có mật khẩu "pa" (ENABLE_COMMAND_PASSWORD); mạng
// LAN không tin cậy thì bật thêm ENABLE_MESSAGE_AUTHENTICATION.
#define ENABLE_LAN_CONTROL             true
// Mật khẩu lệnh: mọi lệnh (MQTT, LAN, /control) phải có "pa" bằng mật khẩu
// thiết bị ("mqtt_pwd" đã lưu khi cài đặt = "mqtt_pass" của web_manager).
// Sai -> từ chối, trả {"rc":<com>,"rs":6}. Thiết bị chưa có mật khẩu nhận
// lệnh không có "pa".
#define ENABLE_COMMAND_PASSWORD        true
#define COMMAND_RESULT_WRONG_PASSWORD  6
// "rs" khi thiết bị đang bận (vd. đang thu mẫu tốc độ cao).
#define COMMAND_RESULT_BUSY            7
#define LAN_CONTROL_PATH               "/lan"
#define LAN_REQUEST_MAX_LENGTH         (MQTT_PACKET_SIZE + 64)
#define LAN_REPLY_MAX_LENGTH           3072
// Mỗi lần kết nối MQTT thất bại có thể chặn TaskNetwork vài giây; giãn các lần
// thử để server LAN vẫn trả lời khi broker không tới được.
#define MQTT_RETRY_INTERVAL_MS         5000
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
// Interval between low-rate sensor read steps; DHT/PMS reads are staggered by SENSOR_READ_STEP_COUNT.
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
// Gói MQTT trên đường truyền: Ascon mã hex nên cần gấp đôi payload gốc.
#if ENABLE_ASCON_AEAD128
#define MQTT_PACKET_SIZE               2048
#else
#define MQTT_PACKET_SIZE               MQTT_PAYLOAD_SIZE
#endif
#define SENSOR_PAYLOAD_SIZE            256
#define DEVICE_PAYLOAD_SIZE            256

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
// High-speed sampling rates in samples per second (Hz).
#define HS_AUDIO_ADC_SAMPLE_RATE_HZ     10000UL
#define HS_ICM42688_SAMPLE_RATE_HZ      32000UL
#define HS_ADS8866_SAMPLE_RATE_HZ       100000UL
#define HS_CAPTURE_MAX_DURATION_MS      60000
#define HS_NETWORK_DRAIN_BATCH          8
