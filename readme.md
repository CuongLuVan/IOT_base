# GPIO Simulator - Hệ thống Giả lập Pin cho Embedded Systems

## 📋 Mô tả

Hệ thống này cho phép **mô phỏng chân pin (GPIO) của các chip**:
- **ESP32** - IoT MCU
- **ESP8266** - Wi-Fi enabled MCU  
- **STM32** - ARM Cortex-M MCU
- **MSP430** - Ultra-low power MCU
- **AVR** - Arduino-compatible MCU

### Tính năng chính

✅ **Giả lập Digital I/O** - HIGH/LOW pin states  
✅ **Giả lập Analog Input** - ADC readings  
✅ **Hỗ trợ PWM** - Brightness control, motor speed  
✅ **Hiển thị trên Terminal** - Theo dõi thay đổi pin real-time  
✅ **Chuyển đổi Simulation ↔ Real Hardware** - Cùng code cho cả 2 chế độ  
✅ **Pin Change Callbacks** - Phản ứng khi pin thay đổi  
✅ **Thread-safe** - Mutex protection cho concurrent access  

---

## ⚙️ Cài đặt môi trường (Windows)

### BƯỚC 1 – Cài MSYS2 + GCC

**Tải MSYS2:**
https://www.msys2.org/

**Mở MSYS2 MINGW64 terminal, cài GCC:**
```bash
pacman -S mingw-w64-x86_64-gcc
```

**Kiểm tra:**
```bash
g++ --version
```

**Thêm vào PATH:**
```
C:\msys64\mingw64\bin
```

### BƯỚC 2 – Cài CMake

**Tải:**
https://cmake.org/download/

**Nhớ tick:** Add CMake to system PATH

**Kiểm tra:**
```bash
cmake --version
```

### BƯỚC 3 – Cài Extension VSCode

1. Mở VSCode → Extensions (Ctrl+Shift+X)
2. Cài: **CMake Tools** (Microsoft)
3. Cài: **C/C++ IntelliSense** (Microsoft)

---

## 🚀 Quick Start

### Compile & Run

**Mở terminal MSYS2 MinGW64, gõ:**

```bash
cd /e/ManagerProject/IOT_base
cmake -B build -G "MinGW Makefiles"
cmake --build build
./build/app.exe
```

---

## 💻 Cách Sử Dụng

### Ví dụ 1: Blink LED trên ESP32 (Simulation Mode)

```cpp
#include "gpio/VirtualGPIO.h"

int main() {
    // Khởi tạo với chế độ SIMULATION
    VirtualGPIO board(ESP32, true);  // true = simulation
    
    // Cấu hình pin
    board.pinMode(2, OUTPUT);  // LED pin
    
    // Blink LED
    board.digitalWrite(2, HIGH);  // Terminal sẽ hiển thị: Pin 2 = HIGH
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    board.digitalWrite(2, LOW);   // Terminal sẽ hiển thị: Pin 2 = LOW
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    
    return 0;
}
```

**Output trên terminal:**
```
=== GPIO Simulator Initialized ===
Chip: ESP32
Mode: SIMULATION
=====================================

[ESP32 SIM] Pin 2 -> OUTPUT
[ESP32 SIM] Pin 2 = HIGH (1)
[ESP32 SIM] Pin 2 = LOW (0)
```

---

### Ví dụ 2: Đọc Input Pin (Button)

```cpp
VirtualGPIO board(AVR, true);

board.pinMode(8, INPUT);

// Mô phỏng button được nhấn từ bên ngoài
board.simulateInput(8, HIGH);

int buttonState = board.digitalRead(8);
if (buttonState == HIGH) {
    std::cout << "Button pressed!\n";
}
```

**Output:**
```
[AVR EXT] Pin 8 changed to HIGH (1)
Button pressed!
```

---

### Ví dụ 3: Chuyển đổi Simulation ↔ Real Hardware

```cpp
VirtualGPIO board(STM32, true);  // Bắt đầu ở chế độ SIMULATION

board.pinMode(0, OUTPUT);

// Chạy code simulation
board.digitalWrite(0, HIGH);  // [STM32 SIM] Pin 0 = HIGH

// === Chuyển sang REAL HARDWARE ===
board.setSimulationMode(false);

// Cùng code, nhưng giờ nó gọi real hardware
board.digitalWrite(0, HIGH);  // [STM32 HW] Pin 0 = HIGH [REAL]
```

**Lợi ích:**
- ✅ Phát triển trên máy tính (simulation)
- ✅ Sau đó load lên board thực tế (real hardware)
- ✅ Không cần thay đổi code

---

### Ví dụ 4: PWM Control (Điều chỉnh độ sáng LED)

```cpp
VirtualGPIO board(ESP32, true);

board.pinMode(3, PWM);

// Điều chỉnh brightness từ 0-255
for (int brightness = 0; brightness <= 255; brightness += 32) {
    board.analogWrite(3, brightness);
    // Output: [ESP32 SIM] Pin 3 PWM = 100 (duty: 39%)
}
```

---

### Ví dụ 5: Đọc Analog Sensor (ADC)

```cpp
VirtualGPIO board(ESP8266, true);

board.pinMode(A0, ANALOG);  // A0 = Analog pin 0

// Mô phỏng sensor value thay đổi
for (int i = 0; i < 1024; i += 256) {
    board.simulateAnalog(A0, i);
    int reading = board.analogRead(A0);
    std::cout << "Sensor: " << reading << "\n";
}
```

---

### Ví dụ 6: Pin Change Callback

```cpp
VirtualGPIO board(MSP430, true);

board.pinMode(5, INPUT);

// Đăng ký callback khi pin thay đổi
board.onPinChange(5, [](int pin, int value) {
    std::cout << "[INTERRUPT] Pin " << pin << " = " 
              << (value ? "HIGH" : "LOW") << "\n";
});

// Khi pin thay đổi, callback sẽ được gọi tự động
board.simulateInput(5, HIGH);  // [INTERRUPT] Pin 5 = HIGH
```

---

## 📦 Cấu trúc Dự án

```
IOT_base/
├── main.cpp                    # Ví dụ sử dụng
├── CMakeLists.txt             # Build configuration
├── readme.md                  # Tài liệu này
└── gpio/
    ├── VirtualGPIO.h          # Header file
    ├── VirtualGPIO.cpp        # Implementation
    └── ChipDefs.h             # Pin definition constants
```

---

## 🔧 API Reference

### Task-based Architecture & RTOS Support

The project now includes a simple task framework (`Task`, `TaskSensor`, `TaskDevice`, `TaskNetwork`) that
can run either in separate threads (RTOS-style) or cooperatively in a single loop. Control the behavior using the macro
in `Config.h`:

```cpp
#define SUPPORT_RTOS 1   // use std::thread per task
// or
#define SUPPORT_RTOS 0   // run tasks sequentially via runOnce()
```

Each task is implemented as a class; see `TaskSensor`, `TaskDevice`, `TaskNetwork`.

- `TaskSensor` collects simulated or hardware sensor data (temperature, humidity, light).
- `TaskDevice` makes decisions (open/close curtain motor) based on sensor readings.
- `TaskNetwork` publishes states via MQTT/UART (simulated or stubbed).

The `main.cpp` example demonstrates creating these tasks and running them.

### Sensor Data Collection

Sensor values are read from analog pins (A0, A1, A2) in real mode or generated randomly in simulation mode. The
`SensorData` struct holds `temperature`, `humidity`, and `light` values.

### Device Control

The curtain motor is controlled by toggling a digital pin (pin 10 by default). `TaskDevice` opens the curtain when
light > 800 or temperature > 30°C and closes otherwise. The task prints actions to the terminal.

### Network & MQTT/UART

`TaskNetwork` periodically sends the latest sensor readings via MQTT and UART. In simulation mode the messages are
printed with `[MQTT SIM]` / `[UART SIM]`; in real hardware mode the prefix becomes `[MQTT HW]` / `[UART HW]` and
actual communication code could be added.

```cpp
// example send
network.sendMQTT("sensors/room", "temp=25,hum=50,light=600");
```



## 🔧 API Reference

### Khởi tạo

```cpp
// Bằng tên chip (string)
VirtualGPIO board("ESP32", true);     // true = simulation mode
VirtualGPIO board("STM32", false);    // false = real hardware mode

// Bằng enum chip type
VirtualGPIO board(ESP32, true);
VirtualGPIO board(ESP8266, true);
VirtualGPIO board(STM32, true);
VirtualGPIO board(MSP430, true);
VirtualGPIO board(AVR, true);
```

### Digital I/O

```cpp
// Cấu hình pin
board.pinMode(pin, mode);
// mode: INPUT, OUTPUT, INPUT_PULLUP, INPUT_PULLDOWN, ANALOG, PWM

// Ghi giá trị digital
board.digitalWrite(pin, value);       // value: HIGH hoặc LOW

// Đọc giá trị digital
int state = board.digitalRead(pin);   // return: HIGH hoặc LOW
```

### Analog I/O

```cpp
// Ghi PWM (0-255)
board.analogWrite(pin, value);        // PWM/DAC output

// Đọc ADC (0-1023 hoặc 0-4095)
int reading = board.analogRead(pin);
```

### PWM Control

```cpp
// PWM với tần số custom
board.pwmWrite(pin, value, frequency);
// value: 0-255, frequency: Hz
```

### Simulation Functions

```cpp
// Mô phỏng external digital signal
board.simulateInput(pin, value);      // value: HIGH hoặc LOW

// Mô phỏng external analog signal (sensor)
board.simulateAnalog(pin, value);     // value: 0-1023
```

### Mode Control

```cpp
// Chuyển sang simulation mode
board.setSimulationMode(true);

// Chuyển sang real hardware mode
board.setSimulationMode(false);

// Kiểm tra chế độ hiện tại
if (board.isSimulationMode()) { /* ... */ }
```

### Debugging

```cpp
// Hiển thị thông tin chip
board.printChipInfo();

// Hiển thị trạng thái tất cả pin
board.printPinStatus();

// Lấy tên chip
std::string name = board.getChipName();
```

---

## 🎯 Hỗ trợ Chip

### ESP32
- **Tổng pins:** 40
- **Digital:** 21 pins
- **Analog:** 8 ADC pins (32, 33, 34-39)
- **PWM:** 16 channels
- **Max ADC:** 4095

### ESP8266
- **Tổng pins:** 11
- **Digital:** 11 pins
- **Analog:** 1 ADC pin (A0)
- **PWM:** 10 channels
- **Max ADC:** 1023

### STM32
- **Tổng pins:** 100+ (tùy package)
- **Digital:** Tất cả
- **Analog:** 16 ADC channels
- **PWM:** 16 channels
- **Max ADC:** 4095
- **PWM Res:** 12-bit

### MSP430
- **Tổng pins:** 20
- **Digital:** 16 pins
- **Analog:** 8 ADC channels
- **PWM:** 6 channels
- **Max ADC:** 1023

### AVR (Arduino)
- **Tổng pins:** 20
- **Digital:** 20 pins (D0-D13, A0-A5)
- **Analog:** 6 ADC pins (A0-A5)
- **PWM:** 6 channels (D3, D5, D6, D9, D10, D11)
- **Max ADC:** 1023

---

## 🔐 Thread Safety

Tất cả pin operations đều được protect bởi `std::mutex`. An toàn để gọi từ multiple threads:

```cpp
std::thread t1([&]() {
    board.digitalWrite(0, HIGH);
});

std::thread t2([&]() {
    int val = board.digitalRead(0);
});

t1.join();
t2.join();
```

---

## 🎓 Quy trình phát triển

### Bước 1: Giả lập trên máy tính (Simulation)
```cpp
VirtualGPIO board(ESP32, true);  // true = simulation
board.pinMode(2, OUTPUT);
board.digitalWrite(2, HIGH);
```

### Bước 2: Test với terminal output
- Code chạy, terminal hiển thị: `[ESP32 SIM] Pin 2 = HIGH`
- Kiểm tra logic có đúng không

### Bước 3: Deploy lên hardware thực tế
```cpp
VirtualGPIO board(ESP32, false);  // false = real hardware
// Cùng code, nhưng giờ gọi GPIO driver thực tế
```

### Bước 4: Tắt simulation code (optional)
Khi hoàn toàn chuyển sang hardware, có thể xóa VirtualGPIO class và gọi hardware API trực tiếp.

---

## 🚀 Future Enhancements

- [ ] UART/Serial communication
- [ ] I2C/SPI simulation
- [ ] Timer/Counter simulation
- [ ] Interrupt handling (EXTI)
- [ ] ADC DMA support
- [ ] RTOS integration
- [ ] Web UI dashboard
- [ ] Data logging to file

---

## ❓ FAQ

**Q: Làm sao để chuyển từ simulation sang real hardware?**
```cpp
board.setSimulationMode(false);  // Bỏ simulation mode
// Giờ gọi hardware driver thực tế thay vì terminal output
```

**Q: Chip của tôi không được hỗ trợ?**
- Thêm chip type vào `ChipType` enum trong `VirtualGPIO.h`
- Thêm configuration vào function `getChipConfig()`
- Nạp chip definitions vào `ChipDefs.h`

**Q: Làm sao để compile trên Linux/Mac?**
```bash
cmake -B build -G "Unix Makefiles"
cmake --build build
./build/app
```

---

## 📝 License

MIT License - Tự do sử dụng và chỉnh sửa

---

**Happy Embedded Development! 🎉**