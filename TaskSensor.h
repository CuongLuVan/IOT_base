#ifndef TASK_SENSOR_H
#define TASK_SENSOR_H

#include "Task.h"
#include "gpio/VirtualGPIO.h"
#include "Config.h"

#if !SIMULATION_MODE
#include <DHT.h>           // DHT11 temperature/humidity sensor
#include <PMS.h>           // PMS5003 dust sensor library
#endif

struct SensorData {
    int temperature; // in °C
    int humidity;    // percentage
    int light;       // 0-1023
    int dust_pm25;   // PM2.5 concentration
    int dust_pm10;   // PM10 concentration
    int dust_pm1;    // PM1.0 concentration
};

class TaskSensor : public Task {
public:
    TaskSensor(ChipType chip_type, int period_ms = 1000);
    virtual void loop() override;

    SensorData getData() const;

private:
    VirtualGPIO gpio;
    SensorData current;
    mutable std::mutex dataMutex;

#if !SIMULATION_MODE
    // Sensor objects only in real mode (avoid dependency in sim mode)
    DHT dht;                    // DHT11 sensor
    PMS pms;                    // PMS5003 dust sensor
    HardwareSerial* pmsSerial;  // UART for PMS5003
#endif
};

#endif // TASK_SENSOR_H
