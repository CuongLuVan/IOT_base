# DeviceIOT8266_V1

Firmware DeviceIOT8266 viết lại cho **ESP8266_RTOS_SDK v3.4** (FreeRTOS,
esp_wifi, lwIP, mbedTLS, NVS, cJSON) — không dùng Arduino. Cùng chức năng,
giao thức MQTT/LAN, bố cục EEPROM và quy tắc với `../DeviceIOT8266`.

```bash
export IDF_PATH=~/esp/ESP8266_RTOS_SDK
make -j4 flash monitor ESPPORT=/dev/ttyUSB0
```

Hướng dẫn cài đặt SDK/toolchain trên Windows và Linux:
[docs/INSTALL_WINDOWS_LINUX.md](docs/INSTALL_WINDOWS_LINUX.md).

Hướng dẫn firmware (build, cấu hình, cấp phát, lệnh, gỡ lỗi):
[docs/HUONG_DAN.md](docs/HUONG_DAN.md).

```
DeviceIOT8266_V1/
├── CMakeLists.txt, Makefile, sdkconfig.defaults   dự án SDK
├── main/                                          toàn bộ mã nguồn firmware
├── tests/                                         unit test logic chạy trên PC
└── docs/HUONG_DAN.md                              hướng dẫn
```
