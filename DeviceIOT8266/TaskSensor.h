#pragma once

#include "Common.h"

// Reads the sensors. Other modules read the latest values with copyLatest().
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).
class TaskSensor {
public:
    // Sensor drivers. Call from setup() before any task starts.
    static void setup();
    // SUPPORT_RTOS task body.
    static void taskRun(void* parameter);
    // One step; called from loop() when SUPPORT_RTOS is 0.
    static void service();

    // Latest values; sampleSequence increases with every new sample, so a
    // reader detects new data by comparing it. false before the first sample.
    static bool copyLatest(InfoSensor& destination);
};
