# 🎯 GPIO SIMULATOR - QUICK START GUIDE

## 📌 Dự án của bạn là gì?

Hệ thống **giả lập pin (GPIO)** cho các microcontroller nổi tiếng:
- **ESP32** - Chip WiFi + Bluetooth
- **ESP8266** - Chip WiFi nhỏ gọn
- **STM32** - ARM Cortex-M (công nghiệp)
- **MSP430** - Công suất siêu thấp
- **AVR** - Arduino controller

**Tính năng:**
✅ Mô phỏng pin trên **terminal** (không cần hardware)
✅ **Chuyển đổi dễ dàng** giữa mode giả lập và thực tế
✅ Arduino-style code: `digitalWrite()`, `digitalRead()`, `analogWrite()`
✅ Hỗ trợ **PWM**, **ADC**, **Callbacks**

---

## 🚀 CÀI ĐẶT (5 PHÚT)

### Bước 1: Cài đặt Compiler
Tải **MinGW64** từ: https://www.msys2.org/
```bash
# Trong MSYS2 MINGW64 terminal
pacman -S mingw-w64-x86_64-gcc
```

### Bước 2: Thêm vào PATH
Thêm `C:\msys64\mingw64\bin` vào Windows Environment PATH

### Bước 3: Kiểm tra
```bash
g++ --version
```

---

## 💻 BIÊN DỊCH & CHẠY (2 LỰA CHỌN)

### Lựa chọn A: Dùng build script (Đơn giản)
```powershell
cd e:\ManagerProject\IOT_base
powershell -ExecutionPolicy Bypass -File build.ps1
```

### Lựa chọn B: Compile thủ công
```bash
cd e:\ManagerProject\IOT_base
g++ -std=c++17 -Wall -Wextra -pthread -o app.exe main.cpp gpio/VirtualGPIO.cpp
./app.exe
```

---

## 📚 CẤU TRÚC DỰ ÁN

```
IOT_base/
├── main.cpp                    # 6 ví dụ đầy đủ
├── example_simple.cpp          # Ví dụ đơn giản (LED 3 trạng thái)
├── readme.md                   # Tài liệu chi tiết
├── SETUP.md                    # Hướng dẫn cài đặt
├── QUICKSTART.md               # File này
├── build.ps1                   # Script build automation
└── gpio/
    ├── VirtualGPIO.h           # Header file
    ├── VirtualGPIO.cpp         # Implementation (500+ lines)
    └── ChipDefs.h              # Pin definitions
```

---

## 💡 VÍ DỤ SỬ DỤNG

### Ví dụ 1: Blink LED trên ESP32

```cpp
#include "gpio/VirtualGPIO.h"

int main() {
    VirtualGPIO board(ESP32, true);  // true = simulation
    
    board.pinMode(2, OUTPUT);
    
    board.digitalWrite(2, HIGH);  // Terminal: [ESP32 SIM] Pin 2 = HIGH (1)
    delay(500);
    
    board.digitalWrite(2, LOW);   // Terminal: [ESP32 SIM] Pin 2 = LOW (0)
    delay(500);
    
    return 0;
}
```

### Ví dụ 2: Chuyển đổi Simulation ↔ Real Hardware

```cpp
VirtualGPIO board(ESP32, true);   // Bắt đầu: SIMULATION

board.digitalWrite(2, HIGH);  // [ESP32 SIM] Pin 2 = HIGH

// === Chuyển sang REAL HARDWARE ===
board.setSimulationMode(false);

board.digitalWrite(2, HIGH);  // [ESP32 HW] Pin 2 = HIGH [REAL]

// Cùng code, nhưng giờ gọi GPIO driver thực tế!
```

### Ví dụ 3: Đọc Button Input

```cpp
board.pinMode(5, INPUT);

// Mô phỏng button được nhấn
board.simulateInput(5, HIGH);

int state = board.digitalRead(5);
if (state == HIGH) {
    std::cout << "Button pressed!\n";
}
```

### Ví dụ 4: PWM (Điều chỉnh độ sáng)

```cpp
board.pinMode(3, PWM);

for (int brightness = 0; brightness <= 255; brightness += 10) {
    board.analogWrite(3, brightness);
    // Terminal: [ESP32 SIM] Pin 3 PWM = 100 (duty: 39%)
}
```

### Ví dụ 5: Đọc cảm biến ADC

```cpp
board.pinMode(A0, ANALOG);

for (int i = 0; i < 1024; i += 256) {
    board.simulateAnalog(A0, i);
    int reading = board.analogRead(A0);
}
```

### Ví dụ 6: Pin Change Callback

```cpp
board.onPinChange(5, [](int pin, int value) {
    std::cout << "Pin " << pin << " = " << value << "\n";
});

board.simulateInput(5, HIGH);  // Tự động gọi callback
```

---

## 🎨 API CHÍNH

| Hàm | Mô tả |
|-----|-------|
| `pinMode(pin, mode)` | Cấu hình pin (INPUT, OUTPUT, PWM, ANALOG) |
| `digitalWrite(pin, value)` | Ghi HIGH/LOW |
| `digitalRead(pin)` | Đọc HIGH/LOW |
| `analogWrite(pin, value)` | PWM (0-255) |
| `analogRead(pin)` | ADC (0-1023) |
| `simulateInput(pin, value)` | Mô phỏng external signal |
| `simulateAnalog(pin, value)` | Mô phỏng sensor |
| `setSimulationMode(bool)` | Chuyển đổi simulation/real |
| `onPinChange(pin, callback)` | Đăng ký callback |

---

## 🔌 Hỗ trợ Chip

```
ESP32:    40 pins | 21 digital | 8 ADC | PWM 16ch | Max ADC: 4095
ESP8266:  11 pins | 11 digital | 1 ADC | PWM 10ch | Max ADC: 1023
STM32:   100 pins | 100 digital| 16 ADC| PWM 16ch | Max ADC: 4095
MSP430:   20 pins | 16 digital | 8 ADC | PWM 6ch  | Max ADC: 1023
AVR:      20 pins | 20 digital | 6 ADC | PWM 6ch  | Max ADC: 1023
```

---

## 🎯 Workflow Phát triển

```
1. Viết code C/C++ (Arduino-style)
   ↓
2. Chạy trên máy tính (simulation mode)
   Terminal hiển thị pin thay đổi
   ↓
3. Test logic có đúng không?
   ↓
4. Chuyển sang real hardware (real mode)
   ↓
5. Upload lên board thực tế
   (Hoặc xóa VirtualGPIO, dùng HAL thực tế)
```

---

## 🐛 Khắc phục lỗi

| Lỗi | Giải pháp |
|-----|-----------|
| `g++ command not found` | Cài MinGW64 + thêm vào PATH |
| `Cannot find VirtualGPIO.h` | Kiểm tra path file, compiler chạy ở đúng folder |
| `Compilation error: undefined reference` | Đảm bảo compile cả `gpio/VirtualGPIO.cpp` |
| Output không hiển thị | Chạy với `> output.txt` để redirect output |

---

## 📖 Tài liệu đầy đủ

- **readme.md** - Tài liệu toàn diện (API, ví dụ, FAQ)
- **SETUP.md** - Hướng dẫn cài đặt môi trường chi tiết
- **main.cpp** - 6 ví dụ đầy đủ
- **example_simple.cpp** - Ví dụ đơn giản (control 3 LED)

---

## 🚀 Bước tiếp theo

1. ✅ **Cài đặt** MinGW64 (SETUP.md)
2. ✅ **Compile** project (build.ps1 hoặc lệnh g++)
3. ✅ **Chạy** main.cpp hoặc example_simple.cpp
4. ✅ **Xem** output trên terminal
5. ✅ **Tạo** ứng dụng của bạn
6. ✅ **Deploy** lên hardware thực tế

---

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra đã cài g++ chưa: `g++ --version`
2. Kiểm tra đã thêm vào PATH chưa
3. Xem lại SETUP.md
4. Chụp error message

---

**Happy Coding! 🎉**

Bạn đã có một hệ thống hoàn chỉnh để phát triển embedded system!
