#pragma once

#include <stdint.h>

#include "Common.h"
#include "define_All.h"

// Owns the outputs and the device button. Other modules never touch the
// outputs: they post commands, and read the state with copyStatus().
class TaskDevice {
public:
    // Pins, command queue, initial state. Call from app_main() before any task starts.
    static void setup();
    // FreeRTOS task body: service() every DEVICE_TASK_PERIOD_MS, task
    // watchdog and heartbeat check of the other tasks.
    static void taskRun(void* parameter);
    // One cycle.
    static void service();

    // MQTT / LAN / HTTP: queue a command for the outputs. false when the queue
    // stays full for timeoutMs (answer rs = CommandStatus::NotReady).
    static bool postCommand(const DeviceCommand& command, uint32_t timeoutMs = COMMAND_QUEUE_TIMEOUT_MS);

    // Latest output state; count_info increases on every change, so a reader
    // detects a change by comparing it. false before setup().
    static bool copyStatus(InfoDeviceControl& destination);
};
