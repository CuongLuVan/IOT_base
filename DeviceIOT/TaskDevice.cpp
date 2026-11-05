
#include "TaskDevice.h"
#include <Arduino.h>
#include "Common.h"
#include "define_All.h"
#include "MemoryData.h"
#include "DebugInfo.h"
#include "ScheduleEngine.h"
#include "OnTimer.h"
#include "Countdown.h"
#include <time.h>

#if SUPPORT_RTOS
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/queue.h>
extern QueueHandle_t deviceCommandQueue;
extern QueueHandle_t deviceStatusQueue;
#else

#endif

InfoDeviceControl control;

// Direct control priority and schedule auto OFF (spec_v1 §6), see ScheduleCore.h.
static schedule::PortController portController;
// Auto OFF on-timer, independent of schedules, see OnTimer.h.
static on_timer::Tracker onTimerTracker;
static constexpr time_t kMinimumValidEpoch = 1704067200;

static int64_t validEpochOrZero(void)
{
    const time_t now = time(nullptr);
    return now >= kMinimumValidEpoch ? static_cast<int64_t>(now) : 0;
}

static void applyDirectCommand(uint8_t portMask, uint8_t portState)
{
    // com:1 without "mask" keeps its legacy meaning: value is the whole byte.
    const uint8_t mask = portMask != 0 ? portMask : 0xFF;
    uint8_t cancelled = 0;
    control.device_port = portController.applyDirect(control.device_port, mask, portState, cancelled);
    control.count_info++;
    if (cancelled != 0) {
        Serial.printf("[TaskDevice] Direct control cancels auto OFF, ports=0x%02X\n", cancelled);
    }
}

static void applyScheduleCommand(uint8_t portMask, uint8_t portState, uint16_t autoOffSeconds)
{
    control.device_port = portController.applySchedule(control.device_port, portMask, portState,
                                                       autoOffSeconds, validEpochOrZero());
    control.count_info++;
}

static void processAutoOff(void)
{
    uint8_t switchedOff = 0;
    control.device_port = portController.processAutoOff(control.device_port, validEpochOrZero(), switchedOff);
    if (switchedOff != 0) {
        control.count_info++;
        Serial.printf("[TaskDevice] Auto OFF ports=0x%02X\n", switchedOff);
    }
}

static void processOnTimer(void)
{
    const uint32_t seconds = OnTimer::seconds();
    const uint8_t expired = onTimerTracker.update(control.device_port, seconds, millis());
    if (expired != 0) {
        control.device_port &= ~expired;
        control.count_info++;
        Serial.printf("[TaskDevice] On-timer OFF ports=0x%02X after %lu s\n", expired,
                      static_cast<unsigned long>(seconds));
    }
}

// Countdown auto ON, independent of schedules, see Countdown.h. It acts like
// a direct command, so it also cancels a pending schedule auto OFF.
static void processCountdown(void)
{
    const uint8_t ports = Countdown::takeExpired();
    if (ports != 0) {
        applyDirectCommand(ports, ports);
        Serial.printf("[TaskDevice] Countdown ON ports=0x%02X\n", ports);
    }
}

static void applyCommand(DeviceCommand &command)
{
    if (command.commandType == COMMAND_TYPE_CONTROL) {
        applyDirectCommand(command.portMask, command.commandValue);
    } else if (command.commandType == COMMAND_TYPE_SCHEDULE_CONTROL &&
               command.reserved == COMMAND_RESERVED_CONTROL) {
        applyScheduleCommand(command.portMask, command.commandValue, command.autoOffSeconds);
    } else {
        return;
    }
    command.reserved = COMMAND_RESERVED_NONE; // Mark as processed
    Serial.printf("[TaskDevice] Exec command type=%d mask=0x%02X value=0x%02X auto_off=%u -> port=0x%02X\n",
                  command.commandType, command.portMask, command.commandValue,
                  command.autoOffSeconds, control.device_port);
}

// Schedule commands are applied before a direct command received in the same
// cycle, so the direct command wins.
static void processScheduleCommands(void)
{
    DeviceCommand command;
    while (ScheduleEngine::receiveDeviceCommand(command)) {
        applyCommand(command);
    }
}

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
                        // long press (>= 3s) => toggle device_port (direct control)
                        applyDirectCommand(SYSTEM_TASK_SCHEDULE_PORT_MASK,
                                           control.device_port ^ SYSTEM_TASK_SCHEDULE_PORT_MASK);
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
    if((control.device_port & 0x01) != 0) {
        digitalWrite(OUTPUT_PUMP_PIN, HIGH); // Bật bơm
    } else {
        digitalWrite(OUTPUT_PUMP_PIN, LOW); // Tắt bơm
    }
}
void TaskDevice::controlDevice(void){
     if((control.device_port & 0x02) != 0) {
        digitalWrite(OUTPUT_DEVICE_1_PIN, HIGH); // Bật thiết bị 1
    } else {
        digitalWrite(OUTPUT_DEVICE_1_PIN, LOW); // Tắt thiết bị 1
    }
}

void TaskDevice::updateMemoryStatus(void){
    MemoryData::GetInstance().deviceStatus_->device_port = control.device_port;
    MemoryData::GetInstance().deviceStatus_->button_click = control.button_click;  
    MemoryData::GetInstance().deviceStatus_->button_status = control.button_status; 
    MemoryData::GetInstance().deviceStatus_->device_port_last = control.device_port_last; 
    MemoryData::GetInstance().deviceStatus_->count_info = control.count_info; 
}

void TaskDevice::taskRun(void * parameter) {
    //DEVICE_LOG_INFO("start TaskDevice::taskRun");
    #if SUPPORT_RTOS
        for(;;)
        { 
            TaskDevice::readButton();
            TaskDevice::controlPump();
            TaskDevice::controlDevice();
            vTaskDelay(DEVICE_TASK_PERIOD_MS / portTICK_PERIOD_MS);
            if(control.device_port!=control.device_port_last){
                control.device_port_last = control.device_port;
                // Report current device status to network
                if (deviceStatusQueue != NULL) {
                    xQueueSend(deviceStatusQueue, &control, pdMS_TO_TICKS(DEVICE_QUEUE_SEND_DELAY_MS));
                }

                // Receive command from network if available
                
            }
            processScheduleCommands();
            if (deviceCommandQueue != NULL) {
                DeviceCommand cmd_to_device;
                if (xQueueReceive(deviceCommandQueue, &cmd_to_device, 0) == pdTRUE) {
                    // apply command locally
                    applyCommand(cmd_to_device);
                }
            }
            processCountdown();
            processAutoOff();
            processOnTimer();
        }
        
    #else
        TaskDevice::updateMemoryStatus();
        TaskDevice::readButton();
        TaskDevice::controlPump();
        TaskDevice::controlDevice();
        processScheduleCommands();
        if(MemoryData::GetInstance().deviceCommand_ != NULL) {

            DeviceCommand* cmd_to_device = MemoryData::GetInstance().deviceCommand_;
            DEVICE_LOG_INFO("start TaskDevice::DeviceCommand commandType "+
                String(cmd_to_device->commandType) + " value=" +
                String(cmd_to_device->commandValue) + " reserved=" +
                String(cmd_to_device->reserved)  );
            if(cmd_to_device->commandType == COMMAND_TYPE_CONTROL && cmd_to_device->reserved) {
                applyCommand(*cmd_to_device);
                control.device_port_last = control.device_port;
            }
        }
        processCountdown();
        processAutoOff();
        processOnTimer();
        // The last direct command is no longer re-applied here: it would undo
        // every schedule and auto OFF change on the next cycle.
        if(control.device_port!=control.device_port_last){
            control.device_port_last = control.device_port;
            MemoryData::GetInstance().deviceStatus_ = &control;
        }
    #endif


}
