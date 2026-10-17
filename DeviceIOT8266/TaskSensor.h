#pragma once

#include "Common.h"

class TaskSensor {
public:
    void setup();
    static void taskRun(void* parameter);
    static bool copyLatest(InfoSensor& destination);

private:
    static void sampleAdc();
    static void sampleDht();
};