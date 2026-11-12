#pragma once

#include "Common.h"

// Reads the sensors. Other modules read the latest values with copyLatest().
class TaskSensor {
public:
    // Sensor drivers. Call from app_main() before any task starts.
    static void setup();
    // FreeRTOS task body.
    static void taskRun(void* parameter);
    // One step.
    static void service();

    // Latest values; sampleSequence increases with every new sample, so a
    // reader detects new data by comparing it. false before the first sample.
    static bool copyLatest(InfoSensor& destination);
};
