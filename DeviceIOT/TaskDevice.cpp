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
#endif

InfoDeviceControl control;

void TaskDevice::setup(void)
{
    DEVICE_LOG_INFO("start TaskDevice::setup");
    control.device_port = 0x00;
    control.button_click = 0x00;
    control.button_status = 0x00;
    control.count_info = 0x00;

    // TTP223 OUT is a driven digital signal; no internal pull-up is required.
    pinMode(TTP223_PIN, INPUT);
    pinMode(INPUT_PULLUP_PIN, INPUT);
    pinMode(OUTPUT_PUMP_PIN, OUTPUT);
    pinMode(OUTPUT_DEVICE_1_PIN, OUTPUT);
    DEVICE_LOG_INFO("end TaskDevice::setup");
}

void TaskDevice::readTouch(void)
{
    static int lastTouchReading = !TTP223_ACTIVE_LEVEL;
    static int touchState = !TTP223_ACTIVE_LEVEL;
    static unsigned long lastDebounceTime = 0;

    const int reading = digitalRead(TTP223_PIN);
    if (reading != lastTouchReading) {
        lastDebounceTime = millis();
    }

    if ((millis() - lastDebounceTime) >= TOUCH_DEBOUNCE_MS &&
        reading != touchState) {
        const int previousTouchState = touchState;
        touchState = reading;

        // Trigger once at the beginning of a touch, not while it is held.
        if (previousTouchState != TTP223_ACTIVE_LEVEL &&
            touchState == TTP223_ACTIVE_LEVEL) {
            control.device_port = (control.device_port == 0) ? 1 : 0;
            control.count_info++;
            Serial.printf("[TaskDevice] TTP223 touch toggle device_port -> %d\n", control.device_port);
        }
    }

    lastTouchReading = reading;
}

void TaskDevice::controlPump(void)
{
    if ((control.device_port & 0x01) == 0x01) {
        digitalWrite(OUTPUT_PUMP_PIN, HIGH);
    } else {
        digitalWrite(OUTPUT_PUMP_PIN, LOW);
    }
}

void TaskDevice::controlDevice(void)
{
    if ((control.device_port & 0x02) == 0x02) {
        digitalWrite(OUTPUT_DEVICE_1_PIN, HIGH);
    } else {
        digitalWrite(OUTPUT_DEVICE_1_PIN, LOW);
    }
}

void TaskDevice::updateMemoryStatus(void)
{
    MemoryData::GetInstance().deviceStatus_->device_port = control.device_port;
    MemoryData::GetInstance().deviceStatus_->button_click = control.button_click;
    MemoryData::GetInstance().deviceStatus_->button_status = control.button_status;
    MemoryData::GetInstance().deviceStatus_->device_port_last = control.device_port_last;
    MemoryData::GetInstance().deviceStatus_->count_info = control.count_info;
}

void TaskDevice::taskRun(void *parameter)
{
#if SUPPORT_RTOS
    for (;;) {
        TaskDevice::readTouch();
        TaskDevice::controlPump();
        TaskDevice::controlDevice();
        vTaskDelay(pdMS_TO_TICKS(DEVICE_TASK_PERIOD_MS));

        if (control.device_port != control.device_port_last) {
            control.device_port_last = control.device_port;
            if (deviceStatusQueue != NULL) {
                xQueueSend(deviceStatusQueue, &control,
                           pdMS_TO_TICKS(DEVICE_QUEUE_SEND_DELAY_MS));
            }
        }

        if (deviceCommandQueue != NULL) {
            DeviceCommand cmdToDevice;
            if (xQueueReceive(deviceCommandQueue, &cmdToDevice, 0) == pdTRUE) {
                if (cmdToDevice.commandType == COMMAND_TYPE_CONTROL) {
                    control.device_port = cmdToDevice.commandValue;
                    cmdToDevice.reserved = COMMAND_RESERVED_CONTROL;
                    control.count_info++;
                }
                Serial.printf("[TaskDevice] Exec command type=%d value=%d\n",
                              cmdToDevice.commandType, cmdToDevice.commandValue);
            }
        }
    }
#else
    TaskDevice::updateMemoryStatus();
    TaskDevice::readTouch();
    TaskDevice::controlPump();
    TaskDevice::controlDevice();

    if (MemoryData::GetInstance().deviceCommand_ != NULL) {
        DeviceCommand *cmdToDevice = MemoryData::GetInstance().deviceCommand_;
        if (cmdToDevice->commandType == COMMAND_TYPE_CONTROL && cmdToDevice->reserved) {
            control.device_port = cmdToDevice->commandValue;
            control.device_port_last = cmdToDevice->commandValue;
            cmdToDevice->reserved = COMMAND_RESERVED_NONE;
            control.count_info++;
        }
    }

    if (control.device_port != control.device_port_last) {
        control.device_port_last = control.device_port;
        MemoryData::GetInstance().deviceStatus_ = &control;
    }
#endif
}
