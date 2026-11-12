# DeviceIOT8266_V1 — Hướng dẫn (ESP8266_RTOS_SDK)

DeviceIOT8266_V1 là bản viết lại của firmware `DeviceIOT8266` để chạy trực tiếp
trên **[ESP8266_RTOS_SDK](https://github.com/espressif/ESP8266_RTOS_SDK)**
(FreeRTOS + esp_wifi + lwIP + mbedTLS + NVS + cJSON), **không dùng Arduino**.
Toàn bộ chức năng, giao thức lệnh, định dạng bản tin, bố cục EEPROM và các quy
tắc (ưu tiên điều khiển, xung đột lịch, backoff, bảo mật) được giữ như bản gốc.

Tài liệu nghiệp vụ của bản gốc vẫn áp dụng nguyên vẹn, đọc kèm:
`DeviceIOT8266/docs/Schedule.md` (lịch, on-timer, countdown, ngưỡng),
`DeviceIOT8266/docs/LanControl.md` (điều khiển LAN),
`DeviceIOT8266/docs/Connectivity.md` (Wi-Fi, khôi phục kết nối),
`DeviceIOT8266/docs/SystemTask.md`.

---

## 1. Khác gì so với DeviceIOT8266

| Phần | DeviceIOT8266 (Arduino) | DeviceIOT8266_V1 (ESP8266_RTOS_SDK) |
|---|---|---|
| Lập lịch | `loop()` hợp tác + recurrent function (SUPPORT_RTOS 0) | 4 task FreeRTOS thật, đúng nhánh `SUPPORT_RTOS 1` của bản gốc |
| Điểm vào | `setup()` / `loop()` trong `.ino` | `app_main()` trong `main/app_main.cpp` |
| Thời gian | `millis()`, `delay()` | `millis()` = tick FreeRTOS (10 ms), `vTaskDelay` |
| GPIO / ADC | `pinMode`, `digitalWrite`, `analogRead` | `driver/gpio.h`, `driver/adc.h` |
| DHT11 | thư viện Adafruit DHT | `DhtSensor.cpp` (tự viết, cùng thuật toán) |
| LoRa SX127x | thư viện LoRa (Sandeep Mistry) + SPI | `LoRaRadio.cpp` (tự viết, cùng chuỗi thanh ghi, SPI bằng GPIO) |
| Wi-Fi | `ESP8266WiFi` | `esp_wifi` + `esp_event` + `tcpip_adapter` |
| Web server | `ESP8266WebServer` + request gate | `HttpServer.cpp` (socket lwIP không chặn, cùng request gate 408/413/431) |
| MQTT | PubSubClient + `WiFiClientSecure` (BearSSL) | `MqttClient.cpp` (MQTT 3.1.1 tự viết) trên **mbedTLS** |
| HMAC | BearSSL | `mbedtls_md_hmac` |
| JSON | ArduinoJson 7 | cJSON (có sẵn trong SDK) + `JsonUtil.cpp` |
| EEPROM | `EEPROM.h` (1 sector flash) | Ảnh EEPROM 3071 byte lưu trong **NVS** (3 blob 1 KB) — `Memory.cpp` |
| SNTP | `configTime()` | `lwip/apps/sntp.h` |
| ARP / DNS probe | gọi lwIP trực tiếp | gọi lwIP trong luồng tcpip (`tcpip_callback`) |

Các file **logic thuần** được chép nguyên (không sửa logic):
`ScheduleCore.h`, `PortArbiter.h`, `PortBits.h`, `OnTimer.h`, `Countdown.h`,
`ThresholdControl.h`, `ByteCodec.h`, `AirQuality.h`, `AsconAead128.*`,
`CommandResult.h`, `protocol_commands.h`, `eeprom_layout.h`, `config_checks.h`.
Các file `OnTimer.cpp`, `Countdown.cpp`, `ThresholdControl.cpp`,
`Automation.*`, `ScheduleEngine.cpp`, `TaskDevice.cpp` giữ nguyên logic, chỉ
thay lớp nền tảng.

### Kiến trúc task (giống nhánh RTOS của bản gốc)

```
app_main()
 ├─ Memory::begin()        NVS → ảnh EEPROM trong RAM
 ├─ TaskDevice::setup()    GPIO ra, nút nhấn, hàng đợi lệnh
 ├─ TaskSensor::setup()    DHT11, ADC
 ├─ SystemTask::setup()    Automation (lịch, on-timer, countdown, ngưỡng)
 ├─ TaskNetwork::setup()   Wi-Fi driver, LoRa, MQTT settings + chứng chỉ
 └─ xTaskCreate ×4
     TaskDevice  ưu tiên 3  25 ms   cổng ra, nút, auto OFF, kiểm tra heartbeat
     TaskSensor  ưu tiên 2  25 ms   ADC 1 s, DHT11 2,5 s, đánh giá ngưỡng
     TaskNetwork ưu tiên 2  20 ms   Wi-Fi, HTTP, MQTT, LoRa, telemetry
     SystemTask  ưu tiên 2  100 ms  lịch, ghi NVS (≤ 1 lần/15 s), snapshot
```

TaskDevice có ưu tiên cao nhất nên cổng ra, nút nhấn và tự tắt vẫn chạy khi
TaskNetwork đang bận bắt tay TLS. Web server và MQTT cùng chạy trong
TaskNetwork, nên lệnh LAN và lệnh MQTT đi chung một luồng như bản gốc.

### Sơ đồ module (thư mục `main/`)

| File | Vai trò |
|---|---|
| `app_main.cpp` | Khởi động, tạo 4 task |
| `config_features.h`, `board_pins.h`, `timing.h` | Cấu hình tính năng, chân, thời gian |
| `Platform.*`, `Sync.h`, `DebugInfo.h`, `Clock.*` | Lớp nền: millis, mutex/queue, log, SNTP |
| `Memory.*` | EEPROM tương thích trên NVS |
| `JsonUtil.*` | cJSON + serialiser (số nguyên luôn in dạng nguyên) |
| `TaskDevice.*`, `ButtonInput.h` | Cổng ra, nút |
| `TaskSensor.*`, `DhtSensor.*` | Cảm biến |
| `SystemTask.*`, `Automation.*`, `ScheduleEngine.*`, `OnTimer.*`, `Countdown.*`, `ThresholdControl.*` | Tự động hoá |
| `TaskNetwork.*` | Điều phối mạng |
| `NetworkWifi.*`, `LinkProbe.*` | Wi-Fi, ARP/DNS |
| `HttpServer.*`, `SetupPortal.*`, `DeviceHttpApi.*` | Web server, `/setup`, `/wifi`, `/update`, `/control`, `/lan`, `/lora` |
| `NetworkMqtt.*`, `MqttClient.*`, `MqttTransport.cpp`, `MqttSecurity.cpp`, `AsconSession.cpp`, `CommandDispatcher.cpp`, `CommandHandlers.cpp`, `StatusReport.cpp`, `MqttPlatform.*`, `PemCheck.h` | MQTT, bảo mật, lệnh |
| `NetworkRF.*`, `LoRaRadio.*` | LoRa |

---

## 2. Cài đặt môi trường

Firmware nhắm **ESP8266_RTOS_SDK v3.4** và toolchain
`xtensa-lx106-elf-gcc8_4_0-esp-2020r3`. Trên Windows nên dùng **WSL (Ubuntu)**
cho đơn giản; cách MSYS2 gốc của Espressif xem mục 2.2.

### 2.1. Linux / WSL (khuyên dùng)

```bash
sudo apt update
sudo apt install -y git wget flex bison gperf python3 python3-pip python3-venv \
     python-is-python3 cmake ninja-build ccache libncurses-dev make

mkdir -p ~/esp && cd ~/esp

# Toolchain
wget https://dl.espressif.com/dl/xtensa-lx106-elf-gcc8_4_0-esp-2020r3-linux-amd64.tar.gz
tar -xzf xtensa-lx106-elf-gcc8_4_0-esp-2020r3-linux-amd64.tar.gz

# SDK (đúng tag v3.4, kèm submodule)
git clone --recursive -b v3.4 https://github.com/espressif/ESP8266_RTOS_SDK.git

# Biến môi trường (thêm vào ~/.bashrc)
export IDF_PATH=~/esp/ESP8266_RTOS_SDK
export PATH="$HOME/esp/xtensa-lx106-elf/bin:$PATH"

# Thư viện Python của SDK
python -m pip install --user -r $IDF_PATH/requirements.txt
```

Kiểm tra: `xtensa-lx106-elf-gcc --version` phải in `8.4.0`.

**Cổng COM trong WSL2:** cài `usbipd-win` trên Windows, rồi
`usbipd list` → `usbipd bind --busid <id>` → `usbipd attach --wsl --busid <id>`;
trong WSL cổng sẽ là `/dev/ttyUSB0`. (WSL1 dùng thẳng `/dev/ttySN` với COMN.)

### 2.2. Windows thuần (MSYS2 của Espressif)

1. Tải gói môi trường MSYS2 mà tài liệu SDK v3.4 chỉ định
   `https://dl.espressif.com/dl/esp32_win32_msys2_environment_and_toolchain-20181001.zip`,
   giải nén vào `C:\` (tạo `C:\msys32`), mở `C:\msys32\mingw32.exe`.
2. Tải toolchain Windows
   `https://dl.espressif.com/dl/xtensa-lx106-elf-gcc8_4_0-esp-2020r3-win32.zip`,
   giải nén vào `C:\msys32\opt\`.
3. Trong cửa sổ mingw32: clone SDK như mục 2.1 rồi đặt
   `export IDF_PATH="/c/msys32/home/<user>/esp/ESP8266_RTOS_SDK"` và
   `export PATH="/opt/xtensa-lx106-elf/bin:$PATH"`, cài requirements như trên.
4. Cổng nạp dạng `COM3` (trong menuconfig ghi `COM3`).

---

## 3. Biên dịch và nạp

```bash
cd /đường/dẫn/IOT_base/DeviceIOT8266_V1

make menuconfig        # Serial flasher config → Default serial port (vd /dev/ttyUSB0)
make -j4 all           # build bootloader + partition table + app
make flash             # nạp
make monitor           # xem log (Ctrl+] để thoát)
# hoặc gộp:
make -j4 flash monitor ESPPORT=/dev/ttyUSB0
```

* Lần đầu, `sdkconfig.defaults` được áp vào `sdkconfig` (CPU 160 MHz, flash
  4 MB, UART 115200, stack `app_main` 8 KB, bộ đệm mbedTLS 4096/2048, ...).
  Sửa `sdkconfig.defaults` sau này thì **xoá `sdkconfig`** rồi build lại.
* Xoá toàn bộ cấu hình đã lưu (Wi-Fi, chứng chỉ, lịch): `make erase_flash`
  rồi nạp lại.
* Dự án cũng có `CMakeLists.txt` cho hệ build CMake (bản xem trước của SDK):
  `python $IDF_PATH/tools/idf.py build flash monitor`. Khuyên dùng `make`.

Log khởi động bình thường:

```
[Boot] Starting DeviceIOT8266_V1 (ESP8266_RTOS_SDK)
[Memory] EEPROM image of 3071 bytes loaded from NVS
[Device] Outputs and button initialized
[Sensor] DHT11 and ADC initialized
[Schedule] Loaded 0 active schedule(s), EEPROM 2831..3054
...
[Network] Starting in setup portal mode
[LoRa] Initialized in polling mode
[WiFi] Access point "setup_now" open at 192.168.4.1
[Boot] Tasks started, free heap ... bytes
```

---

## 4. Cấu hình

### 4.1. Tính năng — `main/config_features.h`

Giống bản gốc; mỗi cờ phải khớp `mqttBroker/MqttBroker1885.js`.

| Cờ | Mặc định | Ý nghĩa |
|---|---|---|
| `SUPPORT_LORA` | 1 | Bật LoRa |
| `ENABLE_TLS_SSL` | 1 | Bắt buộc (broker chỉ nhận TLS) |
| `ENABLE_MTLS` | 1 | Chứng chỉ client ECDSA P-256 |
| `ENABLE_MQTT_USER_AUTH` | 0 | Gửi `mqtt_user`/`mqtt_pwd` khi CONNECT (bắt buộc nếu tắt mTLS) |
| `ENABLE_REPLAY_PROTECTION` | 1 | `timestamp` + `nonce` (cần SNTP) |
| `ENABLE_MESSAGE_AUTHENTICATION` | 0 | Ký HMAC-SHA256 |
| `ENABLE_MQTT_CONNECT_RATE_LIMIT` | 0 | Giới hạn CONNECT lỗi |
| `ENABLE_ASCON_AEAD128` | 0 | Mã hoá đầu-cuối Ascon |
| `ENABLE_LAN_CONTROL` | 1 | `/lan`, `/control` |
| `ENABLE_COMMAND_PASSWORD` | 1 | Mọi lệnh phải có `"pa"` |

### 4.2. Thời gian — `main/timing.h`

Giữ nguyên các hằng của bản gốc. Hay chỉnh nhất:

* `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS` — **đặt `7 * 3600` cho Việt Nam**
  (mặc định 0 = UTC, giống bản gốc).
* `TASK_*_STACK_SIZE` — kích thước stack (byte). Telemetry `tasks[].stack_hwm_units`
  cho biết số byte stack chưa từng dùng của mỗi task.

### 4.3. Chân — `main/board_pins.h`

| Chức năng | GPIO (NodeMCU) |
|---|---|
| Bơm (bit0) | GPIO4 / D2 |
| Nút thiết bị (giữ ≥ 3 s, thả ra → đảo bơm) | GPIO0 / D3 |
| Input pull-up | GPIO5 / D1 |
| DHT11 data | GPIO2 / D4 (cần trở kéo lên 3,3 V) |
| ADC | A0 / TOUT |
| LoRa SCK / MISO / MOSI | GPIO14 / GPIO12 / GPIO13 |
| LoRa NSS / RESET | GPIO15 / GPIO16 |
| LoRa DIO0 | không nối (thu bằng polling) |

`LORA_FREQUENCY_HZ` mặc định 915 MHz; đổi `433000000L` hoặc `868000000L` theo module.

### 4.4. sdkconfig

Các giá trị quan trọng trong `sdkconfig.defaults`:

* `CONFIG_MBEDTLS_SSL_IN_CONTENT_LEN=4096`: broker Node.js không hỗ trợ
  max_fragment_length nên bộ đệm nhận phải chứa trọn 1 bản ghi TLS. Khi bật
  Ascon (`MQTT_PACKET_SIZE` 2048) vẫn đủ.
* `CONFIG_MAIN_TASK_STACK_SIZE=8192`: `app_main` parse chứng chỉ bằng mbedTLS.
* `CONFIG_FREERTOS_HZ=100`: mọi `delay` được làm tròn lên số tick.

---

## 5. Cấp phát thiết bị (giống bản gốc)

Chế độ lưu ở `EEPROM_ADDR_WIFI_MODE` quyết định thiết bị chạy gì:

| Giá trị | Chạy |
|---|---|
| chưa có (máy mới) | AP `setup_now` / mật khẩu `setup_now`, trang `/setup` |
| 4 ApPortal | AP `ESP_Config` / `12345678`, trang `/wifi` |
| 1 Station | Vào Wi-Fi đã lưu, MQTT, API LAN |

Bước 1 — nối máy tính vào AP `setup_now`, gửi cấu hình MQTT + chứng chỉ:

```bash
curl -X POST http://192.168.4.1/setup \
  --data-urlencode 'data={"mqtt_host":"broker.example.com","mqtt_port":1885,
   "mqtt_client":"device1","mqtt_pwd":"matkhau",
   "public_topic":"devices/device1/data","subcribe_topic":"devices/device1/commands/#",
   "mqtt_ca_cert":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
   "mqtt_client_cert":"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n",
   "mqtt_private_key":"-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----\n"}'
# → {"success":true,"saved":true,"restart":true}, thiết bị khởi động lại vào AP ESP_Config
```

Chứng chỉ: ECDSA P-256 tạo bằng `mqttBroker/certs/generate_ecdsa_certs.ps1`
(`ca.crt`, `<clientId>.crt`, `<clientId>.esp.key`). RSA không vừa vùng EEPROM.

Bước 2 — nối vào AP `ESP_Config`, gửi Wi-Fi:

```bash
curl -X POST http://192.168.4.1/wifi --data-urlencode 'data={"ssid":"TenWifi","password":"MatKhauWifi"}'
# → {"saved":true,"restart":true,"success":true,"registered":true,"mqtt_id":"device1",...}
```

Thiết bị khởi động lại ở chế độ Station, lấy IP qua DHCP, đồng bộ SNTP, kết
nối MQTT/TLS và gửi báo cáo trạng thái. Nếu mất Wi-Fi quá 2 phút, AP
`ESP_Config` tự mở lại (trạm vẫn tiếp tục thử); quá 30 phút không có IP thì
khởi động lại (trừ khi có người đang nối vào AP).

---

## 6. Giao thức lệnh (không đổi)

Lệnh qua MQTT (topic `subcribe_topic`) hoặc LAN `POST http://<ip>/lan
{"data":<lệnh>}`. Mọi trả lời có `rc` (lệnh được trả lời) và `rs`
(0 ok, 1 xung đột, 2 sai, 3 không thấy, 4 id đã có, 5 chưa sẵn sàng, 6 sai
mật khẩu, 7 bận).

| `com` | Lệnh | Ví dụ |
|---|---|---|
| 1 | Điều khiển cổng | `{"com":1,"value":1,"pa":"matkhau"}` |
| 2 | Trạng thái đầy đủ | `{"com":2,"pa":"matkhau"}` |
| 4 | Đếm ngược tự bật (giây, 0 = huỷ) | `{"com":4,"value":600,"pa":"..."}` |
| 5 | Tự tắt sau N giây (0 = tắt) | `{"com":5,"value":1800,"pa":"..."}` |
| 7 | Bắt tay khoá Ascon | `{"com":7}` |
| 8/9 | Thêm / sửa lịch | `{"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600,"pa":"..."}` |
| 10 | Xoá lịch | `{"com":10,"id":1,"pa":"..."}` |
| 11 | Bật/tắt lịch | `{"com":11,"id":1,"value":0,"pa":"..."}` |
| 12 | Xoá hết lịch | `{"com":12,"pa":"..."}` |
| 13 | Liệt kê lịch (10 dòng/trang) | `{"com":13,"fr":1,"pa":"..."}` |
| 14 | Luật ngưỡng cảm biến | `{"com":14,"id":1,"value":34671544,"pa":"..."}` |

Bản tin thiết bị: `{"se":2,"va":"<độ ẩm×100>,<nhiệt độ×100>,<ADC>","co":"<cổng>,<click>,<nút>,<đếm>","dht_valid":true,"sample":N}`,
telemetry `{"event":"system.status",...,"net":{...}}` mỗi 30 s, LoRa
`{"event":"lora.receive","data":"...","rssi":-80,"snr":9.25}`.

Thử nhanh qua LAN:

```bash
curl -X POST http://192.168.1.50/lan -H 'Content-Type: text/plain' \
     -d '{"data":{"com":2,"pa":"matkhau"}}'
curl "http://192.168.1.50/control?com=1&value=1&pa=matkhau"
curl http://192.168.1.50/update
curl http://192.168.1.50/lora                     # gói LoRa nhận cuối cùng
curl -X POST http://192.168.1.50/lora -d 'data=hello'
```

---

## 7. Lưu trữ (EEPROM trên NVS)

* Bố cục địa chỉ **giống hệt** bản gốc (`eeprom_layout.h`: Wi-Fi ở 1..98, MQTT
  227, CA 675, cert 1379, key 2147, HMAC 2403/2436, Ascon 2501, lịch 2831,
  on-timer 3055, countdown 3059, ngưỡng 3063; tổng 3071 byte).
* Ảnh 3071 byte nằm trong RAM; được lưu vào phân vùng `nvs` (namespace
  `eeprom`, blob `eeprom0`..`eeprom2`, mỗi blob ≤ 1 KB). Chỉ blob có byte thay
  đổi mới được ghi lại; mỗi blob ghi nguyên tử.
* Cài đặt tự động hoá (lịch, on-timer, countdown, ngưỡng) được trả lời "đã
  lưu" trước, rồi SystemTask ghi gộp tối đa 1 lần / 15 s (như bản gốc).
* **Không chuyển được dữ liệu** từ thiết bị đang chạy bản Arduino (EEPROM của
  Arduino nằm ở sector flash khác): sau khi nạp V1 lần đầu, thiết bị ở chế độ
  `setup_now` và cần cấp phát lại (mục 5).

---

## 8. Khác biệt hành vi cần biết

Những điểm khác (nhỏ) so với bản Arduino, do nền tảng:

1. **Độ phân giải thời gian 10 ms** (`millis()` theo tick FreeRTOS). Mọi
   timeout của firmware ≥ 25 ms nên không ảnh hưởng.
2. **Phút lịch đã chạy không lưu qua khởi động lại** — giống nhánh RTOS của
   bản gốc (chỉ bản NON-OS dùng RTC memory). Một lịch tuần có thể chạy lại nếu
   khởi động lại đúng trong phút của nó.
3. **JSON**: cJSON không phân biệt `1` và `1.0`, nên `{"value":1.0}` được chấp
   nhận như số nguyên (ArduinoJson từ chối). Độ sâu lồng nhau > 10 bị từ chối
   trước khi parse (chống tràn stack).
4. **HTTP**: tham số `plain` (thân thô) luôn có khi request có body, kể cả
   form-urlencoded. Trả lời luôn `Connection: close`.
5. **Wi-Fi**: SDK không có sự kiện "DHCP timeout"; trạng thái chờ IP dùng
   timeout `WIFI_DHCP_TIMEOUT_MS` (15 s) như bản gốc, và `IP_EVENT_STA_LOST_IP`
   được coi là mất lease.
6. **MQTT**: SUBACK bị từ chối (0x80) được ghi log cảnh báo (PubSubClient bỏ
   qua). Các mã `state=` giữ nguyên của PubSubClient (-4 timeout, -3 mất kết
   nối, -2 lỗi kết nối, 1..5 broker từ chối).
7. **LoRa**: SPI chạy bằng GPIO (~250 kbit/s); gói 255 byte mất vài ms.

---

## 9. Kiểm thử logic trên PC

Các header logic thuần chạy được trên máy tính (không cần SDK):

```bash
cd DeviceIOT8266_V1/tests
make            # g++ -std=c++14 ... && ./core_logic_test
```

Bộ test chép từ bản gốc (lịch, xung đột, PortArbiter, on-timer, countdown,
ngưỡng, mã hoá EEPROM). Chạy được nghĩa là logic nghiệp vụ vẫn y như cũ.

---

## 10. Gỡ lỗi

| Log | Nguyên nhân / cách xử lý |
|---|---|
| `[MQTT] CA certificate is missing or invalid` | Chưa chạy `/setup` hoặc PEM sai |
| `[MQTT] Client certificate/key must be ECDSA P-256 PEM` | Khoá không phải EC; tạo lại bằng script ECDSA |
| `[MQTT] Waiting for SNTP` (DEBUG) | Chưa có giờ; kiểm tra Internet / UDP 123 |
| `[Network] Broker host ... does not resolve` | DNS không phân giải được `mqtt_host` |
| `[MQTT] TLS handshake failed (-0x2700, verify flags 0x8)` | Chứng chỉ broker không do CA đã lưu ký (0x08 NOT_TRUSTED, 0x01 hết hạn, 0x04 sai tên miền) |
| `[MQTT] TLS handshake failed (-0x7280)` / `(-0x7780)` | Broker đóng kết nối / gửi alert: thường do broker không chấp nhận chứng chỉ client |
| `[MQTT] TLS setup failed (-0x7F00)` | Thiếu heap cho bộ đệm TLS: giảm `CONFIG_MBEDTLS_SSL_*_CONTENT_LEN` hoặc stack task |
| `[MQTT] Connect failed, state=5` | Broker từ chối quyền (ACL / clientId / chứng chỉ) |
| `[WDT] TaskX silent for ... ms` | Một task bị treo > 30 s; thiết bị tự khởi động lại |
| `[LoRa] Initialization failed` | Sai dây SPI/NSS/RESET hoặc module không phải SX127x |
| `[Sensor] DHT11 read failed` | Thiếu trở kéo lên, sai chân, DHT hỏng |

Heap trống được báo trong telemetry `heap_free_bytes`; nên còn > 10 KB khi đã
kết nối MQTT.

---

## 11. Ghi chú về việc biên dịch

Mã nguồn được viết theo API của ESP8266_RTOS_SDK v3.4 và **mọi API SDK đã được
đối chiếu với mã nguồn tag v3.4** (gpio, adc, esp_wifi/esp_event, tcpip_adapter,
NVS — blob tối đa 1984 byte, lwIP 2.1.3, cJSON 1.7.12, mbedTLS 2.16.5,
FreeRTOS 10.0.1 với stack tính bằng byte, khoá Kconfig). Tuy vậy firmware
**chưa được biên dịch thật** (máy viết code không có toolchain). Lưu ý: SDK
link newlib-nano nên không dùng `%lld`/`%f` trong `printf`. Khi build lần đầu,
nếu gặp lỗi, các chỗ phụ thuộc phiên bản SDK nhiều nhất là:

* tên sự kiện Wi-Fi / IP (`NetworkWifi.cpp`, cần `esp_event` kiểu v3.3+);
* `rom/ets_sys.h` / `ets_delay_us` (`DhtSensor.cpp`, `LoRaRadio.cpp`);
* các khoá Kconfig trong `sdkconfig.defaults` (khoá không tồn tại chỉ bị bỏ qua
  kèm cảnh báo);
* cờ `-std=gnu++14` trong `main/component.mk` / `main/CMakeLists.txt`.

Logic nghiệp vụ nằm trong các header chép nguyên từ bản gốc; chạy bộ test ở
mục 9 để xác nhận trên máy của bạn.
