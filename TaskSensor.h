#ifndef TASK_SENSOR_H
#define TASK_SENSOR_H

#include "Task.h"
#include "gpio/VirtualGPIO.h"

struct SensorData {
    int temperature; // in °C
    int humidity;    // percentage
    int light;       // 0-1023
};

class TaskSensor : public Task {
public:
    TaskSensor(VirtualGPIO& gpio, int period_ms = 1000);
    virtual void loop() override;

    SensorData getData() const;

private:
    VirtualGPIO& gpio;
    SensorData current;
    mutable std::mutex dataMutex;
};

#endif // TASK_SENSOR_H
