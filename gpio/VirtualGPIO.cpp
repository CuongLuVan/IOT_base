#include "VirtualGPIO.h"
#include <sstream>
#include <algorithm>
#include <numeric>

// Chip configurations database
ChipConfig VirtualGPIO::getChipConfig(ChipType type) {
    ChipConfig config;
    
    switch(type) {
        case ESP32:
            config.name = "ESP32";
            config.totalPins = 40;
            config.digitalPins = {0, 1, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33};
            config.analogPins = {32, 33, 34, 35, 36, 37, 38, 39};  // ADC1 pins
            config.pwmPins = {0, 1, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27};
            config.maxAnalogValue = 4095;
            config.pwmResolution = 8;
            break;

        case ESP8266:
            config.name = "ESP8266";
            config.totalPins = 11;
            config.digitalPins = {0, 1, 2, 3, 4, 5, 12, 13, 14, 15, 16};
            config.analogPins = {A0};  // Only 1 ADC pin
            config.pwmPins = {0, 1, 2, 3, 4, 5, 12, 13, 14, 15};
            config.maxAnalogValue = 1023;
            config.pwmResolution = 8;
            break;

        case STM32:
            config.name = "STM32";
            config.totalPins = 100;  // Varies by package, using generic
            config.digitalPins.resize(100);
            std::iota(config.digitalPins.begin(), config.digitalPins.end(), 0);
            config.analogPins = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15};  // ADC channels
            config.pwmPins.resize(16);
            std::iota(config.pwmPins.begin(), config.pwmPins.end(), 0);
            config.maxAnalogValue = 4095;
            config.pwmResolution = 12;
            break;

        case MSP430:
            config.name = "MSP430";
            config.totalPins = 20;
            config.digitalPins = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15};
            config.analogPins = {0, 1, 2, 3, 4, 5, 6, 7};  // ADC10 channels
            config.pwmPins = {1, 2, 3, 4, 5, 6};  // Timer PWM
            config.maxAnalogValue = 1023;
            config.pwmResolution = 10;
            break;

        case AVR:
            config.name = "AVR (Arduino)";
            config.totalPins = 20;
            config.digitalPins = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19};
            config.analogPins = {14, 15, 16, 17, 18, 19};  // A0-A5 = pins 14-19
            config.pwmPins = {3, 5, 6, 9, 10, 11};  // PWM-capable pins
            config.maxAnalogValue = 1023;
            config.pwmResolution = 8;
            break;

        default:
            config.name = "Unknown";
            config.totalPins = 0;
            break;
    }
    
    return config;
}

VirtualGPIO::VirtualGPIO(const std::string& name, bool simulation) 
    : chipName(name), simulationMode(simulation), chipType(UNKNOWN_CHIP) {
    
    // Map string to chip type
    if (name == "ESP32") chipType = ESP32;
    else if (name == "ESP8266") chipType = ESP8266;
    else if (name == "STM32") chipType = STM32;
    else if (name == "MSP430") chipType = MSP430;
    else if (name == "AVR") chipType = AVR;
    
    chipConfig = getChipConfig(chipType);
    
    std::cout << "\n=== GPIO Simulator Initialized ===" << std::endl;
    std::cout << "Chip: " << chipName << std::endl;
    std::cout << "Mode: " << (simulationMode ? "SIMULATION" : "REAL HARDWARE") << std::endl;
    std::cout << "=====================================\n" << std::endl;
}

VirtualGPIO::VirtualGPIO(ChipType type, bool simulation) 
    : simulationMode(simulation), chipType(type) {
    
    chipConfig = getChipConfig(type);
    chipName = chipConfig.name;
    
    std::cout << "\n=== GPIO Simulator Initialized ===" << std::endl;
    std::cout << "Chip: " << chipName << std::endl;
    std::cout << "Mode: " << (simulationMode ? "SIMULATION" : "REAL HARDWARE") << std::endl;
    std::cout << "=====================================\n" << std::endl;
}

void VirtualGPIO::setSimulationMode(bool enable) {
    std::lock_guard<std::mutex> lock(pinMutex);
    if (simulationMode != enable) {
        simulationMode = enable;
        std::cout << "\n[MODE SWITCH] Changed to " 
                  << (enable ? "SIMULATION" : "REAL HARDWARE") << " mode\n" << std::endl;
    }
}

bool VirtualGPIO::isPinValid(int pin) {
    if (chipType == UNKNOWN_CHIP) return true;  // Unknown chip - allow all pins
    return std::find(chipConfig.digitalPins.begin(), 
                     chipConfig.digitalPins.end(), pin) != chipConfig.digitalPins.end();
}

bool VirtualGPIO::isPinMode(int pin, int expectedMode) {
    if (pins.find(pin) == pins.end()) {
        std::cerr << "Error: Pin " << pin << " not initialized\n";
        return false;
    }
    
    if (pins[pin].mode != expectedMode) {
        std::cerr << "Error: Pin " << pin << " is not in the correct mode\n";
        return false;
    }
    
    return true;
}

void VirtualGPIO::pinMode(int pin, int mode) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    if (!isPinValid(pin)) {
        std::cerr << "Error: Pin " << pin << " doesn't exist on " << chipName << std::endl;
        return;
    }
    
    pins[pin].mode = mode;
    pins[pin].digitalValue = LOW;
    pins[pin].analogValue = 0;
    pins[pin].pwmValue = 0;
    pins[pin].lastDigitalValue = LOW;
    
    std::string modeStr;
    switch(mode) {
        case INPUT: modeStr = "INPUT"; break;
        case OUTPUT: modeStr = "OUTPUT"; break;
        case INPUT_PULLUP: modeStr = "INPUT_PULLUP"; break;
        case INPUT_PULLDOWN: modeStr = "INPUT_PULLDOWN"; break;
        case ANALOG: modeStr = "ANALOG"; break;
        case PWM: modeStr = "PWM"; break;
        default: modeStr = "UNKNOWN"; break;
    }
    
    if (simulationMode) {
        std::cout << "[" << chipName << " SIM] Pin " << pin 
                  << " -> " << modeStr << std::endl;
    }
}

void VirtualGPIO::digitalWrite(int pin, int value) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    if (!isPinMode(pin, OUTPUT)) {
        return;
    }
    
    value = (value == HIGH) ? HIGH : LOW;
    
    if (pins[pin].digitalValue != value) {
        pins[pin].digitalValue = value;
        pins[pin].lastDigitalValue = value;
        
        if (simulationMode) {
            std::cout << "[" << chipName << " SIM] Pin " << pin 
                      << " = " << (value == HIGH ? "HIGH (1)" : "LOW (0)") << std::endl;
        } else {
            // In real hardware mode, this would call actual hardware write
            std::cout << "[" << chipName << " HW] Pin " << pin 
                      << " = " << (value == HIGH ? "HIGH (1)" : "LOW (0)") << " [REAL]" << std::endl;
        }
        
        // Trigger callback
        if (pins[pin].changeCallback) {
            pins[pin].changeCallback(pin, value);
        }
    }
}

int VirtualGPIO::digitalRead(int pin) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    if (pins.find(pin) == pins.end()) {
        std::cerr << "Error: Pin " << pin << " not initialized\n";
        return -1;
    }
    
    return pins[pin].digitalValue;
}

void VirtualGPIO::analogWrite(int pin, int value) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    // analog write is PWM on MCUs
    value = std::max(0, std::min(255, value));
    
    if (pins[pin].pwmValue != value) {
        pins[pin].pwmValue = value;
        
        float percentage = (value / 255.0f) * 100.0f;
        
        if (simulationMode) {
            std::cout << "[" << chipName << " SIM] Pin " << pin 
                      << " PWM = " << value << " (duty: " << percentage << "%)" << std::endl;
        } else {
            std::cout << "[" << chipName << " HW] Pin " << pin 
                      << " PWM = " << value << " (duty: " << percentage << "%) [REAL]" << std::endl;
        }
    }
}

int VirtualGPIO::analogRead(int pin) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    if (pins.find(pin) == pins.end()) {
        std::cerr << "Error: Pin " << pin << " not initialized\n";
        return -1;
    }
    
    return pins[pin].analogValue;
}

void VirtualGPIO::pwmWrite(int pin, int value, int frequency) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    value = std::max(0, std::min(255, value));
    
    pins[pin].pwmValue = value;
    pins[pin].pwmFrequency = frequency;
    
    float percentage = (value / 255.0f) * 100.0f;
    
    if (simulationMode) {
        std::cout << "[" << chipName << " SIM] Pin " << pin 
                  << " PWM = " << value << "% @ " << frequency << "Hz" << std::endl;
    }
}

void VirtualGPIO::simulateInput(int pin, int value) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    if (pins.find(pin) == pins.end()) {
        std::cerr << "Error: Pin " << pin << " not initialized\n";
        return;
    }
    
    if (!simulationMode) {
        std::cerr << "Simulation function called but not in simulation mode\n";
        return;
    }
    
    value = (value == HIGH) ? HIGH : LOW;
    
    if (pins[pin].digitalValue != value) {
        pins[pin].digitalValue = value;
        
        std::cout << "[" << chipName << " EXT] Pin " << pin 
                  << " changed to " << (value == HIGH ? "HIGH (1)" : "LOW (0)") << std::endl;
        
        if (pins[pin].changeCallback) {
            pins[pin].changeCallback(pin, value);
        }
    }
}

void VirtualGPIO::simulateAnalog(int pin, int value) {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    if (pins.find(pin) == pins.end()) {
        std::cerr << "Error: Pin " << pin << " not initialized\n";
        return;
    }
    
    if (!simulationMode) {
        std::cerr << "Simulation function called but not in simulation mode\n";
        return;
    }
    
    value = std::max(0, std::min(chipConfig.maxAnalogValue, value));
    
    if (pins[pin].analogValue != value) {
        pins[pin].analogValue = value;
        
        std::cout << "[" << chipName << " EXT] Pin " << pin 
                  << " ADC value = " << value << std::endl;
        
        if (pins[pin].changeCallback) {
            pins[pin].changeCallback(pin, value);
        }
    }
}

void VirtualGPIO::onPinChange(int pin, std::function<void(int, int)> callback) {
    std::lock_guard<std::mutex> lock(pinMutex);
    pins[pin].changeCallback = callback;
}

void VirtualGPIO::printPinStatus() {
    std::lock_guard<std::mutex> lock(pinMutex);
    
    std::cout << "\n========== Pin Status ==========" << std::endl;
    std::cout << "Chip: " << chipName << std::endl;
    
    for (auto& [pin, pinData] : pins) {
        std::cout << "Pin " << pin << ": ";
        
        switch(pinData.mode) {
            case INPUT:
                std::cout << "INPUT -> " << (pinData.digitalValue == HIGH ? "HIGH" : "LOW");
                break;
            case OUTPUT:
                std::cout << "OUTPUT -> " << (pinData.digitalValue == HIGH ? "HIGH" : "LOW");
                break;
            case PWM:
                std::cout << "PWM -> " << pinData.pwmValue << " @ " << pinData.pwmFrequency << "Hz";
                break;
            case ANALOG:
                std::cout << "ANALOG -> " << pinData.analogValue;
                break;
            default:
                std::cout << "UNKNOWN";
        }
        std::cout << std::endl;
    }
    std::cout << "================================\n" << std::endl;
}

void VirtualGPIO::printChipInfo() {
    std::cout << "\n========== Chip Info ==========" << std::endl;
    std::cout << "Name: " << chipConfig.name << std::endl;
    std::cout << "Total Pins: " << chipConfig.totalPins << std::endl;
    std::cout << "Digital Pins: " << chipConfig.digitalPins.size() << std::endl;
    std::cout << "Analog Pins: " << chipConfig.analogPins.size() << std::endl;
    std::cout << "PWM Pins: " << chipConfig.pwmPins.size() << std::endl;
    std::cout << "Max Analog Value: " << chipConfig.maxAnalogValue << std::endl;
    std::cout << "Mode: " << (simulationMode ? "SIMULATION" : "REAL HARDWARE") << std::endl;
    std::cout << "===============================\n" << std::endl;
}
