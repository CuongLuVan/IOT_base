#include "define_All.h"
#include "PlatformCompat.h"
#include "DebugInfo.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "TaskNetWork.h"
#include "TaskSensor.h"

TaskNetWork taskNetwork;
TaskSensor taskSensor;
TaskDevice taskDevice;

#if SUPPORT_RTOS
TaskHandle_t taskDeviceHandle = nullptr;
TaskHandle_t taskSensorHandle = nullptr;
TaskHandle_t taskNetworkHandle = nullptr;
TaskHandle_t taskSystemHandle = nullptr;

namespace {
TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}

bool createTask(TaskFunction_t entry, const char* name, uint16_t stackDepth,
                UBaseType_t priority, TaskHandle_t* handle) {
    if (xTaskCreate(entry, name, stackDepth, nullptr, priority, handle) != pdPASS) {
        DEVICE_LOG_ERROR(String("[RTOS] Cannot create ") + name);
        return false;
    }
    return true;
}
} // namespace
#endif

void setup() {
    Serial.begin(SERIAL_BAUD_RATE);
    delay(20);
    DEVICE_LOG_INFO("[Boot] DeviceIOT8266 starting");

    // All initialization occurs before FreeRTOS application tasks are started.
    taskDevice.setup();
    taskSensor.setup();
    taskNetwork.setup();

#if SUPPORT_RTOS
    bool started = true;
    started &= createTask(TaskDevice::taskRun, "Device", TASK_STACK_SIZE,
                          TASK_DEVICE_PRIORITY, &taskDeviceHandle);
    started &= createTask(TaskSensor::taskRun, "Sensor", TASK_STACK_SIZE,
                          TASK_SENSOR_PRIORITY, &taskSensorHandle);
    started &= createTask(TaskNetWork::taskRun, "Network", TASK_NETWORK_STACK_SIZE,
                          TASK_NETWORK_PRIORITY, &taskNetworkHandle);
    started &= createTask(SystemTask::taskRun, "System", TASK_SYSTEM_STACK_SIZE,
                          TASK_SYSTEM_PRIORITY, &taskSystemHandle);
    if (!started) {
        DEVICE_LOG_ERROR("[RTOS] Startup is incomplete; check free heap and task stacks");
    }
#else
    DEVICE_LOG_INFO("[Boot] Cooperative NON-OS scheduler selected");
#endif
}

void loop() {
#if SUPPORT_RTOS
    // Application work runs in the four tasks above. Yield the Arduino loop task.
    vTaskDelay(delayTicks(RTOS_IDLE_LOOP_DELAY_MS));
#else
    // Each service performs one short, non-blocking step per pass.
    TaskDevice::taskRun(nullptr);
    TaskSensor::taskRun(nullptr);
    TaskNetWork::taskRun(nullptr);
    delay(COOP_LOOP_DELAY_MS);
#endif
}