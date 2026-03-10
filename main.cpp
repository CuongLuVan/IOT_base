#include "Config.h"
#include "gpio/ChipDefs.h"
#include "Task.h"
#include "TaskSensor.h"
#include "TaskDevice.h"
#include "TaskNetwork.h"
#include <iostream>
#include <thread>
#include <chrono>

int main() {
    std::cout << "\n=== GPIO SIMULATOR WITH TASKS ===" << std::endl;

    // Configuration
    const ChipType CHIP_TYPE = ESP32;

    // setup pins used by device (pump + aux device), buttons, and sensors
    const int BUTTON_PUMP_PIN = 2;
    const int PUMP_PIN        = 3;
    const int BUTTON_DEV_PIN  = 4;
    const int DEVICE_PIN      = 5;

    // create tasks (each with its own VirtualGPIO instance)
    TaskSensor sensor(CHIP_TYPE, 1000);
    TaskDevice device(CHIP_TYPE,
                      BUTTON_PUMP_PIN,
                      PUMP_PIN,
                      BUTTON_DEV_PIN,
                      DEVICE_PIN,
                      1000);
    TaskNetwork network(CHIP_TYPE, sensor, device, 2000);

    // start tasks if RTOS is enabled
#if SUPPORT_RTOS
    sensor.start();
    device.start();
    network.start();

    // main decision loop runs concurrently; in this simple demo, main just sleeps
    while (true) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
#else
    // cooperative loop: call each task manually
    while (true) {
        sensor.runOnce();
        device.runOnce();
        network.runOnce();
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
#endif

    return 0;
}
