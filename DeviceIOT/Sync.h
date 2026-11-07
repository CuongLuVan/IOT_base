#pragma once

// Platform layer for state shared between tasks. One implementation for both
// firmwares, selected by SUPPORT_RTOS:
//   SUPPORT_RTOS 1 (ESP32, ESP8266 RTOS core): FreeRTOS mutex / queue and a
//                  critical section for the small atomic types.
//   SUPPORT_RTOS 0 (ESP8266 NON-OS core): every module runs from loop(), so
//                  locks are no-ops and the queue is a ring buffer.
// The small atomic types use a critical section rather than std::atomic: the
// lx106 has no atomic instructions and its core lacks __atomic_* helpers.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>
#include <stddef.h>
#include <stdint.h>

#include "define_All.h"

#if SUPPORT_RTOS
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>
#include <freertos/task.h>
#endif

namespace platform_sync {

#if SUPPORT_RTOS
// Milliseconds to ticks, rounded up: a non-zero timeout never becomes 0 ticks
// (the ESP8266 RTOS core runs at 100 Hz, so pdMS_TO_TICKS(5) would be 0).
inline TickType_t timeoutTicks(uint32_t timeoutMs)
{
    if (timeoutMs == 0) return 0;
    const uint64_t ticks = (static_cast<uint64_t>(timeoutMs) * configTICK_RATE_HZ + 999U) / 1000U;
    return ticks >= portMAX_DELAY ? portMAX_DELAY - 1 : static_cast<TickType_t>(ticks);
}
#endif

#if SUPPORT_RTOS && defined(ESP32)
inline portMUX_TYPE& criticalMux()
{
    static portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
    return mux;
}
#endif

// Very short sections only (a few loads / stores).
class CriticalSection {
public:
    CriticalSection()
    {
#if SUPPORT_RTOS && defined(ESP32)
        portENTER_CRITICAL(&criticalMux());
#elif SUPPORT_RTOS
        taskENTER_CRITICAL();
#endif
    }

    ~CriticalSection()
    {
#if SUPPORT_RTOS && defined(ESP32)
        portEXIT_CRITICAL(&criticalMux());
#elif SUPPORT_RTOS
        taskEXIT_CRITICAL();
#endif
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

// Mutex for longer sections (EEPROM, JSON). create() once from setup().
class Mutex {
public:
    static constexpr uint32_t kWaitForever = 0xFFFFFFFFUL;

    bool create()
    {
#if SUPPORT_RTOS
        if (handle_ == nullptr) handle_ = xSemaphoreCreateMutex();
        return handle_ != nullptr;
#else
        return true;
#endif
    }

    bool ready() const
    {
#if SUPPORT_RTOS
        return handle_ != nullptr;
#else
        return true;
#endif
    }

    bool lock(uint32_t timeoutMs = kWaitForever)
    {
#if SUPPORT_RTOS
        if (handle_ == nullptr) return false;
        const TickType_t ticks = timeoutMs == kWaitForever ? portMAX_DELAY : timeoutTicks(timeoutMs);
        return xSemaphoreTake(handle_, ticks) == pdTRUE;
#else
        (void)timeoutMs;
        return true;
#endif
    }

    void unlock()
    {
#if SUPPORT_RTOS
        if (handle_ != nullptr) xSemaphoreGive(handle_);
#endif
    }

private:
#if SUPPORT_RTOS
    SemaphoreHandle_t handle_ = nullptr;
#endif
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
// only the newest item. create() once from setup().
template <typename T, size_t Capacity>
class Queue {
    static_assert(Capacity > 0, "queue needs room for one item");

public:
    bool create()
    {
#if SUPPORT_RTOS
        if (handle_ == nullptr) handle_ = xQueueCreate(Capacity, sizeof(T));
        return handle_ != nullptr;
#else
        return true;
#endif
    }

    bool ready() const
    {
#if SUPPORT_RTOS
        return handle_ != nullptr;
#else
        return true;
#endif
    }

    // false when the queue is full (after timeoutMs) or not created.
    bool push(const T& item, uint32_t timeoutMs = 0)
    {
#if SUPPORT_RTOS
        if (handle_ == nullptr) return false;
        return xQueueSend(handle_, &item, timeoutTicks(timeoutMs)) == pdTRUE;
#else
        (void)timeoutMs;
        if (count_ == Capacity) return false;
        items_[(head_ + count_) % Capacity] = item;
        ++count_;
        return true;
#endif
    }

    // Mailbox only: replaces the stored item.
    bool overwrite(const T& item)
    {
        static_assert(Capacity == 1, "overwrite() is for a capacity-1 mailbox");
#if SUPPORT_RTOS
        if (handle_ == nullptr) return false;
        return xQueueOverwrite(handle_, &item) == pdTRUE;
#else
        items_[0] = item;
        head_ = 0;
        count_ = 1;
        return true;
#endif
    }

    // Non-blocking; false when empty.
    bool pop(T& item)
    {
#if SUPPORT_RTOS
        if (handle_ == nullptr) return false;
        return xQueueReceive(handle_, &item, 0) == pdTRUE;
#else
        if (count_ == 0) return false;
        item = items_[head_];
        head_ = (head_ + 1) % Capacity;
        --count_;
        return true;
#endif
    }

    // Mailbox only: reads the stored item without removing it.
    bool peek(T& item) const
    {
#if SUPPORT_RTOS
        if (handle_ == nullptr) return false;
        return xQueuePeek(handle_, &item, 0) == pdTRUE;
#else
        if (count_ == 0) return false;
        item = items_[head_];
        return true;
#endif
    }

    uint32_t size() const
    {
#if SUPPORT_RTOS
        return handle_ == nullptr ? 0 : static_cast<uint32_t>(uxQueueMessagesWaiting(handle_));
#else
        return count_;
#endif
    }

private:
#if SUPPORT_RTOS
    QueueHandle_t handle_ = nullptr;
#else
    T items_[Capacity] = {};
    size_t head_ = 0;
    size_t count_ = 0;
#endif
};

}  // namespace platform_sync
