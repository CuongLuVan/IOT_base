
#include "TaskDevice.h"
#include <Arduino.h>
#include <math.h>
#include <esp32-hal-ledc.h>
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

static QuadControlInput flightInput = {0, 0, 0, 0, 0};
static bool escReady = false;
static InfoSensor latestSensorData = {0};
static float rollIntegral = 0.0f;
static float pitchIntegral = 0.0f;
static float yawIntegral = 0.0f;
static float lastRollError = 0.0f;
static float lastPitchError = 0.0f;
static float lastYawError = 0.0f;
static unsigned long lastFlightCycleMs = 0;

static void initEscOutputs(void)
{
    ledcSetup(0, ESC_PWM_FREQUENCY_HZ, ESC_PWM_RESOLUTION_BITS);
    ledcSetup(1, ESC_PWM_FREQUENCY_HZ, ESC_PWM_RESOLUTION_BITS);
    ledcSetup(2, ESC_PWM_FREQUENCY_HZ, ESC_PWM_RESOLUTION_BITS);
    ledcSetup(3, ESC_PWM_FREQUENCY_HZ, ESC_PWM_RESOLUTION_BITS);

    ledcAttachPin(MOTOR_ESC_PIN_1, 0);
    ledcAttachPin(MOTOR_ESC_PIN_2, 1);
    ledcAttachPin(MOTOR_ESC_PIN_3, 2);
    ledcAttachPin(MOTOR_ESC_PIN_4, 3);

    for (uint8_t i = 0; i < 4; ++i) {
        ledcWrite(i, 0);
    }

    escReady = true;
}

static void setMotorPulse(uint8_t channel, int pulseUs)
{
    if (!escReady) {
        return;
    }

    pulseUs = constrain(pulseUs, ESC_MIN_PULSE_US, ESC_MAX_PULSE_US);
    uint32_t duty = map(pulseUs, ESC_MIN_PULSE_US, ESC_MAX_PULSE_US, 0, (1UL << ESC_PWM_RESOLUTION_BITS) - 1);
    ledcWrite(channel, duty);
}

static void updateFlightControl(void)
{
    if (!escReady) {
        return;
    }

    float rollOut = latestSensorData.rollAngle;
    float pitchOut = latestSensorData.pitchAngle;
    float yawRateOut = latestSensorData.yawRate;
    unsigned long nowMs = millis();
    float dt = max((nowMs - lastFlightCycleMs) / 1000.0f, 0.001f);
    lastFlightCycleMs = nowMs;

    if (flightInput.controlMode == 3) {
        float rollSetpoint = constrain((float)flightInput.moveX / 1000.0f * 18.0f, -18.0f, 18.0f);
        float pitchSetpoint = constrain((float)flightInput.moveY / 1000.0f * 18.0f, -18.0f, 18.0f);
        float yawSetpoint = constrain((float)flightInput.around / 1000.0f * 180.0f, -180.0f, 180.0f);

        float rollError = rollSetpoint - rollOut;
        float pitchError = pitchSetpoint - pitchOut;
        float yawError = yawSetpoint - yawRateOut;

        rollIntegral += rollError * dt;
        pitchIntegral += pitchError * dt;
        yawIntegral += yawError * dt;

        float rollDerivative = (rollError - lastRollError) / dt;
        float pitchDerivative = (pitchError - lastPitchError) / dt;
        float yawDerivative = (yawError - lastYawError) / dt;

        lastRollError = rollError;
        lastPitchError = pitchError;
        lastYawError = yawError;

        float kpRoll = 2.0f;
        float kiRoll = 0.05f;
        float kdRoll = 0.12f;
        float kpPitch = 2.0f;
        float kiPitch = 0.05f;
        float kdPitch = 0.12f;
        float kpYaw = 0.35f;
        float kiYaw = 0.01f;
        float kdYaw = 0.02f;

        float rollCorrection = constrain(kpRoll * rollError + kiRoll * rollIntegral + kdRoll * rollDerivative, -220.0f, 220.0f);
        float pitchCorrection = constrain(kpPitch * pitchError + kiPitch * pitchIntegral + kdPitch * pitchDerivative, -220.0f, 220.0f);
        float yawCorrection = constrain(kpYaw * yawError + kiYaw * yawIntegral + kdYaw * yawDerivative, -220.0f, 220.0f);

        int throttlePulse = map(constrain(flightInput.throttle, 0, 1000), 0, 1000, ESC_ARM_PULSE_US, ESC_MAX_PULSE_US);
        int m1 = throttlePulse + (int)constrain(pitchCorrection + rollCorrection + yawCorrection, -220, 220);
        int m2 = throttlePulse + (int)constrain(pitchCorrection - rollCorrection - yawCorrection, -220, 220);
        int m3 = throttlePulse + (int)constrain(-pitchCorrection + rollCorrection - yawCorrection, -220, 220);
        int m4 = throttlePulse + (int)constrain(-pitchCorrection - rollCorrection + yawCorrection, -220, 220);

        setMotorPulse(0, m1);
        setMotorPulse(1, m2);
        setMotorPulse(2, m3);
        setMotorPulse(3, m4);
    } else {
        rollIntegral = 0.0f;
        pitchIntegral = 0.0f;
        yawIntegral = 0.0f;
        lastRollError = 0.0f;
        lastPitchError = 0.0f;
        lastYawError = 0.0f;
        setMotorPulse(0, ESC_ARM_PULSE_US);
        setMotorPulse(1, ESC_ARM_PULSE_US);
        setMotorPulse(2, ESC_ARM_PULSE_US);
        setMotorPulse(3, ESC_ARM_PULSE_US);
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
    initEscOutputs();
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
    MemoryData::GetInstance().deviceStatus_->device_port_last = control.device_port_last; 
    MemoryData::GetInstance().deviceStatus_->count_info = control.count_info; 
}

void TaskDevice::setFlightCommand(uint8_t controlMode, int16_t throttle, int16_t moveX, int16_t moveY, int16_t around)
{
    flightInput.controlMode = controlMode;
    flightInput.throttle = constrain(throttle, 0, 1000);
    flightInput.moveX = constrain(moveX, -1000, 1000);
    flightInput.moveY = constrain(moveY, -1000, 1000);
    flightInput.around = constrain(around, -1000, 1000);
}

void TaskDevice::resetFlightCommand(void)
{
    flightInput.controlMode = 0;
    flightInput.throttle = 0;
    flightInput.moveX = 0;
    flightInput.moveY = 0;
    flightInput.around = 0;
}

void TaskDevice::taskRun(void * parameter) {
    //DEVICE_LOG_INFO("start TaskDevice::taskRun");
    #if SUPPORT_RTOS
        for(;;)
        { 
            TaskDevice::readButton();
            TaskDevice::controlPump();
            TaskDevice::controlDevice();
            if (sensorDataQueue != NULL) {
                InfoSensor sensorPacket;
                if (xQueueReceive(sensorDataQueue, &sensorPacket, 0) == pdTRUE) {
                    latestSensorData = sensorPacket;
                }
            }
            updateFlightControl();
            vTaskDelay(DEVICE_TASK_PERIOD_MS / portTICK_PERIOD_MS);
            if(control.device_port!=control.device_port_last){
                control.device_port_last = control.device_port;
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
                        if (cmd_to_device.controlMode != 0 || cmd_to_device.throttle != 0 || cmd_to_device.moveX != 0 || cmd_to_device.moveY != 0 || cmd_to_device.around != 0) {
                            TaskDevice::setFlightCommand(cmd_to_device.controlMode, cmd_to_device.throttle, cmd_to_device.moveX, cmd_to_device.moveY, cmd_to_device.around);
                        }
                        cmd_to_device.reserved = 1; // Mark as processed
                        control.count_info++;
                    }
                    
                    Serial.printf("[TaskDevice] Exec command type=%d value=%d\n", cmd_to_device.commandType, cmd_to_device.commandValue);
                }
            }
        }
        
    #else
        TaskDevice::updateMemoryStatus();
        TaskDevice::readButton();
        TaskDevice::controlPump();
        TaskDevice::controlDevice();
        if (MemoryData::GetInstance().sensorData_ != NULL) {
            latestSensorData = *MemoryData::GetInstance().sensorData_;
        }
        updateFlightControl();
        if(MemoryData::GetInstance().deviceCommand_ != NULL) {
            
            DeviceCommand* cmd_to_device = MemoryData::GetInstance().deviceCommand_;
            DEVICE_LOG_INFO("start TaskDevice::DeviceCommand commandType "+ 
                String(cmd_to_device->commandType) + " value=" + 
                String(cmd_to_device->commandValue) + " reserved=" + 
                String(cmd_to_device->reserved)  );
            if(cmd_to_device->commandType== COMMAND_TYPE_CONTROL&&cmd_to_device->reserved) {
                control.device_port = cmd_to_device->commandValue;
                control.device_port_last = cmd_to_device->commandValue;
                if (cmd_to_device->controlMode != 0 || cmd_to_device->throttle != 0 || cmd_to_device->moveX != 0 || cmd_to_device->moveY != 0 || cmd_to_device->around != 0) {
                    TaskDevice::setFlightCommand(cmd_to_device->controlMode, cmd_to_device->throttle, cmd_to_device->moveX, cmd_to_device->moveY, cmd_to_device->around);
                }
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
                    if (cmd_to_device->controlMode != 0 || cmd_to_device->throttle != 0 || cmd_to_device->moveX != 0 || cmd_to_device->moveY != 0 || cmd_to_device->around != 0) {
                        TaskDevice::setFlightCommand(cmd_to_device->controlMode, cmd_to_device->throttle, cmd_to_device->moveX, cmd_to_device->moveY, cmd_to_device->around);
                    }
                    cmd_to_device->reserved = 0; // Mark as processed
                    control.count_info++;
                }
            }
        }
    #endif


}
