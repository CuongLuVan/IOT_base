# 🎯 GPIO SIMULATOR PROJECT - INDEX

## 🎉 Chào mừng!

Bạn đã có một **hệ thống giả lập GPIO hoàn chỉnh** cho các chip microcontroller:
- **ESP32** (IoT)
- **ESP8266** (WiFi)
- **STM32** (ARM Industrial)
- **MSP430** (Low-power)
- **AVR** (Arduino)

---

## ⚡ Quick Links

| Bạn muốn... | Đọc file | Thời gian |
|------------|---------|----------|
| **Bắt đầu nhanh** | [QUICKSTART.md](QUICKSTART.md) | 5 phút |
| **Cài đặt môi trường** | [SETUP.md](SETUP.md) | 15 phút |
| **Hiểu chi tiết** | [readme.md](readme.md) | 30 phút |
| **Xem code examples** | [main.cpp](main.cpp) | 10 phút |
| **Thêm chip mới** | [HOW_TO_ADD_CHIP.md](HOW_TO_ADD_CHIP.md) | 20 phút |
| **Hiểu cấu trúc file** | [FILES_REFERENCE.md](FILES_REFERENCE.md) | 5 phút |

---

## 🚀 3 BƯỚC ĐÃ LÀM XONG

✅ **Bước 1: Cấu hình GPIO class**
- Arduino-style API (`digitalWrite`, `analogWrite`, etc.)
- Hỗ trợ 5 chip loại
- Thread-safe design

✅ **Bước 2: Simulation mode**
- In kết quả lên terminal
- Dễ debug trên máy tính
- Không cần hardware

✅ **Bước 3: Real Hardware switch**
- Cùng code cho simulation + real
- Chỉ cần 1 dòng để chuyển mode
- Sẵn sàng deploy

---

## 📚 Tài liệu

### Cho Người Mới

1. **[QUICKSTART.md](QUICKSTART.md)** ← **BẮT ĐẦU TỪ ĐÂY**
   - Setup compiler (MinGW)
   - Compile project
   - Chạy ví dụ
   - Dành cho: người mới

2. **[example_simple.cpp](example_simple.cpp)**
   - Control 3 LEDs theo sequence
   - Terminal output rõ ràng
   - Dễ sửa đổi

### Cho Người Phát Triển

3. **[readme.md](readme.md)**
   - API reference đầy đủ
   - 6 ví dụ chi tiết
   - Troubleshooting & FAQ
   - Dành cho: developer

4. **[main.cpp](main.cpp)**
   - 6 ví dụ hoàn chỉnh
   - Tất cả các chip
   - Tất cả tính năng

5. **[example_mode_switching.cpp](example_mode_switching.cpp)**
   - Hiểu architecture
   - Simulation ↔ Real Hardware
   - 4 stages demo

### Cho Lập Trình Viên Nâng Cao

6. **[HOW_TO_ADD_CHIP.md](HOW_TO_ADD_CHIP.md)**
   - Thêm chip mới
   - Tùy chỉnh configuration
   - HAL abstraction layer

7. **[FILES_REFERENCE.md](FILES_REFERENCE.md)**
   - Cấu trúc dự án
   - File descriptions
   - Code statistics

---

## 🛠️ Hướng dẫn cài đặt

### Lần đầu?
1. Đọc: **[SETUP.md](SETUP.md)** (15 phút)
   - Cài MinGW64
   - Cài CMake (optional)
   - Setup Visual Studio Code
2. Đọc: **[QUICKSTART.md](QUICKSTART.md)** (5 phút)
3. Chạy: `.\build.ps1`

---

## 💻 Cách sử dụng

### Compile & Run (Tự động)
```powershell
cd e:\ManagerProject\IOT_base
powershell -ExecutionPolicy Bypass -File build.ps1
```

### Compile & Run (Manual)
```bash
cd e:\ManagerProject\IOT_base
g++ -std=c++17 -Wall -Wextra -pthread -o app.exe main.cpp gpio/VirtualGPIO.cpp
./app.exe
```

### Compile ví dụ đơn giản
```bash
g++ -std=c++17 -pthread example_simple.cpp gpio/VirtualGPIO.cpp -o simple_test
./simple_test
```

---

## 📁 Cấu trúc

```
IOT_base/
├── 📖 Documentation
│   ├── INDEX.md                  ← Bạn đang đọc
│   ├── QUICKSTART.md             ← Bắt đầu từ đây!
│   ├── readme.md
│   ├── SETUP.md
│   ├── FILES_REFERENCE.md
│   └── HOW_TO_ADD_CHIP.md
│
├── 💾 Source Code
│   ├── main.cpp (6 examples)
│   ├── example_simple.cpp
│   ├── example_mode_switching.cpp
│   └── gpio/
│       ├── VirtualGPIO.h
│       ├── VirtualGPIO.cpp
│       └── ChipDefs.h
│
└── 🏗️ Build Scripts
    ├── build.ps1
    ├── CMakeLists.txt
    └── build/ (generated)
```

---

## 🎯 Mục tiêu của dự án

✅ **Simulation:**
- Phát triển nhanh trên máy tính
- Không cần hardware
- Terminal output để debug

✅ **Mode switching:**
- Cùng code cho 2 chế độ
- Chuyển Simulation → Real Hardware dễ dàng
- Không cần rewrite

✅ **Multi-chip support:**
- Hỗ trợ 5 chip khác nhau
- Dễ thêm chip mới
- Cấu hình custom cho từng chip

✅ **Arduino-style API:**
- `digitalWrite()`, `digitalRead()`
- `analogWrite()`, `analogRead()`
- `pinMode()` - quen thuộc với Arduino user

---

## 📊 Tính năng

| Tính năng | Hỗ trợ | Chi tiết |
|----------|--------|---------|
| Digital I/O | ✅ | HIGH/LOW |
| Analog Input (ADC) | ✅ | 10-12 bit tùy chip |
| PWM Output | ✅ | 8-16 bit resolution |
| Pin Change Callback | ✅ | Interrupt simulation |
| Thread-safe | ✅ | std::mutex |
| Simulation mode | ✅ | Terminal output |
| Real Hardware mode | ✅ | GPIO driver |
| Multi-chip | ✅ | 5 chip nổi tiếng |

---

## 🎓 Learning Path

### Day 1 (30 min)
- [ ] Đọc QUICKSTART.md (5min)
- [ ] Cài MinGW64 (10min)
- [ ] Compile project (5min)
- [ ] Chạy main.exe (2min)
- [ ] Đọc example_simple.cpp (8min)

### Day 2 (45 min)
- [ ] Đọc readme.md (20min)
- [ ] Chạy example_mode_switching.exe (5min)
- [ ] Sửa main.cpp thêm code riêng (15min)
- [ ] Xem output (5min)

### Day 3+ (30+ min)
- [ ] Đọc HOW_TO_ADD_CHIP.md (15min)
- [ ] Thêm chip mới (15min)
- [ ] Tạo project của riêng bạn (30+min)

**Total: ~2 hours để master**

---

## 🔧 Các chip được hỗ trợ

### ESP32
- **Loại:** IoT MCU
- **Pins:** 40
- **ADC:** 8 channels (4095 max)
- **PWM:** 16 channels
- **Features:** WiFi, BLE

### ESP8266
- **Loại:** WiFi module
- **Pins:** 11
- **ADC:** 1 channel
- **PWM:** 10 channels
- **Features:** WiFi

### STM32
- **Loại:** ARM Cortex-M
- **Pins:** 100+
- **ADC:** 16 channels (4095 max)
- **PWM:** 16 channels
- **Features:** Industrial

### MSP430
- **Loại:** Ultra-low power
- **Pins:** 20
- **ADC:** 8 channels (1023 max)
- **PWM:** 6 channels
- **Features:** Low power

### AVR
- **Loại:** Arduino compatible
- **Pins:** 20
- **ADC:** 6 channels (1023 max)
- **PWM:** 6 channels
- **Features:** Arduino

---

## 🚀 Tiếp theo

### Muốn bắt đầu ngay?
👉 **[QUICKSTART.md](QUICKSTART.md)**

### Muốn cài đặt môi trường?
👉 **[SETUP.md](SETUP.md)**

### Muốn hiểu toàn bộ?
👉 **[readme.md](readme.md)**

### Muốn xem code examples?
👉 **[main.cpp](main.cpp)**

### Muốn thêm chip mới?
👉 **[HOW_TO_ADD_CHIP.md](HOW_TO_ADD_CHIP.md)**

---

## 💡 Pro Tips

1. **Để code đơn giản, dùng example_simple.cpp làm template**
   ```cpp
   #include "gpio/VirtualGPIO.h"
   
   int main() {
       VirtualGPIO board(ESP32, true);
       // Viết code của bạn...
   }
   ```

2. **Dùng compile nhanh với script**
   ```powershell
   .\build.ps1
   ```

3. **Để thêm chip, follow HOW_TO_ADD_CHIP.md**
   - 5 bước đơn giản
   - 20 phút hoàn tất

4. **Dùng callbacks để react lại pin changes**
   ```cpp
   board.onPinChange(5, [](int pin, int val) {
       cout << "Pin changed!";
   });
   ```

---

## 🐛 Troubleshooting

| Vấn đề | Giải pháp |
|--------|----------|
| g++ not found | Cài MinGW64 (SETUP.md) |
| Cannot find VirtualGPIO.h | Check path, compile từ root folder |
| Compilation error | Đảm bảo compile cả cpp file |
| No output | Check simulation mode, xem readme.md |

---

## 📞 Support

- **Quickstart questions:** Xem QUICKSTART.md
- **API questions:** Xem readme.md
- **Setup issues:** Xem SETUP.md
- **Code examples:** Xem main.cpp
- **Add new chip:** Xem HOW_TO_ADD_CHIP.md

---

## 📝 License

MIT License - Tự do sử dụng, sửa, và distribute

---

## 🎉 Summary

✅ Bạn có:
- ✨ GPIO simulator cho 5 chip
- ✨ Arduino-style API
- ✨ Simulation + Real Hardware modes
- ✨ Terminal output
- ✨ 6 complete examples
- ✨ Comprehensive documentation

✨ Sẵn sàng để:
- 🚀 Phát triển embedded systems
- 🚀 Test code mà không cần hardware
- 🚀 Deploy lên board thực tế

---

**Happy Coding! 🎊**

Bắt đầu từ [QUICKSTART.md](QUICKSTART.md) ngay bây giờ!
