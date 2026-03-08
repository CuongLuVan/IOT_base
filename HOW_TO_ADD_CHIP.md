# HOW TO: Mở rộng GPIO Simulator cho Chip Mới

## 📝 Bài toán

Bạn muốn:
- Thêm hỗ trợ cho chip mới (ví dụ: **ARM Cortex M4**, **PIC32**, **nRF52840**)
- Tùy chỉnh pin configuration
- Thêm tính năng chip-specific

---

## ✅ Bước 1: Thêm Chip Type (VirtualGPIO.h)

Mở `gpio/VirtualGPIO.h`, tìm enum `ChipType`:

```cpp
enum ChipType {
    ESP32,
    ESP8266,
    STM32,
    MSP430,
    AVR,
    ARM_CORTEX_M4,    // ← Thêm dòng này
    PIC32,            // ← Và này
    NRF52840,         // ← Và này
    UNKNOWN_CHIP
};
```

---

## ✅ Bước 2: Thêm Pin Definitions (ChipDefs.h)

Mở `gpio/ChipDefs.h`, thêm pin definitions cho chip mới:

```cpp
// ---- ARM Cortex-M4 (STM32F4 family) ----
#define PA0  0
#define PA1  1
#define PA2  2
#define PB0  16
#define PB1  17
// ... etc

// ---- nRF52840 (Nordic) ----
#define P0_0  0
#define P0_1  1
#define P1_0  32
#define P1_1  33
// ... etc
```

---

## ✅ Bước 3: Thêm Chip Configuration (VirtualGPIO.cpp)

Mở `gpio/VirtualGPIO.cpp`, tìm function `getChipConfig()`:

```cpp
ChipConfig VirtualGPIO::getChipConfig(ChipType type) {
    ChipConfig config;
    
    switch(type) {
        // ... existing cases ...
        
        case ARM_CORTEX_M4:
            config.name = "ARM Cortex-M4 (STM32F4)";
            config.totalPins = 144;
            config.digitalPins.resize(144);
            std::iota(config.digitalPins.begin(), 
                      config.digitalPins.end(), 0);
            config.analogPins = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 
                                10, 11, 12, 13, 14, 15, 16};
            config.pwmPins.resize(16);
            std::iota(config.pwmPins.begin(), 
                      config.pwmPins.end(), 0);
            config.maxAnalogValue = 4095;
            config.pwmResolution = 16;
            break;
        
        case NRF52840:
            config.name = "Nordic nRF52840";
            config.totalPins = 48;
            config.digitalPins.resize(48);
            std::iota(config.digitalPins.begin(), 
                      config.digitalPins.end(), 0);
            config.analogPins = {0, 1, 2, 3, 4, 5, 6, 7};
            config.pwmPins.resize(4);
            std::iota(config.pwmPins.begin(), 
                      config.pwmPins.end(), 0);
            config.maxAnalogValue = 4095;
            config.pwmResolution = 16;
            break;
        
        // ... more cases ...
    }
    
    return config;
}
```

---

## ✅ Bước 4: Update Constructor (VirtualGPIO.cpp)

Mở constructor của `VirtualGPIO`, thêm chip type mapping:

```cpp
VirtualGPIO::VirtualGPIO(const std::string& name, bool simulation) 
    : chipName(name), simulationMode(simulation), chipType(UNKNOWN_CHIP) {
    
    if (name == "ESP32") chipType = ESP32;
    else if (name == "ESP8266") chipType = ESP8266;
    else if (name == "STM32") chipType = STM32;
    else if (name == "MSP430") chipType = MSP430;
    else if (name == "AVR") chipType = AVR;
    else if (name == "ARM_CORTEX_M4") chipType = ARM_CORTEX_M4;  // ← Thêm
    else if (name == "NRF52840") chipType = NRF52840;             // ← Thêm
    
    chipConfig = getChipConfig(chipType);
    // ...
}
```

---

## ✅ Bước 5: Sử dụng Chip Mới

Giờ bạn có thể dùng chip mới trong code:

```cpp
#include "gpio/VirtualGPIO.h"
#include "gpio/ChipDefs.h"

int main() {
    // Cách 1: Sử dụng enum
    VirtualGPIO board(ARM_CORTEX_M4, true);
    
    // Cách 2: Sử dụng tên string
    VirtualGPIO nrf_board("NRF52840", true);
    
    // Code giống như các chip khác
    board.pinMode(0, OUTPUT);
    board.digitalWrite(0, HIGH);
    
    board.printChipInfo();
    
    return 0;
}
```

**Output:**
```
=== GPIO Simulator Initialized ===
Chip: ARM Cortex-M4 (STM32F4)
Mode: SIMULATION
=====================================

========== Chip Info ==========
Name: ARM Cortex-M4 (STM32F4)
Total Pins: 144
Digital Pins: 144
Analog Pins: 17
PWM Pins: 16
Max Analog Value: 4095
Mode: SIMULATION
===============================
```

---

## 🎨 Tùy chỉnh Nâng cao

### Thêm Custom Pin Modes

Nếu chip có special modes (ví dụ: DAC, CAN bus):

```cpp
#define DAC_OUTPUT   6
#define CAN_RX       7
#define CAN_TX       8

// Trong VirtualGPIO.cpp
void VirtualGPIO::pinMode(int pin, int mode) {
    // ...
    switch(mode) {
        case DAC_OUTPUT:
            std::cout << "[" << chipName << "] Pin " << pin 
                      << " -> DAC_OUTPUT" << std::endl;
            break;
        // ...
    }
}
```

### Thêm Custom Functions

Ngoài ra, bạn có thể thêm hàm chip-specific:

```cpp
// Trong VirtualGPIO.h
class VirtualGPIO {
public:
    // ...
    
    // Chip-specific functions
    void enableInterrupt(int pin);
    void setADCClock(int clock_hz);
    void I2CWrite(int address, uint8_t* data, int length);
};
```

---

## 📝 Template: Thêm Chip Mới

Để thêm chip mới, thực hiện các bước này:

### File: `gpio/VirtualGPIO.h`
```cpp
enum ChipType {
    // ... existing ...
    MY_NEW_CHIP,  // ← Thêm
    UNKNOWN_CHIP
};
```

### File: `gpio/ChipDefs.h`
```cpp
// ---- My New Chip ----
#define PIN_LED    0
#define PIN_BTN    1
#define PIN_ADC    A0
// ... etc
```

### File: `gpio/VirtualGPIO.cpp`
```cpp
case MY_NEW_CHIP:
    config.name = "My New Chip";
    config.totalPins = 32;
    config.digitalPins = {0, 1, 2, ... 31};
    config.analogPins = {A0, A1, A2, ...};
    config.pwmPins = {0, 1, 2, ...};
    config.maxAnalogValue = 1023;
    config.pwmResolution = 8;
    break;
```

### Constructor
```cpp
else if (name == "MY_NEW_CHIP") chipType = MY_NEW_CHIP;
```

---

## 🔧 Advanced: Thêm HAL Layer

Nếu muốn thêm hardware abstraction layer:

```cpp
// Tạo file mới: gpio/HAL.h
#ifndef HAL_H
#define HAL_H

class HAL {
public:
    virtual void digitalWrite(int pin, int value) = 0;
    virtual int digitalRead(int pin) = 0;
    virtual void analogWrite(int pin, int value) = 0;
};

// Simulation HAL
class SimulationHAL : public HAL {
    virtual void digitalWrite(int pin, int value) override {
        std::cout << "[SIM] Pin " << pin << " = " << value << "\n";
    }
};

// Real Hardware HAL
class RealHardwareHAL : public HAL {
    virtual void digitalWrite(int pin, int value) override {
        // Gọi driver thực tế (GPIO, ESP-IDF, STM32 HAL, etc.)
    }
};

#endif
```

Sau đó modify VirtualGPIO để sử dụng HAL:

```cpp
class VirtualGPIO {
private:
    HAL* hal;  // Pointer to HAL implementation
    
public:
    void setHAL(HAL* newHAL) { hal = newHAL; }
};
```

---

## 📚 Ví dụ: Thêm Arduino MKR1000 (SAMD21)

```cpp
// 1. gpio/VirtualGPIO.h
enum ChipType {
    // ...
    SAMD21,  // Arduino MKR1000
    // ...
};

// 2. gpio/ChipDefs.h
#define MKR_D0   0
#define MKR_D1   1
#define MKR_D2   2
// ... etc

// 3. gpio/VirtualGPIO.cpp
case SAMD21:
    config.name = "Arduino MKR1000 (SAMD21)";
    config.totalPins = 14;
    config.digitalPins = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13};
    config.analogPins = {A0, A1, A2, A3, A4, A5, A6};
    config.pwmPins = {3, 4, 5, 6, 8, 9, 10, 11, 12, 13};
    config.maxAnalogValue = 4095;
    config.pwmResolution = 12;
    break;

// 4. main.cpp
VirtualGPIO board(SAMD21, true);
// ... rest of code ...
```

---

## ✅ Checklist khi thêm Chip Mới

- [ ] Thêm ChipType enum
- [ ] Thêm pin definitions (ChipDefs.h)
- [ ] Thêm case trong getChipConfig()
- [ ] Update constructor string mapping
- [ ] Test với main hoặc example file
- [ ] Cập nhật readme.md
- [ ] Verify printChipInfo() output

---

## 🎯 Best Practices

1. **Đặt tên rõ ràng**
   ```cpp
   ESP32,              // ✓ Tốt
   ESP_32,             // ✗ Tránh gạch dưới
   ESPRESSIF_ESP32,    // ✓ Cũng tốt
   ```

2. **Thứ tự ADC channels**
   ```cpp
   config.analogPins = {32, 33, 34, 35, 36, 37, 38, 39};  // ✓ Thứ tự
   config.analogPins = {32, 34, 33, 37, 35, 39, 36, 38};  // ✗ Lộn xộn
   ```

3. **Pin validation**
   ```cpp
   bool isPinValid(int pin) {
       return std::find(config.digitalPins.begin(),
                       config.digitalPins.end(),
                       pin) != config.digitalPins.end();
   }
   ```

4. **Document chip**
   ```cpp
   // nRF52840: Nordic Semiconductor
   // - 48 GPIO pins
   // - 8 ADC channels (14-bit)
   // - 4 x PWM (16-bit)
   // - Built-in Bluetooth 5.0
   case NRF52840:
   ```

---

Với hướng dẫn này, bạn có thể **thêm bất kỳ chip nào** vào hệ thống GPIO Simulator! 🎉
