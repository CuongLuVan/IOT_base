#include "TaskNetWork.h"
#include "TaskSensor.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "define_All.h"
#include "DebugInfo.h"


TaskNetWork task_NetWork;
TaskSensor taskSensor;
TaskDevice taskDevice;
TaskHandle_t TaskSystem;

TaskHandle_t Task1;
TaskHandle_t Task2;
TaskHandle_t Task3;


void setup() {
    DEVICE_LOG_INFO("start DeviceIOT::setup");
    Serial.begin(SERIAL_BAUD_RATE);

    taskDevice.setup();
    taskSensor.setup();
    task_NetWork.setup();
    // Initialize monitoring/schedules before any task can consume a rule.
    SystemTask::setup();


#if SUPPORT_RTOS
    // RTOS mode: create tasks pinned to cores (ESP32)
    xTaskCreatePinnedToCore(taskDevice.taskRun, "TaskDevice", TASK_STACK_SIZE, NULL, TASK_DEVICE_PRIORITY, &Task1, 0);
    vTaskDelay(pdMS_TO_TICKS(TASK_CREATE_DELAY_MS));
    xTaskCreatePinnedToCore(taskSensor.taskRun, "TaskSensor", TASK_STACK_SIZE, NULL, TASK_SENSOR_PRIORITY, &Task2, 1);
    vTaskDelay(pdMS_TO_TICKS(TASK_CREATE_DELAY_MS));
    xTaskCreatePinnedToCore(task_NetWork.taskRun, "TaskNetwork", 10000, NULL, TASK_NETWORK_PRIORITY, &Task3, 0);
    vTaskDelay(pdMS_TO_TICKS(500));
    if (xTaskCreatePinnedToCore(SystemTask::taskRun, "SystemTask",
            TASK_SYSTEM_STACK_SIZE, NULL, TASK_SYSTEM_PRIORITY,
            &TaskSystem, 0) != pdPASS) {
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
    SystemTask::service();
    delay(COOP_LOOP_DELAY_MS);
#else
    // In RTOS mode, tasks are independent; idle loop can optionally blink LEDs
    delay(RTOS_IDLE_LOOP_DELAY_MS);
#endif
}
