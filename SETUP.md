# HƯỚNG DẪN CÀI ĐẶT MINGW64 + CMAKE

## ✅ BƯỚC 1: CÀI MSYS2 + GCC (MinGW64)

### 1.1 Tải MSYS2
Truy cập: https://www.msys2.org/

Tải phiên bản Windows 64-bit (msys2-x86_64-xxxxxxx.exe)

### 1.2 Cài đặt MSYS2
1. Chạy file installer
2. Chọn thư mục cài (mặc định: C:\msys64)
3. Hoàn tất cài đặt
4. Tích "Run MSYS2" và bấm Finish

### 1.3 Cài GCC trong MSYS2
Cửa sổ MSYS2 MINGW64 sẽ mở. Gõ lệnh:

```bash
pacman -S mingw-w64-x86_64-gcc mingw-w64-x86_64-make
```

Trả lời "y" khi được hỏi.

### 1.4 Kiểm tra cài đặt
```bash
g++ --version
make --version
```

---

## ✅ BƯỚC 2: THÊM MINGW64 VÀO WINDOWS PATH

### 2.1 Mở Environment Variables
1. Nhấn **Windows + R**
2. Gõ: `sysdm.cpl`
3. Chọn tab **Advanced**
4. Bấm **Environment Variables**

### 2.2 Thêm MinGW vào PATH
1. Chọn **Path** trong "User variables"
2. Bấm **Edit**
3. Bấm **New** và thêm dòng:
   ```
   C:\msys64\mingw64\bin
   ```
4. Bấm **OK** → **OK** → **OK**

### 2.3 Khởi động lại PowerShell hoặc CMD
Đóng và mở lại terminal để nhận PATH mới.

### 2.4 Kiểm tra
Mở PowerShell gõ:
```powershell
g++ --version
```

Nếu thấy phiên bản GCC → Cài đặt thành công!

---

## ✅ BƯỚC 3: CÀI CMAKE (Optional - Nếu dùng CMake)

### 3.1 Tải CMake
Truy cập: https://cmake.org/download/

Tải: `cmake-xxx-windows-x86_64.msi` (Windows Installer)

### 3.2 Cài CMake
1. Chạy installer
2. **QUAN TRỌNG:** Tick vào "Add CMake to the system PATH"
3. Hoàn tất cài đặt

### 3.3 Kiểm tra
```bash
cmake --version
```

---

## ✅ BƯỚC 4: BIÊN DỊCH TRONG POWERSHELL

Sau khi cài đặt xong, mở **PowerShell** (hoặc CMD) và chạy:

### Phương pháp 1: Dùng script build.ps1 (Đơn giản nhất)

```powershell
cd e:\ManagerProject\IOT_base
powershell -ExecutionPolicy Bypass -File build.ps1
```

### Phương pháp 2: Compile trực tiếp

```powershell
cd e:\ManagerProject\IOT_base
g++ -std=c++17 -Wall -Wextra -pthread -o build/app.exe main.cpp gpio/VirtualGPIO.cpp
.\build\app.exe
```

### Phương pháp 3: Dùng CMake (Sau khi cài CMake)

```bash
cd e:\ManagerProject\IOT_base
cmake -B build -G "MinGW Makefiles"
cmake --build build
.\build\app.exe
```

---

## ✅ BƯỚC 5: CHẠY PROGRAM

Nếu cài đặt thành công, bạn sẽ thấy output:

```
===============================================
    GPIO Simulator - All Examples
===============================================

*** EXAMPLE 1: ESP32 LED Blinking (SIMULATION) ***

=== GPIO Simulator Initialized ===
Chip: ESP32
Mode: SIMULATION
=====================================

[ESP32 SIM] Pin 2 -> OUTPUT
[ESP32 SIM] Pin 2 = HIGH (1)
[ESP32 SIM] Pin 2 = LOW (0)
...
```

---

## 🐛 KHẮC PHỤC LỖI

### Lỗi: "g++ command not found"
→ Cài MSYS2 + GCC (Bước 1)
→ Thêm Mingw64 vào PATH (Bước 2)
→ Khởi động lại PowerShell

### Lỗi: "cmake command not found"
→ Cài CMake (Bước 3)
→ Khởi động lại PowerShell

### Lỗi: Compilation errors
→ Kiểm tra có sử dụng C++17 không: `-std=c++17`
→ Kiểm tra có link pthread không: `-pthread`

---

## 📝 Lệnh kiểm tra nhanh

```powershell
# Kiểm tra GCC
g++ --version

# Kiểm tra CMake (nếu cài)
cmake --version

# Biên dịch và chạy
cd e:\ManagerProject\IOT_base
g++ -std=c++17 -Wall -Wextra -pthread -o app.exe main.cpp gpio/VirtualGPIO.cpp
.\app.exe
```

---

**Nếu vẫn gặp vấn đề, hãy chụp error message và liên hệ!**
