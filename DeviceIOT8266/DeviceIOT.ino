#include "TaskNetWork.h"
#include "TaskSensor.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "define_All.h"
#include "DebugInfo.h"


TaskNetWork task_NetWork;
TaskSensor taskSensor;
TaskDevice taskDevice;

#if SUPPORT_RTOS
TaskHandle_t TaskSystem;
TaskHandle_t Task1;
TaskHandle_t Task2;
TaskHandle_t Task3;
#endif


void setup() {
    DEVICE_LOG_INFO("start DeviceIOT::setup");
    Serial.begin(SERIAL_BAUD_RATE);

    taskDevice.setup();
    taskSensor.setup();
    task_NetWork.setup();


#if SUPPORT_RTOS
    // RTOS mode: create tasks (ESP8266 has single core, no PinnedToCore)
    xTaskCreate(taskDevice.taskRun, "TaskDevice", TASK_STACK_SIZE, NULL, TASK_DEVICE_PRIORITY, &Task1);
    vTaskDelay(pdMS_TO_TICKS(TASK_CREATE_DELAY_MS));
    xTaskCreate(taskSensor.taskRun, "TaskSensor", TASK_STACK_SIZE, NULL, TASK_SENSOR_PRIORITY, &Task2);
    vTaskDelay(pdMS_TO_TICKS(TASK_CREATE_DELAY_MS));
    xTaskCreate(task_NetWork.taskRun, "TaskNetwork", TASK_NETWORK_STACK_SIZE, NULL, TASK_NETWORK_PRIORITY, &Task3);
    vTaskDelay(pdMS_TO_TICKS(500));
    SystemTask::setup();
    if (xTaskCreate(SystemTask::taskRun, "SystemTask",
            TASK_SYSTEM_STACK_SIZE, NULL, TASK_SYSTEM_PRIORITY,
            &TaskSystem) != pdPASS) {
        DEVICE_LOG_INFO("[SystemTask] Failed to create monitoring task");
    }
#else
    // Non RTOS mode: run all tasks cooperatively in loop
    // No extra task creation needed.
#endif
    DEVICE_LOG_INFO("end DeviceIOT::setup");
}

void loop() {
#if !SUPPORT_RTOS
    // Cooperative scheduler
    taskDevice.taskRun(NULL);
    taskSensor.taskRun(NULL);
    task_NetWork.taskRun(NULL);
    delay(COOP_LOOP_DELAY_MS);
#else
    // In RTOS mode, tasks are independent; idle loop can optionally blink LEDs
    delay(RTOS_IDLE_LOOP_DELAY_MS);
#endif
}
