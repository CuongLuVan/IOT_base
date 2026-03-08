#ifndef TASK_H
#define TASK_H

#include <thread>
#include <atomic>
#include <chrono>
#include "Config.h"

class Task {
public:
    Task(int period_ms = 1000) : period(period_ms), running(false) {}
    virtual ~Task() {
#if SUPPORT_RTOS
        stop();
#endif
    }

    // Start the task (spawn thread if RTOS enabled)
    void start() {
#if SUPPORT_RTOS
        running.store(true);
        worker = std::thread([this]() {
            while (running.load()) {
                loop();
                if (period > 0) {
                    std::this_thread::sleep_for(std::chrono::milliseconds(period));
                }
            }
        });
#endif
    }

    void stop() {
#if SUPPORT_RTOS
        running.store(false);
        if (worker.joinable()) worker.join();
#endif
    }

    // Called by the scheduler or thread
    virtual void loop() = 0;

    // For non-RTOS mode: call repeatedly
    void runOnce() { loop(); }

private:
    int period;
#if SUPPORT_RTOS
    std::thread worker;
    std::atomic<bool> running;
#endif
};

#endif // TASK_H
