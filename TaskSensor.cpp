#include "TaskSensor.h"
#include <random>
#include <mutex>

TaskSensor::TaskSensor(VirtualGPIO& gpioRef, int period_ms)
    : Task(period_ms), gpio(gpioRef) {
    // initialize sensors to some default
    current.temperature = 25;
    current.humidity = 50;
    current.light = 512;
}

void TaskSensor::loop() {
    // simulation: generate random sensor values or read from analog pins
    if (gpio.isSimulationMode()) {
        static std::default_random_engine eng((unsigned)std::chrono::system_clock::now().time_since_epoch().count());
        std::uniform_int_distribution<int> tempDist(20, 35);
        std::uniform_int_distribution<int> humDist(30, 70);
        std::uniform_int_distribution<int> lightDist(0, 1023);
        
        std::lock_guard<std::mutex> lock(dataMutex);
        current.temperature = tempDist(eng);
        current.humidity = humDist(eng);
        current.light = lightDist(eng);
        
        std::cout << "[Sensor SIM] Temp=" << current.temperature
                  << "C Hum=" << current.humidity
                  << "% Light=" << current.light << std::endl;
    } else {
        // real hardware: read from analog pins defined in ChipDefs
        int t = gpio.analogRead(A0);      // assume A0 = temperature sensor
        int h = gpio.analogRead(A1);      // humidity sensor
        int l = gpio.analogRead(A2);      // light sensor
        std::lock_guard<std::mutex> lock(dataMutex);
        current.temperature = t;
        current.humidity = h;
        current.light = l;
    }
}

SensorData TaskSensor::getData() const {
    std::lock_guard<std::mutex> lock(dataMutex);
    return current;
}
