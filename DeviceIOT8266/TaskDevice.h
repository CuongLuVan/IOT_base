#pragma once

#include "Common.h"

class TaskDevice {
public:
    void setup();
    static void taskRun(void* parameter);
    static bool copyStatus(InfoDeviceControl& destination);

private:
    static void readButton();
    static void controlOutputs();
    static void applyCommand(const DeviceCommand& command);
    static void publishStatus();
};