
#include "TaskDevice.h"
#include <Arduino.h>
#include "Common.h"
#include "define_All.h"
#include "MemoryData.h"
#include "DebugInfo.h"

#if SUPPORT_RTOS
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
extern QueueHandle_t deviceCommandQueue;
extern QueueHandle_t deviceStatusQueue;
#else

#endif

InfoDeviceControl control;
static unsigned long manualOverrideUntil = 0;

void TaskDevice::setup(void)
{
    DEVICE_LOG_INFO("start TaskDevice::setup");
    control.device_port = 0x00;
    control.button_click = 0x00;
    control.button_status = 0x00;
    control.count_info = 0x00;
    pinMode(DEVICE_BUTTON_PIN, INPUT);
    pinMode(INPUT_PULLUP_PIN, INPUT);
    pinMode(OUTPUT_PUMP_PIN, OUTPUT);
    pinMode(OUTPUT_DEVICE_1_PIN, OUTPUT);
    DEVICE_LOG_INFO("end TaskDevice::setup");
}

void TaskDevice::readButton(void)
{
    static int lastButtonReading = HIGH;
    static int buttonState = HIGH;
    static unsigned long lastDebounceTime = 0;
    static unsigned long pressStart = 0;

    const unsigned long debounceDelay = BUTTON_DEBOUNCE_MS;
    const unsigned long longPressTime = BUTTON_LONG_PRESS_MS;

    int reading = digitalRead(DEVICE_BUTTON_PIN);

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
        digitalWrite(OUTPUT_PUMP_PIN, HIGH); // Bật bơm
    } else {
        digitalWrite(OUTPUT_PUMP_PIN, LOW); // Tắt bơm
    }
}
void TaskDevice::controlDevice(void){
    uint8_t outputState = (control.device_port & 0x01);
    digitalWrite(OUTPUT_DEVICE_1_PIN, outputState ? HIGH : LOW); // ON=1, OFF=0
}

void TaskDevice::updateMemoryStatus(void){
    MemoryData::GetInstance().deviceStatus_->device_port = control.device_port;
    MemoryData::GetInstance().deviceStatus_->button_click = control.button_click;  
    MemoryData::GetInstance().deviceStatus_->button_status = control.button_status; 
    MemoryData::GetInstance().deviceStatus_->device_port_last = control.device_port_last; 
    MemoryData::GetInstance().deviceStatus_->count_info = control.count_info; 
}

void TaskDevice::taskRun(void * parameter) {
    #if SUPPORT_RTOS
        for(;;)
        {
            TaskDevice::readButton();

            if (deviceCommandQueue != NULL) {
                DeviceCommand cmd_to_device;
                if (xQueueReceive(deviceCommandQueue, &cmd_to_device, 0) == pdTRUE) {
                    if(cmd_to_device.commandType == COMMAND_TYPE_CONTROL) {
                        control.device_port = (cmd_to_device.commandValue & 0x01);
                        manualOverrideUntil = millis() + 10000;
                        control.count_info++;
                    }
                    Serial.printf("[TaskDevice] Exec command type=%d value=%d\n", cmd_to_device.commandType, cmd_to_device.commandValue);
                }
            }

            if (manualOverrideUntil == 0 || millis() > manualOverrideUntil) {
                if (MemoryData::GetInstance().sensorData_ != NULL) {
                    InfoSensor latest = *MemoryData::GetInstance().sensorData_;
                    if (latest.soilMoisture < SOIL_MOISTURE_ON_THRESHOLD) {
                        control.device_port = 1;
                    } else if (latest.soilMoisture > SOIL_MOISTURE_OFF_THRESHOLD) {
                        control.device_port = 0;
                    }
                }
            }

            TaskDevice::controlPump();
            TaskDevice::controlDevice();
            vTaskDelay(DEVICE_TASK_PERIOD_MS / portTICK_PERIOD_MS);

            if(control.device_port != control.device_port_last){
                control.device_port_last = control.device_port;
                if (deviceStatusQueue != NULL) {
                    xQueueSend(deviceStatusQueue, &control, pdMS_TO_TICKS(DEVICE_QUEUE_SEND_DELAY_MS));
                }
            }
        }
    #else
        TaskDevice::updateMemoryStatus();
        TaskDevice::readButton();

        if(MemoryData::GetInstance().deviceCommand_ != NULL) {
            DeviceCommand* cmd_to_device = MemoryData::GetInstance().deviceCommand_;
            if(cmd_to_device->commandType== COMMAND_TYPE_CONTROL&&cmd_to_device->reserved) {
                control.device_port = (cmd_to_device->commandValue & 0x01);
                manualOverrideUntil = millis() + 10000;
                cmd_to_device->reserved = 0;
                control.count_info++;
            }
        }

        if (manualOverrideUntil == 0 || millis() > manualOverrideUntil) {
            if (MemoryData::GetInstance().sensorData_ != NULL) {
                InfoSensor latest = *MemoryData::GetInstance().sensorData_;
                if (latest.soilMoisture < SOIL_MOISTURE_ON_THRESHOLD) {
                    control.device_port = 1;
                } else if (latest.soilMoisture > SOIL_MOISTURE_OFF_THRESHOLD) {
                    control.device_port = 0;
                }
            }
        }

        TaskDevice::controlPump();
        TaskDevice::controlDevice();

        if(control.device_port != control.device_port_last){
            control.device_port_last = control.device_port;
            MemoryData::GetInstance().deviceStatus_ = &control;
        }
    #endif
}
