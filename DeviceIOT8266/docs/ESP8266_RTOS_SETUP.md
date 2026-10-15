# Cài đặt ESP8266 RTOS SDK trên Windows

Tài liệu này hướng dẫn cài ESP8266 RTOS SDK native cho board NodeMCU ESP-12E/12F trên Windows. SDK này chạy FreeRTOS trên ESP8266, nhưng không phải Arduino core.

Firmware native hiện chỉ khởi tạo ADC trên chân A0/TOUT, đọc một mẫu mỗi giây và in giá trị thô ra UART. Wi-Fi, MQTT/TLS, OTA, PMS, DHT, nút, ngõ ra, LoRa và các task lấy mẫu tốc độ cao đã bị loại khỏi firmware này. Entry point Arduino cũ ở `DeviceIOT.ino` không còn được dùng; firmware native nằm ở `main/main.c`.

## 1. Phân biệt RTOS SDK và Arduino

Các file Arduino cũ trong thư mục dùng API như `WiFi.h`, `EEPROM`, `PubSubClient`, `DHT`, `PMS`, `SPI` và `LoRa`; chúng chỉ còn để tham khảo, không được build vào firmware native. Ứng dụng đang dùng là `main/main.c`, triển khai ADC bằng API của ESP8266 RTOS SDK và chạy trong FreeRTOS task.

ESP8266 là MCU một lõi. Dùng FreeRTOS không tạo thêm lõi xử lý, và tác vụ Wi-Fi/TLS vẫn dùng chung tài nguyên CPU và RAM với tác vụ ứng dụng. Không dùng `xTaskCreatePinnedToCore()` như ESP32; tạo tác vụ bằng `xTaskCreate()`.

## 2. Cài WSL2 và Ubuntu

Mở PowerShell với quyền Administrator và cài WSL2:

```powershell
wsl --install -d Ubuntu-22.04
```

Khởi động lại Windows nếu được yêu cầu, mở Ubuntu từ Start Menu và tạo tài khoản Linux.

## 3. Cài công cụ build

Trong terminal Ubuntu/WSL:

```bash
sudo apt update
sudo apt install -y git wget make flex bison gperf python3 python3-pip \
  python3-venv python3-serial cmake ninja-build ccache libncurses-dev \
  libffi-dev libssl-dev libusb-1.0-0
```

## 4. Tải SDK và cài toolchain

Dùng nhánh phát hành `release/v3.4` của SDK Espressif:

```bash
mkdir -p ~/esp
cd ~/esp
git clone --recursive --branch release/v3.4 \
  https://github.com/espressif/ESP8266_RTOS_SDK.git
cd ~/esp/ESP8266_RTOS_SDK
./install.sh
```

Mỗi terminal WSL mới cần nạp biến môi trường SDK:

```bash
cd ~/esp/ESP8266_RTOS_SDK
source ./export.sh
```

Kiểm tra toolchain:

```bash
xtensa-lx106-elf-gcc --version
make --version
```

Nếu lệnh `xtensa-lx106-elf-gcc` không được tìm thấy, kiểm tra lại `install.sh` và nạp lại `export.sh`.

## 5. Build firmware ADC

Trong terminal Ubuntu/WSL, sau khi nạp `export.sh`:

```bash
cd /mnt/e/ManagerProject/IOT_base1/DeviceIOT8266
make menuconfig
make -j"$(nproc)"
```

Trong `menuconfig`, cấu hình:

- `Serial flasher config` > `Default serial port`: chọn cổng serial của NodeMCU.
- `Serial flasher config` > `Flash size`: chọn đúng dung lượng flash trên module.
- `Component config` > `PHY` > `vdd33_const`: giữ chế độ đo TOUT bên ngoài (giá trị nhỏ hơn 255); tham khảo ghi chú calibration bên dưới.

Flash và xem giá trị ADC:

```bash
make flash
make monitor
```

Firmware in giá trị ADC thô khoảng mỗi giây. Nhấn `Ctrl+]` để thoát monitor.

## 6. Build thử ví dụ FreeRTOS (tùy chọn)

Build ví dụ `hello_world` đi kèm SDK trước khi chuyển firmware:

```bash
cd ~/esp/ESP8266_RTOS_SDK/examples/get-started/hello_world
make menuconfig
make -j"$(nproc)"
```

Trong `menuconfig`, chọn đúng cổng serial và cấu hình flash theo module ESP-12E/12F thực tế. Dung lượng flash có thể khác nhau theo board; không chọn 4 MB nếu chưa xác minh thông số module.

## 7. Kết nối cổng USB-serial từ WSL2 (tùy chọn)

Để flash/monitor trực tiếp trong WSL2, cài `usbipd-win` trên Windows. Sau đó, trong PowerShell:

```powershell
usbipd list
usbipd bind --busid <BUSID>
usbipd attach --wsl --busid <BUSID>
```

Thay `<BUSID>` bằng bus ID của bộ chuyển USB-serial nối với NodeMCU. Trong Ubuntu, xác nhận thiết bị xuất hiện:

```bash
ls /dev/ttyUSB* /dev/ttyACM*
```

Sau khi cấu hình đúng cổng serial trong `menuconfig`, flash và mở serial monitor:

```bash
make flash
make monitor
```

Thoát monitor bằng `Ctrl+]`. Nếu WSL2 không nhìn thấy cổng USB, có thể build trong WSL rồi flash bằng công cụ/IDE Windows tương thích với file firmware được tạo.

## 8. Ràng buộc ADC trên NodeMCU ESP-12E/12F

- ADC tích hợp ESP8266 chỉ có một ngõ vào TOUT, độ phân giải 10-bit. Ứng dụng hiện đọc giá trị thô (thường 0–1023), không quy đổi thành điện áp.
- Chip ESP8266 trực tiếp chỉ chịu được điện áp ADC tối đa khoảng 1.0 V. Nhiều board NodeMCU có cầu chia áp trên A0 để chấp nhận dải cao hơn, nhưng mạch và giới hạn phụ thuộc phiên bản board. Xác minh sơ đồ board trước khi nối tín hiệu; không đưa điện áp cao hơn giới hạn TOUT trực tiếp vào chip.
- Chế độ `ADC_READ_TOUT_MODE` cần `vdd33_const` nhỏ hơn 255. Giá trị hiệu chuẩn cụ thể phụ thuộc cách cấu hình tham chiếu/nguồn trên board.
- `adc_read_fast()` không được dùng trong task này vì SDK yêu cầu tắt Wi-Fi và interrupt trong khi lấy mẫu nhanh.
- Thư mục nguồn cũ vẫn còn để tham khảo, nhưng không được biên dịch vào ứng dụng native: `Makefile` dùng SDK và chỉ `main/main.c` là firmware hoạt động.

## 9. Tài liệu tham khảo

- [ESP8266 RTOS SDK - Get Started](https://docs.espressif.com/projects/esp8266-rtos-sdk/en/latest/get-started/index.html)
- [ESP8266 RTOS SDK - Toolchain for Linux](https://docs.espressif.com/projects/esp8266-rtos-sdk/en/latest/get-started/linux-setup.html)
- [ESP8266 RTOS SDK trên GitHub](https://github.com/espressif/ESP8266_RTOS_SDK)
