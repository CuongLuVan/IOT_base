#ifndef TASK_NETWORK_H
#define TASK_NETWORK_H

#include "Task.h"
#include "TaskSensor.h"
#include "TaskDevice.h"
#include "gpio/VirtualGPIO.h"
#include "WifiNetwork.h"
#include "RealTimeControl.h"
#include <string>
#include <memory>

class TaskNetwork : public Task {
public:
    TaskNetwork(ChipType chip_type, TaskSensor& sensorTask, TaskDevice& deviceTask, int period_ms = 2000);
    virtual void loop() override;

private:
    TaskSensor& sensor;
    TaskDevice& device;

    // Network components
    std::unique_ptr<WifiNetwork> wifi_network;
    std::unique_ptr<RealTimeControl> mqtt_controller;

    void initializeNetwork();
    void sendMQTT(const std::string& topic, const std::string& payload);
    void sendUART(const std::string& message);
    void handleNetworkStatus();
};

#endif // TASK_NETWORK_H
