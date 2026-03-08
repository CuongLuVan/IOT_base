# 📁 File Structure & Quick Reference

## Cấu trúc dự án

```
IOT_base/
│
├── 📄 Build & Setup Files
│   ├── CMakeLists.txt          - CMake build config (nếu dùng CMake)
│   ├── build.ps1               - PowerShell build script
│   └── build/                  - Output folder (tạo sau khi compile)
│
├── 📚 Documentation
│   ├── readme.md               - Tài liệu toàn diện
│   ├── QUICKSTART.md          - Hướng dẫn nhanh (bắt đầu từ đây!)
│   ├── SETUP.md                - Cài đặt môi trường chi tiết
│   ├── HOW_TO_ADD_CHIP.md     - Hướng dẫn thêm chip mới
│   └── FILES_REFERENCE.md      - File này
│
├── 💾 Source Code
│   ├── main.cpp                - 6 ví dụ đầy đủ
│   ├── example_simple.cpp      - Ví dụ đơn giản (control 3 LED)
│   ├── example_mode_switching.cpp - Ví dụ chuyển đổi mode
│   │
│   └── gpio/
│       ├── VirtualGPIO.h       - Header file class
│       ├── VirtualGPIO.cpp     - Implementation (500+ lines)
│       └── ChipDefs.h          - Pin definitions (A0, A1, ...)
│
└── 📝 This file
```

---

## 📄 File Details

### 🎯 Entry Points (Bắt đầu từ đây)

#### 1️⃣ QUICKSTART.md **[← BẮT ĐẦU TỪ ĐÂY]**
- **Mục đích:** Hướng dẫn nhanh cho người mới
- **Độ dài:** 3-5 phút đọc
- **Nội dung:**
  - CÀI ĐẶT (3 bước)
  - BIÊN DỊCH & CHẠY (2 cách)
  - 6 ví dụ code nhanh
  - Workflow phát triển
- **Dành cho:** Người mới bắt đầu

#### 2️⃣ readme.md
- **Mục đích:** Tài liệu toàn diện
- **Độ dài:** 30+ phút đọc
- **Nội dung:**
  - Các tính năng chi tiết
  - API reference đầy đủ
  - FAQ & troubleshooting
  - Best practices
- **Dành cho:** Tìm hiểu sâu

#### 3️⃣ SETUP.md
- **Mục đích:** Cài đặt môi trường
- **Độ dài:** 10-15 phút
- **Nội dung:**
  - Cài MinGW64 (bước đầu)
  - Cài CMake (tuỳ chọn)
  - Cài VS Code extensions
  - Troubleshooting
- **Dành cho:** Lần đầu setup máy

#### 4️⃣ HOW_TO_ADD_CHIP.md
- **Mục đích:** Mở rộng cho chip mới
- **Độ dài:** 15-20 phút
- **Nội dung:**
  - Template thêm chip
  - Tùy chỉnh configurations
  - Advanced features (HAL)
  - Checklist
- **Dành cho:** Update chip mới

---

### 💾 Source Code Files

#### main.cpp
```
Chứa 6 ví dụ đầy đủ:
1. example_ESP32_LED() - Blink LED
2. example_STM32_MultiPin() - Multi-pin control
3. example_ESP8266_Analog() - ADC input
4. example_ModeSwitching() - Simulation ↔ Real
5. example_PinChangeCallback() - Interrupt callbacks
6. example_PWM_Control() - PWM brightness

Dùng cho: Test toàn bộ hệ thống
Cách chạy: ./app
```

#### example_simple.cpp
```
Ví dụ đơn giản:
- Control 3 LEDs theo sequence
- In kết quả lên terminal
- Dễ hiểu cho người mới

Dùng cho: Learning
Compile: g++ -std=c++17 -pthread example_simple.cpp gpio/VirtualGPIO.cpp -o simple_test
Chạy: ./simple_test
```

#### example_mode_switching.cpp
```
Ví dụ chi tiết về Mode Switching:
- Stage 1: Simulation mode
- Stage 2: Chuyển sang Real Hardware
- Stage 3: Quay lại Simulation
- Stage 4: So sánh multiple chips

Dùng cho: Hiểu kiến trúc
Compile: g++ -std=c++17 -pthread example_mode_switching.cpp gpio/VirtualGPIO.cpp -o mode_test
Chạy: ./mode_test
```

---

### 🔧 GPIO Library (core)

#### gpio/VirtualGPIO.h
```
Header file - khai báo class VirtualGPIO

Chứa:
- Enum ChipType (ESP32, ESP8266, STM32, MSP430, AVR)
- Struct ChipConfig (pin configuration)
- Struct Pin (pin state)
- Public API methods
- Private helper methods

Dòng: ~140 lines
```

#### gpio/VirtualGPIO.cpp
```
Implementation - định nghĩa chi tiết

Chứa:
- getChipConfig() - Cấu hình từng chip
- Constructor & setters
- pinMode(), digitalWrite(), digitalRead()
- analogWrite(), analogRead(), pwmWrite()
- simulateInput(), simulateAnalog()
- onPinChange() - Callbacks
- printChipInfo(), printPinStatus()

Dòng: ~500 lines
Độ phức tạp: Trung bình
```

#### gpio/ChipDefs.h
```
Pin definitions cho các chip

Chứa:
- A0, A1, ... A5 (AVR analog)
- D0, D1, ... D8 (ESP8266 digital)
- GPIO0, GPIO1, ... GPIO39 (ESP32)
- P0_0, P0_1, ... (nRF52840)
- PA0, PA1, ... PB0, ... (STM32)

Dùng: #include "ChipDefs.h" và sử dụng A0 thay cho 14
```

---

### 🏗️ Build Files

#### CMakeLists.txt
```
Cấu hình cmake

Chứa:
- C++ standard: C++17
- Source files
- Linking libraries (pthread)
- Compiler flags

Dùng: cmake -B build && cmake --build build
```

#### build.ps1
```
PowerShell build script

Chức năng:
- Check g++ installed
- Create build directory
- Compile source files
- Run executable
- Show output

Dùng: .\build.ps1
```

---

## 🚀 Dòng thời gian học tập

### Ngày 1: Setup & Basic
1. ✅ Đọc QUICKSTART.md (5 phút)
2. ✅ Cài đặt MinGW64 + PATH (10 phút)
3. ✅ Compile project (5 phút)
4. ✅ Chạy main.cpp (2 phút)
5. ✅ Đọc example_simple.cpp (5 phút)
**Thời gian: ~30 phút**

### Ngày 2: Understanding
1. ✅ Đọc readme.md (20 phút)
2. ✅ Chạy example_mode_switching.cpp (5 phút)
3. ✅ Chỉnh sửa main.cpp, thêm riêng code (15 phút)
4. ✅ Kiểm tra output trên terminal (5 phút)
**Thời gian: ~45 phút**

### Ngày 3+: Advanced
1. ✅ Đọc HOW_TO_ADD_CHIP.md (15 phút)
2. ✅ Thêm chip mới (ví dụ: stm32h7) (20 phút)
3. ✅ Test chip mới (10 phút)
4. ✅ Tạo ứng dụng của riêng bạn (30+ phút)

---

## 📋 Checklist: Trước khi sử dụng

- [ ] Đã cài MinGW64?
- [ ] Đã add `C:\msys64\mingw64\bin` vào PATH?
- [ ] Đã kiểm tra `g++ --version`?
- [ ] Đã compile project?
- [ ] Đã chạy main.exe thành công?
- [ ] Đã đọc QUICKSTART.md?

---

## 🎯 Năng suất

| Task | Thời gian | File |
|------|----------|------|
| Setup | 20 phút | SETUP.md |
| Bắt đầu | 5 phút | QUICKSTART.md |
| Blink LED | 3 phút | example_simple.cpp |
| Hiểu Mode | 10 phút | example_mode_switching.cpp |
| API ref | 20 phút | readme.md |
| Thêm chip | 20 phút | HOW_TO_ADD_CHIP.md |
| **Tổng cộng** | **~80 phút** | Tất cả |

---

## 🔗 File Dependencies

```
main.cpp
├── #include "gpio/VirtualGPIO.h"
│   ├── #include "ChipDefs.h"
│   └── VirtualGPIO.cpp
└── #include "gpio/ChipDefs.h"

example_simple.cpp
├── #include "gpio/VirtualGPIO.h"
└── #include "gpio/ChipDefs.h"

example_mode_switching.cpp
├── #include "gpio/VirtualGPIO.h"
└── #include "gpio/ChipDefs.h"

Compilation order:
1. Compile: gpio/VirtualGPIO.cpp → VirtualGPIO.o
2. Compile: main.cpp → main.o
3. Link: VirtualGPIO.o + main.o → app.exe
```

---

## 📊 Code Statistics

```
File                  Lines   Type        Purpose
────────────────────────────────────────────────────
VirtualGPIO.h         140      Header      API definition
VirtualGPIO.cpp       500      Source      Implementation
ChipDefs.h            50       Header      Pin definitions
main.cpp              250      Source      6 examples
example_simple.cpp    50       Source      Simple LED example
example_mode_switching.cpp 150 Source      Mode switching demo

Total: ~1140 lines of code
Complexity: Medium
Maintainability: High
```

---

## 🎁 Bonus Files & Scripts

### build.ps1
PowerShell script tự động:
- Check compiler
- Create folders
- Compile
- Execute

### CMakeLists.txt
CMake configuration:
- Automatic compilation
- Dependency management
- Cross-platform

---

## 🔄 Typical Workflows

### Workflow 1: Learning
```
1. Đọc QUICKSTART.md
2. Chạy main.cpp
3. Sửa example_simple.cpp
4. Compile lại
5. Xem output
```

### Workflow 2: Development
```
1. Viết code trong main.cpp
2. Compile: g++ ... -o app.exe
3. Chạy: .\app.exe
4. Kiểm tra terminal output
5. Lặp lại 1-4
```

### Workflow 3: Deployment
```
1. Code ở mode SIMULATION (test)
2. Thay setSimulationMode(false)
3. Compile
4. Upload lên board thực tế
5. Monitor GPIO
```

---

## 💡 Pro Tips

1. **Dùng build.ps1 để tiết kiệm thời gian**
   ```powershell
   .\build.ps1  # Compile + run tự động
   ```

2. **Redirect output để lưu logs**
   ```bash
   .\app.exe > output.log
   ```

3. **Dùng multiple cores khi compile**
   ```bash
   cmake --build build -j4
   ```

4. **Watch mode (rebuild tự động)**
   ```bash
   # Dùng WSL + watch
   watch -n 1 'make'
   ```

---

**Chúc bạn phát triển vui vẻ! 🚀**
