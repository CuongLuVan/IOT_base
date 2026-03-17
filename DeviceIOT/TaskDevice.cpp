
#include "TaskDevice.h"
#include <Arduino.h>
#include "Common.h"
#include "define_All.h"
#include "MemoryData.h"

#if SUPPORT_RTOS
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
extern QueueHandle_t deviceCommandQueue;
extern QueueHandle_t deviceStatusQueue;
#else

#endif

InfoDeviceControl control;
#define INPUT_PULLUP 1
#define OUTPUT_PUMP 22
#define OUTPUT_DEVICE_1 23
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
    static int lastButtonReading = HIGH;
    static int buttonState = HIGH;
    static unsigned long lastDebounceTime = 0;
    static unsigned long pressStart = 0;

    const unsigned long debounceDelay = 50;
    const unsigned long longPressTime = 3000;

    int reading = digitalRead(BUTTON_PIN);

    if (reading != lastButtonReading) {
        lastDebounceTime = millis();
    }

    if ((millis() - lastDebounceTime) > debounceDelay) {
        if (reading != buttonState) {
            buttonState = reading;

            if (buttonState == LOW) { // nút được nhấn (INPUT_PULLUP)
                pressStart = millis();
            } else { // nút được nhả
                if (pressStart > 0) {
                    unsigned long pressDuration = millis() - pressStart;
                    if (pressDuration >= longPressTime) {
                        // long press (>= 3s) => toggle device_port
                        if (control.device_port == 0) {
                            control.device_port = 1;
                        } else {
                            control.device_port = 0;
                        }
                        control.count_info++;
                        Serial.printf("[TaskDevice] Long press toggle device_port -> %d\n", control.device_port);
                    }
                    pressStart = 0;
                }
            }
        }
    }

    lastButtonReading = reading;
}

void TaskDevice::controlPump(void){
    if((control.device_port|0x01) == 1) {
        digitalWrite(OUTPUT_PUMP, HIGH); // Bật bơm
    } else {
        digitalWrite(OUTPUT_PUMP, LOW); // Tắt bơm
    }
}
void TaskDevice::controlDevice(void){
     if((control.device_port|0x02) == 0x02) {
        digitalWrite(OUTPUT_DEVICE_1, HIGH); // Bật thiết bị 1
    } else {
        digitalWrite(OUTPUT_DEVICE_1, LOW); // Tắt thiết bị 1
    }
}
void TaskDevice::taskRun(void * parameter) {
    for(;;)
    { 
      TaskDevice::readButton();
      TaskDevice::controlPump();
      TaskDevice::controlDevice();

        if(control.device_port!=control.device_port_last){
            control.device_port_last = control.device_port;
           #if SUPPORT_RTOS
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
            #else
                MemoryData::GetInstance().deviceStatus_ = &control;
            #endif
        }



    }
}
