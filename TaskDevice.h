#ifndef TASK_DEVICE_H
#define TASK_DEVICE_H

#include "Task.h"
#include "gpio/VirtualGPIO.h"

// TaskDevice now controls two outputs (pump + generic device) based on
// two separate button inputs.  Simulation mode is supported via
// VirtualGPIO::isSimulationMode().

class TaskDevice : public Task {
public:
    // constructor takes four pin numbers (two inputs, two outputs)
    TaskDevice(ChipType chip_type,
               int buttonPumpPin,
               int pumpPin,
               int buttonDevicePin,
               int devicePin,
               int period_ms = 1000);

    virtual void loop() override;

private:
    VirtualGPIO gpio;
    int buttonPumpPin;
    int pumpPin;
    int buttonDevicePin;
    int devicePin;

    bool pumpOn;
    bool deviceOn;
    bool lastButtonPumpState;
    bool lastButtonDeviceState;
};

#endif // TASK_DEVICE_H
