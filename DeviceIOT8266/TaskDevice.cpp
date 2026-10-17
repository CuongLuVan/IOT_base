#include "TaskDevice.h"

#include "DebugInfo.h"
#include "MemoryData.h"
#include "PlatformCompat.h"

#if SUPPORT_RTOS
extern QueueHandle_t deviceCommandQueue;
extern QueueHandle_t deviceStatusQueue;
#endif

namespace {
InfoDeviceControl control = {};
bool statusDirty = true;

#if SUPPORT_RTOS
SemaphoreHandle_t deviceMutex = nullptr;

TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif
} // namespace

void TaskDevice::setup() {
    control = {};
    pinMode(DEVICE_BUTTON_PIN, INPUT_PULLUP);
    pinMode(INPUT_PULLUP_PIN, INPUT_PULLUP);
    pinMode(OUTPUT_PUMP_PIN, OUTPUT);
#if SUPPORT_DEVICE_OUTPUT_1
    pinMode(OUTPUT_DEVICE_1_PIN, OUTPUT);
#endif
    controlOutputs();

#if SUPPORT_RTOS
    if (deviceMutex == nullptr) {
        deviceMutex = xSemaphoreCreateMutex();
        if (deviceMutex == nullptr) {
            DEVICE_LOG_ERROR("[Device] Cannot create device mutex");
        }
    }
#endif
    MemoryData::GetInstance().deviceStatus_ = &control;
    DEVICE_LOG_INFO("[Device] GPIO task initialized");
}

void TaskDevice::readButton() {
    static int lastReading = HIGH;
    static int stableState = HIGH;
    static uint32_t lastDebounceMs = 0;
    static uint32_t pressedAtMs = 0;

    const int reading = digitalRead(DEVICE_BUTTON_PIN);
    const uint32_t now = millis();
    if (reading != lastReading) {
        lastDebounceMs = now;
    }
    if (now - lastDebounceMs >= BUTTON_DEBOUNCE_MS && reading != stableState) {
        stableState = reading;
        if (stableState == LOW) {
            pressedAtMs = now;
        } else if (pressedAtMs != 0) {
            const uint32_t duration = now - pressedAtMs;
            pressedAtMs = 0;
            control.button_click++;
            statusDirty = true;
            if (duration >= BUTTON_LONG_PRESS_MS) {
                control.device_port ^= SYSTEM_TASK_SCHEDULE_PORT_MASK;
                control.count_info++;
                statusDirty = true;
            }
        }
    }
    lastReading = reading;
}

void TaskDevice::controlOutputs() {
    digitalWrite(OUTPUT_PUMP_PIN,
                 (control.device_port & 0x01) != 0 ? HIGH : LOW);
#if SUPPORT_DEVICE_OUTPUT_1
    digitalWrite(OUTPUT_DEVICE_1_PIN,
                 (control.device_port & 0x02) != 0 ? HIGH : LOW);
#endif
}

void TaskDevice::applyCommand(const DeviceCommand& command) {
    if (command.reserved != COMMAND_RESERVED_CONTROL) {
        return;
    }
    if (command.commandType == COMMAND_TYPE_SCHEDULE_CONTROL) {
        const uint8_t nextPort = command.commandValue != 0
            ? static_cast<uint8_t>(control.device_port | SYSTEM_TASK_SCHEDULE_PORT_MASK)
            : static_cast<uint8_t>(control.device_port & ~SYSTEM_TASK_SCHEDULE_PORT_MASK);
        if (control.device_port == nextPort) {
            return;
        }
        control.device_port = nextPort;
        control.count_info++;
        statusDirty = true;
        return;
    }
    if (command.commandType == COMMAND_TYPE_CONTROL &&
        control.device_port != command.commandValue) {
        control.device_port = command.commandValue & DEVICE_OUTPUT_MASK;
        control.count_info++;
        statusDirty = true;
    }
}

void TaskDevice::publishStatus() {
    control.device_port_last = control.device_port;
    MemoryData::GetInstance().deviceStatus_ = &control;
#if SUPPORT_RTOS
    if (deviceStatusQueue != nullptr) {
        (void)xQueueOverwrite(deviceStatusQueue, &control);
    }
#endif
    statusDirty = false;
}

bool TaskDevice::copyStatus(InfoDeviceControl& destination) {
#if SUPPORT_RTOS
    if (deviceMutex != nullptr) {
        if (xSemaphoreTake(deviceMutex, delayTicks(10)) != pdTRUE) {
            return false;
        }
        destination = control;
        xSemaphoreGive(deviceMutex);
        return true;
    }
#endif
    destination = control;
    return true;
}

void TaskDevice::taskRun(void* parameter) {
    (void)parameter;
#if SUPPORT_RTOS
    for (;;) {
#else
    {
#endif
#if SUPPORT_RTOS
        const bool locked = deviceMutex == nullptr ||
            xSemaphoreTake(deviceMutex, delayTicks(10)) == pdTRUE;
        if (!locked) {
            vTaskDelay(delayTicks(DEVICE_TASK_PERIOD_MS));
            continue;
        }
#endif

#if SUPPORT_RTOS
        if (deviceCommandQueue != nullptr) {
            DeviceCommand command = {};
            while (xQueueReceive(deviceCommandQueue, &command, 0) == pdTRUE) {
                applyCommand(command);
            }
        }
#else
        DeviceCommand* command = MemoryData::GetInstance().deviceCommand_;
        if (command != nullptr && command->reserved == COMMAND_RESERVED_CONTROL) {
            applyCommand(*command);
            command->reserved = COMMAND_RESERVED_NONE;
        }
#endif

        readButton();
        controlOutputs();
        if (statusDirty || control.device_port != control.device_port_last) {
            publishStatus();
        }

#if SUPPORT_RTOS
        if (deviceMutex != nullptr) {
            xSemaphoreGive(deviceMutex);
        }
        vTaskDelay(delayTicks(DEVICE_TASK_PERIOD_MS));
#endif
    }
}
