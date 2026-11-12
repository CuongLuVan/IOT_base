// DeviceIOT8266_V1 start-up on ESP8266_RTOS_SDK: the same four FreeRTOS tasks
// as the SUPPORT_RTOS branch of DeviceIOT8266 (DeviceIOT8266.ino):
//   TaskDevice  (priority 3) outputs, button, command queue, auto OFF
//   TaskSensor  (priority 2) ADC and DHT11 sampling, threshold rules
//   TaskNetwork (priority 2) Wi-Fi, HTTP, MQTT, LoRa and telemetry
//   SystemTask  (priority 2) automation, persistence, heartbeat, snapshot

#include "DebugInfo.h"
#include "Memory.h"
#include "Platform.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "TaskNetwork.h"
#include "TaskSensor.h"
#include "TaskWatchdog.h"
#include "define_All.h"

namespace {

bool createTask(TaskFunction_t entry, const char* name, uint32_t stackSize, UBaseType_t priority,
                task_watchdog::Slot slot)
{
    TaskHandle_t handle = nullptr;
    const BaseType_t created = xTaskCreate(entry, name, stackSize, nullptr, priority, &handle);
    if (created != pdPASS) {
        DEVICE_LOGF_ERROR("[Boot] Cannot create task %s\n", name);
        return false;
    }
    SystemTask::registerTask(slot, handle);
    vTaskDelay(delayTicks(TASK_CREATE_DELAY_MS));
    return true;
}

}  // namespace

extern "C" void app_main(void)
{
    DEVICE_LOG_INFO("[Boot] Starting DeviceIOT8266_V1 (ESP8266_RTOS_SDK)");

    if (!Memory::GetInstance()->begin(EEPROM_SIZE)) {
        DEVICE_LOG_ERROR("[Boot] EEPROM unavailable; running with defaults");
    }
    // Every module that other tasks talk to is ready before any task starts.
    TaskDevice::setup();
    TaskSensor::setup();
    SystemTask::setup();
    TaskNetwork::setup();

    task_watchdog::begin();
    bool started = true;
    started = started && createTask(TaskDevice::taskRun, "TaskDevice", TASK_STACK_SIZE, TASK_DEVICE_PRIORITY,
                                    task_watchdog::Slot::Device);
    started = started && createTask(TaskSensor::taskRun, "TaskSensor", TASK_STACK_SIZE, TASK_SENSOR_PRIORITY,
                                    task_watchdog::Slot::Sensor);
    started = started && createTask(TaskNetwork::taskRun, "TaskNetwork", TASK_NETWORK_STACK_SIZE,
                                    TASK_NETWORK_PRIORITY, task_watchdog::Slot::Network);
    started = started && createTask(SystemTask::taskRun, "SystemTask", TASK_SYSTEM_STACK_SIZE, TASK_SYSTEM_PRIORITY,
                                    task_watchdog::Slot::System);
    // A device without one of its tasks accepts commands it never applies.
    if (!started) task_watchdog::restartOnFatal("task creation failed");
    DEVICE_LOGF_INFO("[Boot] Tasks started, free heap %lu bytes\n", static_cast<unsigned long>(deviceFreeHeap()));
}
