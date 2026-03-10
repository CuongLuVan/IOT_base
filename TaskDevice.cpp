#include "TaskDevice.h"
#include <iostream>

TaskDevice::TaskDevice(ChipType chip_type,
                       int buttonPumpPin_,
                       int pumpPin_,
                       int buttonDevicePin_,
                       int devicePin_,
                       int period_ms)
    : Task(period_ms),
      gpio(chip_type, SIMULATION_MODE),
      buttonPumpPin(buttonPumpPin_),
      pumpPin(pumpPin_),
      buttonDevicePin(buttonDevicePin_),
      devicePin(devicePin_),
      pumpOn(false),
      deviceOn(false),
      lastButtonPumpState(false),
      lastButtonDeviceState(false) {
    // ensure pins are configured by caller (main.cpp)
}

void TaskDevice::loop() {
#if SIMULATION_MODE
    // Simulation mode: simulate button presses and print logs only
    static int simCounter = 0;
    simCounter++;

    // Simulate pump button press every 50 cycles
    if (simCounter % 50 == 0) {
        pumpOn = !pumpOn;
        std::cout << "[Device SIM] Pump button pressed - Pump " << (pumpOn ? "ON" : "OFF") << std::endl;
    }

    // Simulate device button press every 100 cycles
    if (simCounter % 100 == 0) {
        deviceOn = !deviceOn;
        std::cout << "[Device SIM] Device button pressed - Aux device " << (deviceOn ? "ON" : "OFF") << std::endl;
    }
#else
    // Real hardware mode: read actual buttons and control outputs (no logs)
        bool currentPumpBtn = gpio.digitalRead(buttonPumpPin) == HIGH;
        if (currentPumpBtn && !lastButtonPumpState) {
            // button pressed
            pumpOn = !pumpOn;
            gpio.digitalWrite(pumpPin, pumpOn ? HIGH : LOW);
        }
        lastButtonPumpState = currentPumpBtn;

        // second button controls generic device
        bool currentDevBtn = gpio.digitalRead(buttonDevicePin) == HIGH;
        if (currentDevBtn && !lastButtonDeviceState) {
            deviceOn = !deviceOn;
            gpio.digitalWrite(devicePin, deviceOn ? HIGH : LOW);
        }
        lastButtonDeviceState = currentDevBtn;
#endif
}
