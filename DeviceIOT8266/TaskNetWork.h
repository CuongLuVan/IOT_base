#pragma once

class TaskNetWork {
public:
    void setup();
    static void taskRun(void* parameter);
    static void loopNetWork();
};