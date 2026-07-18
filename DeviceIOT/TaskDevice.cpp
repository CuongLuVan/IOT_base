
#include "TaskDevice.h"
#include <Arduino.h>
#include <math.h>
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
extern QueueHandle_t sensorDataQueue;
#else
#endif

InfoDeviceControl control;
static bool flightEnabled = false;
static float rollPidIntegral = 0.0f;
static float pitchPidIntegral = 0.0f;
static float yawPidIntegral = 0.0f;
static float lastRollError = 0.0f;
static float lastPitchError = 0.0f;
static float lastYawError = 0.0f;
static uint8_t activeControlMode = 0;
static int16_t targetThrottle = 0;
static int16_t targetMoveX = 0;
static int16_t targetMoveY = 0;
static int16_t targetAround = 0;
static InfoSensor latestSensor;
static bool motorsArmed = false;
static bool armPending = false;
static unsigned long armStartTime = 0;

static void stopMotors(void) {
    ledcWrite(0, 0);
    ledcWrite(1, 0);
    ledcWrite(2, 0);
    ledcWrite(3, 0);
}

static void updateArmState(const InfoSensor &sensor) {
    if (!flightEnabled || targetThrottle <= MOTOR_DISARM_THROTTLE) {
        if (motorsArmed || armPending) {
            motorsArmed = false;
            armPending = false;
            stopMotors();
            Serial.println("[TaskDevice] Disarmed");
        }
        return;
    }

    if (motorsArmed) {
        if (fabs(sensor.rollAngle) > MOTOR_ABORT_TILT_DEG || fabs(sensor.pitchAngle) > MOTOR_ABORT_TILT_DEG) {
            motorsArmed = false;
            armPending = false;
            stopMotors();
            Serial.println("[TaskDevice] Tilt too high, disarmed");
        }
        return;
    }

    if (!armPending) {
        armPending = true;
        armStartTime = millis();
    }

    if (targetThrottle >= MOTOR_ARM_START_THROTTLE && fabs(sensor.rollAngle) <= MOTOR_LEVEL_TOLERANCE_DEG && fabs(sensor.pitchAngle) <= MOTOR_LEVEL_TOLERANCE_DEG) {
        if ((millis() - armStartTime) >= MOTOR_ARM_DELAY_MS) {
            motorsArmed = true;
            armPending = false;
            Serial.println("[TaskDevice] Armed");
        }
    } else {
        armPending = false;
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

    pinMode(MOTOR_FRONT_LEFT_PIN, OUTPUT);
    pinMode(MOTOR_FRONT_RIGHT_PIN, OUTPUT);
    pinMode(MOTOR_BACK_LEFT_PIN, OUTPUT);
    pinMode(MOTOR_BACK_RIGHT_PIN, OUTPUT);

    ledcSetup(0, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);
    ledcSetup(1, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);
    ledcSetup(2, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);
    ledcSetup(3, MOTOR_PWM_FREQ, MOTOR_PWM_RESOLUTION);

    ledcAttachPin(MOTOR_FRONT_LEFT_PIN, 0);
    ledcAttachPin(MOTOR_FRONT_RIGHT_PIN, 1);
    ledcAttachPin(MOTOR_BACK_LEFT_PIN, 2);
    ledcAttachPin(MOTOR_BACK_RIGHT_PIN, 3);

    ledcWrite(0, 0);
    ledcWrite(1, 0);
    ledcWrite(2, 0);
    ledcWrite(3, 0);

    resetFlightPid();
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

            if (buttonState == LOW) {
                pressStart = millis();
            } else {
                if (pressStart > 0) {
                    unsigned long pressDuration = millis() - pressStart;
                    if (pressDuration >= longPressTime) {
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

void TaskDevice::controlPump(void) {
    if ((control.device_port | 0x01) == 1) {
        digitalWrite(OUTPUT_PUMP_PIN, HIGH);
    } else {
        digitalWrite(OUTPUT_PUMP_PIN, LOW);
    }
}

void TaskDevice::controlDevice(void) {
    if ((control.device_port | 0x02) == 0x02) {
        digitalWrite(OUTPUT_DEVICE_1_PIN, HIGH);
    } else {
        digitalWrite(OUTPUT_DEVICE_1_PIN, LOW);
    }
}

void TaskDevice::resetFlightPid(void) {
    rollPidIntegral = 0.0f;
    pitchPidIntegral = 0.0f;
    yawPidIntegral = 0.0f;
    lastRollError = 0.0f;
    lastPitchError = 0.0f;
    lastYawError = 0.0f;
}

void TaskDevice::setFlightCommand(uint8_t controlMode, int16_t throttle, int16_t moveX, int16_t moveY, int16_t around) {
    activeControlMode = controlMode;
    targetThrottle = constrain(throttle, 0, MOTOR_PWM_MAX);
    targetMoveX = moveX;
    targetMoveY = moveY;
    targetAround = around;
    flightEnabled = (controlMode == 3);
    if (!flightEnabled) {
        resetFlightPid();
    }
}

void TaskDevice::applyFlightControl(const InfoSensor &sensor) {
    updateArmState(sensor);

    if (!flightEnabled || !motorsArmed || targetThrottle < MOTOR_DISARM_THROTTLE) {
        stopMotors();
        return;
    }

    float rollTarget = constrain(targetMoveX / 10.0f, -12.0f, 12.0f);
    float pitchTarget = constrain(targetMoveY / 10.0f, -12.0f, 12.0f);
    float yawTarget = constrain(targetAround / 10.0f, -180.0f, 180.0f);

    float rollError = rollTarget - sensor.rollAngle;
    float pitchError = pitchTarget - sensor.pitchAngle;
    float yawError = yawTarget - sensor.yawRate;

    const float dt = 0.02f;
    rollPidIntegral = constrain(rollPidIntegral + rollError * dt, -1000.0f, 1000.0f);
    pitchPidIntegral = constrain(pitchPidIntegral + pitchError * dt, -1000.0f, 1000.0f);
    yawPidIntegral = constrain(yawPidIntegral + yawError * dt, -1000.0f, 1000.0f);

    float rollCorrection = (rollError * 2.3f) + (rollPidIntegral * 0.02f) + ((rollError - lastRollError) / dt) * 0.08f;
    float pitchCorrection = (pitchError * 2.3f) + (pitchPidIntegral * 0.02f) + ((pitchError - lastPitchError) / dt) * 0.08f;
    float yawCorrection = (yawError * 1.0f) + (yawPidIntegral * 0.01f) + ((yawError - lastYawError) / dt) * 0.05f;

    lastRollError = rollError;
    lastPitchError = pitchError;
    lastYawError = yawError;

    int safeThrottle = constrain(static_cast<int>(targetThrottle), MOTOR_PWM_MIN, MOTOR_PWM_SAFE_MAX);
    int motorFrontLeft = constrain(static_cast<int>(safeThrottle + pitchCorrection + rollCorrection - yawCorrection), 0, MOTOR_PWM_SAFE_MAX);
    int motorFrontRight = constrain(static_cast<int>(safeThrottle - pitchCorrection + rollCorrection + yawCorrection), 0, MOTOR_PWM_SAFE_MAX);
    int motorBackLeft = constrain(static_cast<int>(safeThrottle - pitchCorrection - rollCorrection - yawCorrection), 0, MOTOR_PWM_SAFE_MAX);
    int motorBackRight = constrain(static_cast<int>(safeThrottle + pitchCorrection - rollCorrection + yawCorrection), 0, MOTOR_PWM_SAFE_MAX);

    ledcWrite(0, motorFrontLeft);
    ledcWrite(1, motorFrontRight);
    ledcWrite(2, motorBackLeft);
    ledcWrite(3, motorBackRight);
}

void TaskDevice::updateMemoryStatus(void) {
    MemoryData::GetInstance().deviceStatus_->device_port = control.device_port;
    MemoryData::GetInstance().deviceStatus_->button_click = control.button_click;
    MemoryData::GetInstance().deviceStatus_->button_status = control.button_status;
    MemoryData::GetInstance().deviceStatus_->device_port_last = control.device_port_last;
    MemoryData::GetInstance().deviceStatus_->count_info = control.count_info;
}

void TaskDevice::taskRun(void * parameter) {
#if SUPPORT_RTOS
    for (;;) {
        TaskDevice::readButton();
        TaskDevice::controlPump();
        TaskDevice::controlDevice();

        if (sensorDataQueue != NULL) {
            InfoSensor incomingSensor;
            if (xQueueReceive(sensorDataQueue, &incomingSensor, 0) == pdTRUE) {
                latestSensor = incomingSensor;
            }
        }

        if (deviceCommandQueue != NULL) {
            DeviceCommand cmd_to_device;
            if (xQueueReceive(deviceCommandQueue, &cmd_to_device, 0) == pdTRUE) {
                if (cmd_to_device.commandType == COMMAND_TYPE_CONTROL) {
                    TaskDevice::setFlightCommand(cmd_to_device.controlMode, cmd_to_device.throttle, cmd_to_device.moveX, cmd_to_device.moveY, cmd_to_device.around);
                    control.device_port = cmd_to_device.commandValue;
                    control.count_info++;
                }
                Serial.printf("[TaskDevice] Exec command type=%d value=%d\n", cmd_to_device.commandType, cmd_to_device.commandValue);
            }
        }

        TaskDevice::applyFlightControl(latestSensor);

        if (control.device_port != control.device_port_last) {
            control.device_port_last = control.device_port;
            if (deviceStatusQueue != NULL) {
                xQueueSend(deviceStatusQueue, &control, pdMS_TO_TICKS(DEVICE_QUEUE_SEND_DELAY_MS));
            }
        }

        vTaskDelay(DEVICE_TASK_PERIOD_MS / portTICK_PERIOD_MS);
    }
#else
    TaskDevice::updateMemoryStatus();
    TaskDevice::readButton();
    TaskDevice::controlPump();
    TaskDevice::controlDevice();

    if (MemoryData::GetInstance().sensorData_ != NULL) {
        latestSensor = *MemoryData::GetInstance().sensorData_;
    }

    if (MemoryData::GetInstance().deviceCommand_ != NULL) {
        DeviceCommand *cmd_to_device = MemoryData::GetInstance().deviceCommand_;
        if (cmd_to_device->commandType == COMMAND_TYPE_CONTROL && cmd_to_device->reserved) {
            TaskDevice::setFlightCommand(cmd_to_device->controlMode, cmd_to_device->throttle, cmd_to_device->moveX, cmd_to_device->moveY, cmd_to_device->around);
            control.device_port = cmd_to_device->commandValue;
            control.device_port_last = cmd_to_device->commandValue;
            cmd_to_device->reserved = 0;
            control.count_info++;
        }
    }

    TaskDevice::applyFlightControl(latestSensor);
    if (control.device_port != control.device_port_last) {
        control.device_port_last = control.device_port;
        MemoryData::GetInstance().deviceStatus_ = &control;
    }
#endif
}
