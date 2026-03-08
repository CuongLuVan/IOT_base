#ifndef GPIO_SIM_H
#define GPIO_SIM_H

#include <iostream>
#include <map>
#include <string>
#include <vector>
#include <functional>
#include <mutex>
#include "ChipDefs.h"

// Pin Modes
#define INPUT           0
#define OUTPUT          1
#define INPUT_PULLUP    2
#define INPUT_PULLDOWN  3
#define ANALOG          4
#define PWM             5

// Pin Values
#define LOW             0
#define HIGH            1

// Chip Types
enum ChipType {
    ESP32,
    ESP8266,
    STM32,
    MSP430,
    AVR,
    UNKNOWN_CHIP
};

// Chip Configurations
struct ChipConfig {
    std::string name;
    int totalPins;
    std::vector<int> digitalPins;
    std::vector<int> analogPins;
    std::vector<int> pwmPins;
    int maxAnalogValue;
    int pwmResolution;
};

class VirtualGPIO {
private:
    struct Pin {
        int mode;
        int digitalValue;
        int analogValue;      // 0-4095 (for ADC)
        int pwmValue;         // 0-255 (for PWM)
        int pwmFrequency;     // Hz
        bool lastDigitalValue;
        std::function<void(int, int)> changeCallback; // pin, newValue
    };

    std::map<int, Pin> pins;
    std::string chipName;
    ChipType chipType;
    ChipConfig chipConfig;
    bool simulationMode = true;  // true = mô phỏng, false = thực tế
    std::mutex pinMutex;

    // Chip configurations
    static ChipConfig getChipConfig(ChipType type);
    bool isPinValid(int pin);
    bool isPinMode(int pin, int expectedMode);

public:
    // Constructor
    VirtualGPIO(const std::string& name, bool simulation = true);
    VirtualGPIO(ChipType type, bool simulation = true);

    // Mode control
    void setSimulationMode(bool enable);
    bool isSimulationMode() const { return simulationMode; }

    // Digital I/O
    void pinMode(int pin, int mode);
    void digitalWrite(int pin, int value);
    int  digitalRead(int pin);

    // Analog I/O
    void analogWrite(int pin, int value);  // PWM output (0-255)
    int  analogRead(int pin);              // ADC input (0-1023 or 0-4095)

    // PWM control
    void pwmWrite(int pin, int value, int frequency = 1000);

    // Simulation functions
    void simulateInput(int pin, int value);     // Giả lập tín hiệu INPUT
    void simulateAnalog(int pin, int value);    // Giả lập ADC input (0-1023)

    // Callback for pin changes
    void onPinChange(int pin, std::function<void(int, int)> callback);

    // Debugging
    void printPinStatus();
    void printChipInfo();

    // Get chip info
    ChipType getChipType() const { return chipType; }
    std::string getChipName() const { return chipName; }
};

#endif
