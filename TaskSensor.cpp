#include "TaskSensor.h"
#include "sensor_config.h"
#include <random>
#include <mutex>

#if !SIMULATION_MODE
#include <DHT.h>
#include <PMS.h>
#endif

// Simulation mode sensor data structure
struct SimSensorData {
    int temperature;
    int humidity;
    int light;
    int dust_pm25;
    int dust_pm10;
    int dust_pm1;
};

TaskSensor::TaskSensor(ChipType chip_type, int period_ms)
    : Task(period_ms), gpio(chip_type, SIMULATION_MODE)
#if !SIMULATION_MODE
    , dht(DHT_PIN, DHT_TYPE), pms(Serial2), pmsSerial(&Serial2)
#endif
{
    // Initialize sensors to some default values
    current.temperature = 25;
    current.humidity = 50;
    current.light = 512;
    current.dust_pm25 = 10;
    current.dust_pm10 = 15;
    current.dust_pm1 = 8;

#if !SIMULATION_MODE
    // Initialize real hardware sensors
    dht.begin();

    // Initialize PMS5003 UART
    pmsSerial->begin(9600, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);

    // Set light sensor pin mode
    gpio.pinMode(LIGHT_SENSOR_PIN, ANALOG);
#endif
}

void TaskSensor::loop() {
#if SIMULATION_MODE
    // Simulation mode: generate random sensor values and display logs
    static std::default_random_engine eng((unsigned)std::chrono::system_clock::now().time_since_epoch().count());
    std::uniform_int_distribution<int> tempDist(20, 35);
    std::uniform_int_distribution<int> humDist(30, 70);
    std::uniform_int_distribution<int> lightDist(0, 1023);
    std::uniform_int_distribution<int> dustDist(5, 50);

    std::lock_guard<std::mutex> lock(dataMutex);
    current.temperature = tempDist(eng);
    current.humidity = humDist(eng);
    current.light = lightDist(eng);
    current.dust_pm25 = dustDist(eng);
    current.dust_pm10 = current.dust_pm25 + 5;
    current.dust_pm1 = current.dust_pm25 - 2;

    std::cout << "[Sensor SIM] Temp=" << current.temperature
              << "C Hum=" << current.humidity
              << "% Light=" << current.light
              << " Dust_PM2.5=" << current.dust_pm25 << std::endl;
#else
    // Real hardware mode: read from actual sensors (no logs)
    std::lock_guard<std::mutex> lock(dataMutex);

    // Read DHT11 temperature and humidity
    current.temperature = dht.readTemperature();
    current.humidity = dht.readHumidity();

    // Read light sensor via ADC
    current.light = gpio.analogRead(LIGHT_SENSOR_PIN);

    // Read PMS5003 dust sensor via UART
    if (pmsSerial->available()) {
        pms.read(*pmsSerial);
        if (pms) {
            current.dust_pm25 = pms.pm25();
            current.dust_pm10 = pms.pm100();
            current.dust_pm1 = pms.pm10();
        }
    }

    // Handle sensor read errors
    if (isnan(current.temperature)) current.temperature = 25;
    if (isnan(current.humidity)) current.humidity = 50;
#endif
}

SensorData TaskSensor::getData() const {
    std::lock_guard<std::mutex> lock(dataMutex);
    return current;
}
