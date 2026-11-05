#include "TaskDevice.h"

#include "DebugInfo.h"
#include "MemoryData.h"
#include "PlatformCompat.h"
#include "ScheduleCore.h"
#include "ScheduleEngine.h"
#include "OnTimer.h"
#include "Countdown.h"

#include <time.h>

#if SUPPORT_RTOS
extern QueueHandle_t deviceCommandQueue;
extern QueueHandle_t deviceStatusQueue;
#endif

namespace {
InfoDeviceControl control = {};
bool statusDirty = true;
// Direct control priority and schedule auto OFF (spec_v1 §6), see ScheduleCore.h.
schedule::PortController portController;
// Auto OFF on-timer, independent of schedules, see OnTimer.h.
on_timer::Tracker onTimerTracker;
constexpr time_t kMinimumValidEpoch = 1704067200;

int64_t validEpochOrZero() {
    const time_t now = time(nullptr);
    return now >= kMinimumValidEpoch ? static_cast<int64_t>(now) : 0;
}

void processAutoOff() {
    uint8_t switchedOff = 0;
    const uint8_t nextPort = portController.processAutoOff(
        control.device_port, validEpochOrZero(), switchedOff);
    if (switchedOff == 0) {
        return;
    }
    control.device_port = nextPort;
    control.count_info++;
    statusDirty = true;
    DEVICE_LOG_INFO(String("[Device] Auto OFF ports=0x") + String(switchedOff, HEX));
}

void processOnTimer() {
    const uint32_t seconds = OnTimer::seconds();
    const uint8_t expired = onTimerTracker.update(control.device_port, seconds, millis());
    if (expired == 0) {
        return;
    }
    control.device_port &= static_cast<uint8_t>(~expired);
    control.count_info++;
    statusDirty = true;
    DEVICE_LOG_INFO(String("[Device] On-timer OFF ports=0x") + String(expired, HEX) +
                    " after " + seconds + " s");
}

// Countdown auto ON, independent of schedules, see Countdown.h. It acts like
// a direct command, so it also cancels a pending schedule auto OFF.
void processCountdown() {
    const uint8_t ports = Countdown::takeExpired() & DEVICE_OUTPUT_MASK;
    if (ports == 0) {
        return;
    }
    uint8_t cancelled = 0;
    control.device_port = portController.applyDirect(control.device_port, ports, ports, cancelled);
    control.count_info++;
    statusDirty = true;
    DEVICE_LOG_INFO(String("[Device] Countdown ON ports=0x") + String(ports, HEX));
}

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
                // Long press is direct control: it also cancels a pending auto OFF.
                uint8_t cancelled = 0;
                control.device_port = portController.applyDirect(
                    control.device_port, SYSTEM_TASK_SCHEDULE_PORT_MASK,
                    control.device_port ^ SYSTEM_TASK_SCHEDULE_PORT_MASK, cancelled);
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
    uint8_t nextPort = control.device_port;
    if (command.commandType == COMMAND_TYPE_SCHEDULE_CONTROL) {
        nextPort = portController.applySchedule(
            control.device_port, command.portMask & DEVICE_OUTPUT_MASK,
            command.commandValue, command.autoOffSeconds, validEpochOrZero());
    } else if (command.commandType == COMMAND_TYPE_CONTROL) {
        // com:1 without "mask" keeps its legacy meaning: value sets every output.
        const uint8_t mask = command.portMask != 0 ? command.portMask : 0xFF;
        uint8_t cancelled = 0;
        nextPort = portController.applyDirect(
            control.device_port, mask & DEVICE_OUTPUT_MASK, command.commandValue, cancelled);
        if (cancelled != 0) {
            DEVICE_LOG_INFO(String("[Device] Direct control cancels auto OFF, ports=0x") +
                            String(cancelled, HEX));
        }
    } else {
        return;
    }
    DEVICE_LOG_DEBUG(String("[Device] Command type=") + command.commandType +
                     " mask=0x" + String(command.portMask, HEX) +
                     " value=0x" + String(command.commandValue, HEX) +
                     " auto_off=" + command.autoOffSeconds +
                     " -> port=0x" + String(nextPort, HEX));
    if (control.device_port == nextPort) {
        return;
    }
    control.device_port = nextPort;
    control.count_info++;
    statusDirty = true;
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

        // Schedule commands first, so a direct command of the same cycle wins.
        DeviceCommand scheduled = {};
        while (ScheduleEngine::receiveDeviceCommand(scheduled)) {
            applyCommand(scheduled);
        }

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

        processCountdown();
        processAutoOff();
        processOnTimer();
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
