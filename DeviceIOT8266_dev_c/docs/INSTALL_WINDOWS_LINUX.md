# Cài đặt DeviceIOT8266_V1 trên Windows và Linux

Tài liệu này dành cho firmware trong `DeviceIOT8266_V1/`, viết cho **Espressif ESP8266_RTOS_SDK v3.4**, không phải firmware Arduino trong `DeviceIOT8266/`. Dùng SDK và toolchain đúng phiên bản để tránh sai khác API.

## 1. Thành phần cần cài

| Thành phần | Phiên bản / nguồn | Mục đích |
|---|---|---|
| ESP8266_RTOS_SDK | nhánh `release/v3.4` | Framework, hệ điều hành FreeRTOS, driver và thư viện nền |
| Xtensa LX106 GCC | 8.4.0 (`esp-2020r3`) | Biên dịch firmware cho ESP8266 |
| Git | phiên bản hiện hành | Clone SDK kèm submodule và quản lý mã nguồn |
| Python cùng các gói trong SDK | Cài qua `install.sh` trên Linux hoặc requirements trên MSYS2 | Công cụ cấu hình, nạp và monitor |
| GNU Make | đi cùng môi trường Linux/MSYS2 | Build, flash và monitor theo Makefile của dự án |

Các thư viện FreeRTOS, `esp_wifi`, `esp_event`, `tcpip_adapter`, lwIP, mbedTLS, NVS, cJSON và driver GPIO/ADC/SPI được lấy từ SDK. Dự án tự triển khai DHT11, SX127x/LoRa và MQTT; **không cài Arduino IDE, Arduino core, ArduinoJson, PubSubClient, Adafruit DHT hoặc thư viện LoRa Arduino** cho firmware này. Khai báo component nằm trong `main/CMakeLists.txt` và `main/component.mk`.

> Đường dẫn SDK và project không nên chứa dấu cách. Trên Windows, nên đặt project trong filesystem Linux của WSL (ví dụ `~/work/IOT_base`), không build từ `/mnt/c`.

## 2. Linux (Ubuntu/Debian 64-bit)

### 2.1 Cài công cụ hệ thống

```bash
sudo apt update
sudo apt install -y git wget flex bison gperf make cmake ninja-build \
  python3 python3-pip python3-venv ccache libncurses-dev libffi-dev \
  libssl-dev libusb-1.0-0
```

### 2.2 Cài SDK và toolchain

ESP8266_RTOS_SDK v3.4 có script cài toolchain và Python environment. Clone đúng nhánh, giữ submodule, rồi chạy script đó:

```bash
mkdir -p ~/esp
cd ~/esp
git clone --recursive --branch release/v3.4 \
  https://github.com/espressif/ESP8266_RTOS_SDK.git
cd ESP8266_RTOS_SDK
./install.sh
source ./export.sh
```

`source ./export.sh` cần chạy trong mỗi terminal mới trước khi build. Muốn tiện hơn, thêm dòng này vào `~/.bashrc`:

```bash
source "$HOME/esp/ESP8266_RTOS_SDK/export.sh"
```

Kiểm tra SDK và compiler:

```bash
echo "$IDF_PATH"
xtensa-lx106-elf-gcc --version
python --version
make --version
```

Compiler phải là GCC 8.4.0. Nếu `install.sh` không tải được toolchain, xem phần Linux trong hướng dẫn chính thức ESP8266_RTOS_SDK v3.4 để tải gói Linux 64-bit `xtensa-lx106-elf-gcc8_4_0-esp-2020r3` thủ công.

### 2.3 Build, nạp và xem log

Mở terminal đã nạp môi trường SDK, vào thư mục project:

```bash
cd ~/work/IOT_base/DeviceIOT8266_V1
make menuconfig
```

Trong menu, vào **Serial flasher config → Default serial port**, chọn cổng, lưu và thoát. Các mặc định trong `sdkconfig.defaults` đặt flash 4 MB, CPU 160 MHz và UART 115200; project này nhắm tới board ESP8266 có flash 4 MB.

Build và nạp (thay cổng theo máy):

```bash
make -j"$(nproc)" all
make flash ESPPORT=/dev/ttyUSB0
make monitor ESPPORT=/dev/ttyUSB0
```

Có thể gộp nạp và mở monitor:

```bash
make -j"$(nproc)" flash monitor ESPPORT=/dev/ttyUSB0
```

Thoát monitor bằng `Ctrl+]`. Cổng có thể là `/dev/ttyUSB0` hoặc `/dev/ttyACM0`. Nếu không có quyền truy cập cổng nối tiếp:

```bash
sudo usermod -aG dialout "$USER"
```

Đăng xuất/đăng nhập lại để nhóm có hiệu lực. Trên một số distro nhóm thiết bị có thể là `uucp` thay vì `dialout`.

## 3. Windows

### Cách khuyến nghị: WSL2 Ubuntu

WSL2 dùng cùng toolchain và quy trình Linux ở trên, tránh các khác biệt đường dẫn giữa Windows và GNU Make. Cài WSL2/Ubuntu, đặt mã nguồn trong filesystem WSL (ví dụ `~/work/IOT_base/DeviceIOT8266_V1`), sau đó làm theo mục **2.1–2.3**.

Để nạp board từ WSL2, cần chuyển USB serial từ Windows vào WSL bằng `usbipd-win`:

1. Cài `usbipd-win` trên Windows và mở PowerShell với quyền Administrator.
2. Xem thiết bị bằng `usbipd list`, bind rồi attach thiết bị theo BUSID:

   ```powershell
   usbipd list
   usbipd bind --busid <BUSID>
   usbipd attach --wsl --busid <BUSID>
   ```

3. Trong WSL, kiểm tra cổng bằng `ls /dev/ttyUSB* /dev/ttyACM*` rồi truyền cổng đó vào `ESPPORT` khi chạy `make flash`.

Tên thiết bị và yêu cầu quyền USB phụ thuộc phiên bản Windows/usbipd-win. Nếu WSL không nhận thiết bị, có thể build trong WSL và nạp từ Windows bằng công cụ nạp tương thích, hoặc dùng MSYS2 như mục dưới.

### Cài trực tiếp bằng MSYS2 MINGW32

ESP8266_RTOS_SDK v3.4 có hướng dẫn Windows dựa trên môi trường **MSYS2 MINGW32** và toolchain GCC 8.4.0. Đây là môi trường legacy của SDK; dùng WSL2 nếu gặp lỗi Python, đường dẫn hoặc cổng serial.

1. Tải gói môi trường Windows all-in-one được tài liệu SDK chỉ định: [MSYS2/toolchain environment](https://dl.espressif.com/dl/esp32_win32_msys2_environment_and_toolchain-20181001.zip). Giải nén theo hướng dẫn SDK (thường tạo `C:\msys32`) và mở `mingw32.exe`.
2. Tải [Xtensa LX106 GCC 8.4.0 cho Windows](https://dl.espressif.com/dl/xtensa-lx106-elf-gcc8_4_0-esp-2020r3-win32.zip), giải nén vào `C:\msys32\opt\` sao cho thư mục `xtensa-lx106-elf\bin` nằm dưới đó.
3. Trong cửa sổ MINGW32, cài/kiểm tra `git`, `make`, `python` và `pip`. Clone SDK và cài các gói Python:

   ```bash
   mkdir -p ~/esp
   cd ~/esp
   git clone --recursive --branch release/v3.4 \
     https://github.com/espressif/ESP8266_RTOS_SDK.git
   export IDF_PATH="$HOME/esp/ESP8266_RTOS_SDK"
   export PATH="/opt/xtensa-lx106-elf/bin:$PATH"
   python -m pip install --user -r "$IDF_PATH/requirements.txt"
   ```

4. Kiểm tra `xtensa-lx106-elf-gcc --version`; phải là GCC 8.4.0. Đặt biến `IDF_PATH` và PATH ở profile của MINGW32 để không phải nhập lại mỗi lần mở terminal.
5. Clone project vào đường dẫn không có dấu cách. Trong MINGW32, vào `DeviceIOT8266_V1`, chạy `make menuconfig`, chọn cổng nối tiếp dạng `COM3`, sau đó build/nạp:

   ```bash
   make -j4 all
   make flash ESPPORT=COM3
   make monitor ESPPORT=COM3
   ```

Cài driver USB-to-serial theo chip trên board (thường CH340 hoặc CP210x) nếu Windows chưa nhận cổng COM. Cổng COM phải được giải phóng khỏi Serial Monitor/IDE khác trước khi nạp.

## 4. Thư viện đi kèm và cách thêm thư viện ngoài

Firmware không dùng thư viện Arduino. Các thư viện nền được cung cấp bởi `ESP8266_RTOS_SDK` v3.4; không tải riêng từng thư viện này. Dự án cũng không có `EXTRA_COMPONENT_DIRS` hoặc component ngoài trong cấu hình mặc định.

Các module giao thức/thiết bị được viết trong `main/`, gồm `MqttClient.*`, `DhtSensor.*`, `LoRaRadio.*`, `JsonUtil.*` và các module điều khiển. Nếu cần thêm component ngoài, đặt component đó theo cơ chế component của SDK, cập nhật `main/CMakeLists.txt`/`main/component.mk` và thêm cấu hình cần thiết vào `sdkconfig.defaults`; kiểm tra cả build Make và CMake nếu muốn hỗ trợ hai hệ build.

## 5. Test logic thuần trên máy tính

Bộ test trong `tests/` không cần SDK hay board. Nó cần GNU Make và compiler C++14 (`g++` hoặc `clang++`):

```bash
make -C tests test
```

Trên Windows, chạy lệnh trong MINGW32/MSYS2 có `g++` và `make`.

## 6. Lưu ý dự án

- `sdkconfig.defaults` chỉ áp dụng khi SDK tạo cấu hình ban đầu. Nếu sửa file này sau khi đã có `sdkconfig`, sao lưu rồi xóa `sdkconfig` để tạo lại cấu hình mặc định.
- `make erase_flash` xóa toàn bộ flash cấu hình của thiết bị, gồm Wi-Fi, chứng chỉ và lịch. Chỉ dùng khi muốn xóa dữ liệu thiết bị.
- Board mặc định là flash 4 MB; kiểm tra đúng dung lượng flash và sơ đồ chân trong `main/board_pins.h` trước khi nối phần cứng.
- Tài liệu [HUONG_DAN.md](HUONG_DAN.md) có cấu hình MQTT/TLS, chân kết nối, quy trình cấp phát thiết bị và xử lý lỗi.
- Theo ghi chú trong `HUONG_DAN.md`, firmware đã được đối chiếu API với SDK v3.4 nhưng **chưa được biên dịch thật bằng toolchain**. Vì vậy lần build đầu có thể phát hiện lỗi tương thích cần xử lý trước khi nạp phần cứng.

## Tài liệu tham khảo

- [ESP8266_RTOS_SDK v3.4 Programming Guide](https://docs.espressif.com/projects/esp8266-rtos-sdk/en/v3.4/index.html)
- [Cài toolchain Linux của Espressif](https://github.com/espressif/ESP8266_RTOS_SDK/blob/release/v3.4/docs/en/get-started/linux-setup.rst)
- [Cài toolchain Windows của Espressif](https://docs.espressif.com/projects/esp8266-rtos-sdk/en/v3.4/get-started/windows-setup.html)
