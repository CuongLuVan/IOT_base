#pragma once

// State shared between the FreeRTOS tasks: mutex, queue and a critical
// section for the small atomic types (the SUPPORT_RTOS 1 branch of
// DeviceIOT8266 Sync.h). The small atomic types use a critical section rather
// than std::atomic: the lx106 has no atomic instructions.

#include <stddef.h>
#include <stdint.h>

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/task.h"

namespace platform_sync {

// Milliseconds to ticks, rounded up: a non-zero timeout never becomes 0 ticks
// (the tick is 10 ms at 100 Hz, so pdMS_TO_TICKS(5) would be 0).
inline TickType_t timeoutTicks(uint32_t timeoutMs)
{
    if (timeoutMs == 0) return 0;
    const uint64_t ticks = (static_cast<uint64_t>(timeoutMs) * configTICK_RATE_HZ + 999U) / 1000U;
    return ticks >= portMAX_DELAY ? portMAX_DELAY - 1 : static_cast<TickType_t>(ticks);
}

// Very short sections only (a few loads / stores).
class CriticalSection {
public:
    CriticalSection()
    {
        taskENTER_CRITICAL();
    }

    ~CriticalSection()
    {
        taskEXIT_CRITICAL();
    }

    CriticalSection(const CriticalSection&) = delete;
    CriticalSection& operator=(const CriticalSection&) = delete;
};

// A uint32_t that several tasks read and write.
class AtomicU32 {
public:
    explicit AtomicU32(uint32_t value = 0) : value_(value) {}

    uint32_t load() const
    {
        CriticalSection section;
        return value_;
    }

    void store(uint32_t value)
    {
        CriticalSection section;
        value_ = value;
    }

    uint32_t exchange(uint32_t value)
    {
        CriticalSection section;
        const uint32_t previous = value_;
        value_ = value;
        return previous;
    }

    uint32_t fetchAdd(uint32_t delta)
    {
        CriticalSection section;
        const uint32_t previous = value_;
        value_ = previous + delta;
        return previous;
    }

private:
    volatile uint32_t value_;
};

// "Something changed, persist it later": set() by the writer, takeIfSet() by
// the task that flushes.
class DirtyFlag {
public:
    void set()
    {
        CriticalSection section;
        dirty_ = true;
    }

    // true once per set(); clears the flag.
    bool takeIfSet()
    {
        CriticalSection section;
        const bool wasSet = dirty_;
        dirty_ = false;
        return wasSet;
    }

private:
    volatile bool dirty_ = false;
};

// Mutex for longer sections (NVS image, JSON). create() once from app_main().
class Mutex {
public:
    static constexpr uint32_t kWaitForever = 0xFFFFFFFFUL;

    bool create()
    {
        if (handle_ == nullptr) handle_ = xSemaphoreCreateMutex();
        return handle_ != nullptr;
    }

    bool ready() const
    {
        return handle_ != nullptr;
    }

    bool lock(uint32_t timeoutMs = kWaitForever)
    {
        if (handle_ == nullptr) return false;
        const TickType_t ticks = timeoutMs == kWaitForever ? portMAX_DELAY : timeoutTicks(timeoutMs);
        return xSemaphoreTake(handle_, ticks) == pdTRUE;
    }

    void unlock()
    {
        if (handle_ != nullptr) xSemaphoreGive(handle_);
    }

private:
    SemaphoreHandle_t handle_ = nullptr;
};

// Holds a Mutex for the scope; check locked() when a timeout was given.
class ScopedLock {
public:
    explicit ScopedLock(Mutex& mutex, uint32_t timeoutMs = Mutex::kWaitForever)
        : mutex_(mutex), locked_(mutex.lock(timeoutMs))
    {
    }

    ~ScopedLock()
    {
        if (locked_) mutex_.unlock();
    }

    bool locked() const
    {
        return locked_;
    }

    ScopedLock(const ScopedLock&) = delete;
    ScopedLock& operator=(const ScopedLock&) = delete;

private:
    Mutex& mutex_;
    bool locked_;
};

// Fixed-size FIFO between tasks. Capacity 1 is a mailbox: overwrite() keeps
// only the newest item. create() once from app_main().
template <typename T, size_t Capacity>
class Queue {
    static_assert(Capacity > 0, "queue needs room for one item");

public:
    bool create()
    {
        if (handle_ == nullptr) handle_ = xQueueCreate(Capacity, sizeof(T));
        return handle_ != nullptr;
    }

    bool ready() const
    {
        return handle_ != nullptr;
    }

    // false when the queue is full (after timeoutMs) or not created.
    bool push(const T& item, uint32_t timeoutMs = 0)
    {
        if (handle_ == nullptr) return false;
        return xQueueSend(handle_, &item, timeoutTicks(timeoutMs)) == pdTRUE;
    }

    // Mailbox only: replaces the stored item.
    bool overwrite(const T& item)
    {
        static_assert(Capacity == 1, "overwrite() is for a capacity-1 mailbox");
        if (handle_ == nullptr) return false;
        return xQueueOverwrite(handle_, &item) == pdTRUE;
    }

    // Non-blocking; false when empty.
    bool pop(T& item)
    {
        if (handle_ == nullptr) return false;
        return xQueueReceive(handle_, &item, 0) == pdTRUE;
    }

    // Mailbox only: reads the stored item without removing it.
    bool peek(T& item) const
    {
        if (handle_ == nullptr) return false;
        return xQueuePeek(handle_, &item, 0) == pdTRUE;
    }

    uint32_t size() const
    {
        return handle_ == nullptr ? 0 : static_cast<uint32_t>(uxQueueMessagesWaiting(handle_));
    }

private:
    QueueHandle_t handle_ = nullptr;
};

}  // namespace platform_sync
