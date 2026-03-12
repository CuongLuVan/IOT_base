
#include "TaskDevice.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <Arduino.h>

struct InfoDeviceControl
{
    unsigned char device_port;
    unsigned char button_click;
    unsigned char button_status;
    unsigned int count_info;
    /* data */
};

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
        vTaskDelay(1000);
    }
}
