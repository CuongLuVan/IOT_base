// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "TaskDevice.h"

#include <Arduino.h>

#include "ButtonInput.h"
#include "Clock.h"
#include "Countdown.h"
#include "DebugInfo.h"
#include "OnTimer.h"
#include "PortArbiter.h"
#include "ScheduleEngine.h"
#include "Sync.h"
#include "TaskWatchdog.h"
#include "ThresholdControl.h"

namespace {

// Output pins, one per bit of DEVICE_OUTPUT_MASK (board_pins.h).
struct OutputPin {
    uint8_t bit;
    int pin;
};

constexpr OutputPin kOutputs[] = {
    {0x01, OUTPUT_PUMP_PIN},
#if (DEVICE_OUTPUT_MASK & 0x02) != 0
    {0x02, OUTPUT_DEVICE_1_PIN},
#endif
};

constexpr uint8_t outputBits(size_t index = 0)
{
    return index == sizeof(kOutputs) / sizeof(kOutputs[0]) ? 0 : kOutputs[index].bit | outputBits(index + 1);
}

static_assert(outputBits() == DEVICE_OUTPUT_MASK, "every bit of DEVICE_OUTPUT_MASK needs an entry in kOutputs");

// Upper bound of commands applied in one cycle; the rest wait for the next one.
constexpr size_t kMaxScheduleEventsPerCycle = 10;
// How often TaskDevice checks the heartbeats of the other tasks (SystemTask
// checks them too; each covers the other).
constexpr uint32_t kHeartbeatCheckIntervalMs = 1000;

// Network task -> TaskDevice.
platform_sync::Queue<DeviceCommand, DEVICE_COMMAND_QUEUE_LENGTH> commandQueue;

// Published state: written by TaskDevice, read by copyStatus() in other tasks.
InfoDeviceControl publishedStatus = {};
bool ready = false;

// TaskDevice only.
port_arbiter::Arbiter arbiter(DEVICE_OUTPUT_MASK, BUTTON_TOGGLE_PORT_MASK);
ButtonInput button;
uint8_t outputPort = 0;
// NON-OS: service() runs from a recurrent scheduled function; never nest it.
bool serviceRunning = false;

void writeOutputs(uint8_t port)
{
    for (const OutputPin& output : kOutputs) {
        digitalWrite(output.pin, (port & output.bit) != 0 ? HIGH : LOW);
    }
}

// Returns true when the button was released after a long press (toggle);
// every release counts as a click.
bool pollButton(uint32_t nowMs, bool& clicked)
{
    clicked = false;
    if (button.update(nowMs) != ButtonInput::Event::Released) return false;
    clicked = true;
    return button.heldMs(nowMs) >= BUTTON_LONG_PRESS_MS;
}

size_t drainScheduleEvents(port_arbiter::ScheduleEvent* events)
{
    size_t count = 0;
    DeviceCommand command;
    while (count < kMaxScheduleEventsPerCycle && ScheduleEngine::receiveDeviceCommand(command)) {
        events[count++] = {command.portMask, command.commandValue, command.autoOffSeconds};
    }
    return count;
}

size_t drainDirectCommands(port_arbiter::DirectCommand* commands)
{
    size_t count = 0;
    DeviceCommand command;
    while (count < DEVICE_COMMAND_QUEUE_LENGTH && commandQueue.pop(command)) {
        if (command.commandType != COMMAND_TYPE_CONTROL) {
            DEVICE_LOGF_WARNING("[Device] Ignored command type %u\n", command.commandType);
            continue;
        }
        DEVICE_LOGF_DEBUG("[Device] Command mask=0x%02X value=0x%02X\n", command.portMask, command.commandValue);
        commands[count++] = {command.portMask, command.commandValue};
    }
    return count;
}

void logReport(const port_arbiter::Inputs& inputs, const port_arbiter::Report& report)
{
    if (inputs.thresholdOn != 0 || inputs.thresholdOff != 0) {
        DEVICE_LOGF_DEBUG("[Device] Threshold on=0x%02X off=0x%02X\n", inputs.thresholdOn, inputs.thresholdOff);
    }
    if (inputs.countdownOn != 0) DEVICE_LOGF_INFO("[Device] Countdown ON ports=0x%02X\n", inputs.countdownOn);
    if (inputs.buttonToggle) DEVICE_LOG_INFO("[Device] Button long press: toggle");
    if (report.autoOffCancelled != 0) {
        DEVICE_LOGF_INFO("[Device] Direct control cancels auto OFF, ports=0x%02X\n", report.autoOffCancelled);
    }
    if (report.autoOffSwitched != 0) DEVICE_LOGF_INFO("[Device] Auto OFF ports=0x%02X\n", report.autoOffSwitched);
    if (report.onTimerExpired != 0) {
        DEVICE_LOGF_INFO("[Device] On-timer OFF ports=0x%02X after %lu s\n", report.onTimerExpired,
                         static_cast<unsigned long>(inputs.onTimerSeconds));
    }
}

void publish(uint8_t port, bool clicked)
{
    platform_sync::CriticalSection section;
    publishedStatus.device_port_last = publishedStatus.device_port;
    publishedStatus.device_port = port;
    if (clicked) publishedStatus.button_click++;
    publishedStatus.count_info++;
}

// One cycle: commands, button, automation inputs, outputs.
void serviceOnce()
{
    const uint32_t nowMs = millis();

    port_arbiter::ScheduleEvent schedules[kMaxScheduleEventsPerCycle];
    port_arbiter::DirectCommand directs[DEVICE_COMMAND_QUEUE_LENGTH];
    port_arbiter::Inputs inputs;
    inputs.schedules = schedules;
    inputs.scheduleCount = drainScheduleEvents(schedules);
    inputs.directs = directs;
    inputs.directCount = drainDirectCommands(directs);
    bool clicked = false;
    inputs.buttonToggle = pollButton(nowMs, clicked);
    (void)ThresholdControl::takeActions(inputs.thresholdOn, inputs.thresholdOff);
    inputs.countdownOn = Countdown::takeExpired();
    inputs.onTimerSeconds = OnTimer::seconds();
    inputs.nowEpoch = device_clock::epochOrZero();
    inputs.nowMs = nowMs;

    port_arbiter::Report report;
    const uint8_t port = arbiter.step(outputPort, inputs, report);
    logReport(inputs, report);

    if (port == outputPort && !clicked) return;
    if (port != outputPort) {
        DEVICE_LOGF_DEBUG("[Device] port 0x%02X -> 0x%02X\n", outputPort, port);
        outputPort = port;
        writeOutputs(outputPort);
    }
    publish(outputPort, clicked);
}

}  // namespace

void TaskDevice::setup()
{
    for (const OutputPin& output : kOutputs) pinMode(output.pin, OUTPUT);
    pinMode(INPUT_PULLUP_PIN, INPUT_PULLUP);
    button.begin(DEVICE_BUTTON_PIN, INPUT_PULLUP, true, BUTTON_DEBOUNCE_MS);
    outputPort = 0;
    writeOutputs(outputPort);
    if (!commandQueue.create()) {
        DEVICE_LOG_ERROR("[Device] Cannot create command queue; MQTT / LAN control disabled");
    }
    {
        platform_sync::CriticalSection section;
        publishedStatus = {};
        ready = true;
    }
    DEVICE_LOG_INFO("[Device] Outputs and button initialized");
}

void TaskDevice::taskRun(void* parameter)
{
    (void)parameter;
#if SUPPORT_RTOS
    task_watchdog::add(task_watchdog::Slot::Device);
    uint32_t lastHeartbeatCheckMs = millis();
    for (;;) {
        service();
        task_watchdog::reset(task_watchdog::Slot::Device);
        const uint32_t nowMs = millis();
        if (nowMs - lastHeartbeatCheckMs >= kHeartbeatCheckIntervalMs) {
            lastHeartbeatCheckMs = nowMs;
            task_watchdog::restartIfStalled();
        }
        vTaskDelay(platform_sync::timeoutTicks(DEVICE_TASK_PERIOD_MS));
    }
#endif
}

void TaskDevice::service()
{
    if (serviceRunning) return;
    serviceRunning = true;
    serviceOnce();
    serviceRunning = false;
}

bool TaskDevice::postCommand(const DeviceCommand& command, uint32_t timeoutMs)
{
    if (!commandQueue.push(command, timeoutMs)) {
        DEVICE_LOG_WARNING("[Device] Command queue full; command rejected");
        return false;
    }
    return true;
}

bool TaskDevice::copyStatus(InfoDeviceControl& destination)
{
    platform_sync::CriticalSection section;
    if (!ready) return false;
    destination = publishedStatus;
    return true;
}
