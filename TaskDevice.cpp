#include "TaskDevice.h"
#include <iostream>

TaskDevice::TaskDevice(VirtualGPIO& gpioRef,
                       int buttonPumpPin_,
                       int pumpPin_,
                       int buttonDevicePin_,
                       int devicePin_,
                       int period_ms)
    : Task(period_ms),
      gpio(gpioRef),
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
    // read pump button and toggle pump output on rising edge
    bool currentPumpBtn = gpio.digitalRead(buttonPumpPin) == HIGH;
    if (currentPumpBtn && !lastButtonPumpState) {
        // button pressed
        pumpOn = !pumpOn;
        gpio.digitalWrite(pumpPin, pumpOn ? HIGH : LOW);
        if (gpio.isSimulationMode()) {
            std::cout << "[Device SIM] Pump " << (pumpOn ? "ON" : "OFF") << std::endl;
        } else {
            std::cout << "[Device HW] Pump " << (pumpOn ? "ON" : "OFF") << std::endl;
        }
    }
    lastButtonPumpState = currentPumpBtn;

    // second button controls generic device
    bool currentDevBtn = gpio.digitalRead(buttonDevicePin) == HIGH;
    if (currentDevBtn && !lastButtonDeviceState) {
        deviceOn = !deviceOn;
        gpio.digitalWrite(devicePin, deviceOn ? HIGH : LOW);
        if (gpio.isSimulationMode()) {
            std::cout << "[Device SIM] Aux device " << (deviceOn ? "ON" : "OFF") << std::endl;
        } else {
            std::cout << "[Device HW] Aux device " << (deviceOn ? "ON" : "OFF") << std::endl;
        }
    }
    lastButtonDeviceState = currentDevBtn;
}
