
#include "TaskDevice.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <Arduino.h>
#include <freertos/queue.h>
#include "Common.h"

extern QueueHandle_t deviceCommandQueue;
extern QueueHandle_t deviceStatusQueue;

InfoDeviceControl control;
#define INPUT_PULLUP 1
#define BUTTON_PIN 2
void TaskDevice::setup(void)
{
    control.device_port = 0x00;
    control.button_click = 0x00;
    control.button_status = 0x00;
    control.count_info = 0x00;
    pinMode(21, INPUT_PULLUP); 
}

void TaskDevice::readButton(void)
{
  if(digitalRead(BUTTON_PIN)){
    
  }

}
void TaskDevice::controlPump(void){

}
void TaskDevice::controlDevice(void){

}
void TaskDevice::taskRun(void * parameter) {
    for(;;)
    { 
      TaskDevice::readButton();
      TaskDevice::controlPump();
      TaskDevice::controlDevice();

      // Report current device status to network
      if (deviceStatusQueue != NULL) {
          xQueueSend(deviceStatusQueue, &control, pdMS_TO_TICKS(50));
      }

      // Receive command from network if available
      if (deviceCommandQueue != NULL) {
          DeviceCommand cmd;
          if (xQueueReceive(deviceCommandQueue, &cmd, 0) == pdTRUE) {
              // apply command locally
              switch (cmd.commandType) {
                  case 1:
                      // e.g, toggle pump
                      control.device_port = cmd.commandValue;
                      break;
                  case 2:
                      // custom device setting
                      control.button_status = cmd.commandValue;
                      break;
                  default:
                      break;
              }
              control.count_info++;
              Serial.printf("[TaskDevice] Exec command type=%d value=%d\n", cmd.commandType, cmd.commandValue);
          }
      }

        vTaskDelay(1000);
    }
}
