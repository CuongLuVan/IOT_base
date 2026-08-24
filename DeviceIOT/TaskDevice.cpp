
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
void TaskDevice::setup(void)
{
    DEVICE_LOG_INFO("start TaskDevice::setup");
    control.device_port = 0x00;
    control.button_click = 0x00;
    control.button_status = 0x00;
    control.count_info = 0x00;
    pinMode(DEVICE_BUTTON_PIN, INPUT);
    // Reed switch connected between GPIO13 and GND:
    // closed/near magnet = LOW, open/far magnet = HIGH.
    pinMode(INPUT_PULLUP_PIN, INPUT_PULLUP);
    control.magnetic_switch_status = (digitalRead(INPUT_PULLUP_PIN) == HIGH) ? 1 : 0;
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

bool TaskDevice::readMagneticSwitch(void)
{
    static bool initialized = false;
    static int lastReading = HIGH;
    static int stableReading = HIGH;
    static unsigned long lastChangeTime = 0;

    const int reading = digitalRead(INPUT_PULLUP_PIN);
    const unsigned long now = millis();

    if (!initialized) {
        initialized = true;
        lastReading = reading;
        stableReading = reading;
        lastChangeTime = now;
        return false;
    }

    if (reading != lastReading) {
        lastReading = reading;
        lastChangeTime = now;
    }

    if (reading != stableReading &&
        (now - lastChangeTime) >= MAGNETIC_SWITCH_DEBOUNCE_MS) {
        const int previousReading = stableReading;
        stableReading = reading;
        control.magnetic_switch_status = (stableReading == HIGH) ? 1 : 0;
        control.count_info++;

        Serial.printf("[TaskDevice] Magnetic switch %s -> %s, var=%d\n",
                      (previousReading == LOW) ? "LOW" : "HIGH",
                      (stableReading == LOW) ? "LOW" : "HIGH",
                      control.magnetic_switch_status);
        return true;
    }

    return false;
}

void TaskDevice::controlPump(void){
    if((control.device_port|0x01) == 1) {
        digitalWrite(OUTPUT_PUMP_PIN, HIGH); // Bật bơm
    } else {
        digitalWrite(OUTPUT_PUMP_PIN, LOW); // Tắt bơm
    }
}
void TaskDevice::controlDevice(void){
     if((control.device_port|0x02) == 0x02) {
        digitalWrite(OUTPUT_DEVICE_1_PIN, HIGH); // Bật thiết bị 1
    } else {
        digitalWrite(OUTPUT_DEVICE_1_PIN, LOW); // Tắt thiết bị 1
    }
}

void TaskDevice::updateMemoryStatus(void){
    MemoryData::GetInstance().deviceStatus_->device_port = control.device_port;
    MemoryData::GetInstance().deviceStatus_->button_click = control.button_click;  
    MemoryData::GetInstance().deviceStatus_->button_status = control.button_status; 
    MemoryData::GetInstance().deviceStatus_->magnetic_switch_status = control.magnetic_switch_status;
    MemoryData::GetInstance().deviceStatus_->device_port_last = control.device_port_last; 
    MemoryData::GetInstance().deviceStatus_->count_info = control.count_info; 
}

void TaskDevice::taskRun(void * parameter) {
    //DEVICE_LOG_INFO("start TaskDevice::taskRun");
    #if SUPPORT_RTOS
        bool initialStatusPending = true;
        for(;;)
        { 
            TaskDevice::readButton();
            const bool magneticSwitchChanged = TaskDevice::readMagneticSwitch();
            TaskDevice::controlPump();
            TaskDevice::controlDevice();
            vTaskDelay(DEVICE_TASK_PERIOD_MS / portTICK_PERIOD_MS);
            if(control.device_port!=control.device_port_last || magneticSwitchChanged || initialStatusPending){
                control.device_port_last = control.device_port;
                initialStatusPending = false;
                // Report current device status to network
                if (deviceStatusQueue != NULL) {
                    xQueueSend(deviceStatusQueue, &control, pdMS_TO_TICKS(DEVICE_QUEUE_SEND_DELAY_MS));
                }

                // Receive command from network if available
                
            }
            if (deviceCommandQueue != NULL) {
                DeviceCommand cmd_to_device;
                if (xQueueReceive(deviceCommandQueue, &cmd_to_device, 0) == pdTRUE) {
                    // apply command locally
                    if(cmd_to_device.commandType == COMMAND_TYPE_CONTROL) {
                        control.device_port = cmd_to_device.commandValue;
                        cmd_to_device.reserved = 1; // Mark as processed
                        control.count_info++;
                    }
                    
                    Serial.printf("[TaskDevice] Exec command type=%d value=%d\n", cmd_to_device.commandType, cmd_to_device.commandValue);
                }
            }
        }
        
    #else
        TaskDevice::readButton();
        TaskDevice::readMagneticSwitch();
        TaskDevice::controlPump();
        TaskDevice::controlDevice();
        TaskDevice::updateMemoryStatus();
        if(MemoryData::GetInstance().deviceCommand_ != NULL) {
            
            DeviceCommand* cmd_to_device = MemoryData::GetInstance().deviceCommand_;
            DEVICE_LOG_INFO("start TaskDevice::DeviceCommand commandType "+ 
                String(cmd_to_device->commandType) + " value=" + 
                String(cmd_to_device->commandValue) + " reserved=" + 
                String(cmd_to_device->reserved)  );
            if(cmd_to_device->commandType== COMMAND_TYPE_CONTROL&&cmd_to_device->reserved) {
                control.device_port = cmd_to_device->commandValue;
                control.device_port_last = cmd_to_device->commandValue;
                cmd_to_device->reserved = 0; // Mark as processed
                control.count_info++;
            }
        }       
        if(control.device_port!=control.device_port_last){
            control.device_port_last = control.device_port;
            MemoryData::GetInstance().deviceStatus_ = &control;
            if(MemoryData::GetInstance().deviceCommand_ != NULL) {
                DeviceCommand* cmd_to_device = MemoryData::GetInstance().deviceCommand_;
                if(cmd_to_device->commandType== COMMAND_TYPE_CONTROL) {
                    control.device_port = cmd_to_device->commandValue;
                    cmd_to_device->reserved = 0; // Mark as processed
                    control.count_info++;
                }
            }
        }
    #endif


}
