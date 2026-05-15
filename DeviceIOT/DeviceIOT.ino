#include "TaskNetWork.h"
#include "TaskSensor.h"
#include "TaskDevice.h"
#include "define_All.h"
#include "DebugInfo.h"


TaskNetWork task_NetWork;
TaskSensor taskSensor;
TaskDevice taskDevice;

TaskHandle_t Task1;
TaskHandle_t Task2;
TaskHandle_t Task3;


void setup() {
    DEVICE_LOG_INFO("start DeviceIOT::setup");
    Serial.begin(115200);

    taskDevice.setup();
    taskSensor.setup();
    task_NetWork.setup();


#if SUPPORT_RTOS
    // RTOS mode: create tasks pinned to cores (ESP32)
    xTaskCreatePinnedToCore(taskDevice.taskRun, "TaskDevice", 10000, NULL, 1, &Task1, 0);
    vTaskDelay(pdMS_TO_TICKS(500));
    xTaskCreatePinnedToCore(taskSensor.taskRun, "TaskSensor", 10000, NULL, 1, &Task2, 1);
    vTaskDelay(pdMS_TO_TICKS(500));
  //  xTaskCreatePinnedToCore(task_NetWork.taskRun, "TaskNetwork", 10000, NULL, 1, &Task3, 2);
   // vTaskDelay(pdMS_TO_TICKS(500));
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
    delay(10);
#else
    // In RTOS mode, tasks are independent; idle loop can optionally blink LEDs
    delay(1000);
#endif
}
