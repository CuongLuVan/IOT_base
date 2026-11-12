#pragma once

// Debounced push button (same logic as DeviceIOT8266). Call update() every few
// tens of milliseconds; it reports each debounced press and, on release, how
// long the button was held.

#include <stdint.h>

#include "driver/gpio.h"

class ButtonInput {
public:
    enum class Event : uint8_t {
        None,
        Pressed,   // Debounced press.
        Released,  // Debounced release; heldMs() is the press duration.
    };

    // activeLow: the pin reads 0 while pressed (button to GND with a pull-up).
    void begin(int pin, bool pullUp, bool activeLow, uint32_t debounceMs, uint32_t nowMs)
    {
        pin_ = pin;
        activeLow_ = activeLow;
        debounceMs_ = debounceMs;
        if (pin_ < 0) return;
        gpio_config_t config = {};
        config.pin_bit_mask = 1ULL << pin_;
        config.mode = GPIO_MODE_INPUT;
        config.pull_up_en = pullUp ? GPIO_PULLUP_ENABLE : GPIO_PULLUP_DISABLE;
        config.pull_down_en = GPIO_PULLDOWN_DISABLE;
        config.intr_type = GPIO_INTR_DISABLE;
        gpio_config(&config);
        stable_ = readRaw();
        candidate_ = stable_;
        candidateSinceMs_ = nowMs;
        pressedAtMs_ = nowMs;
        heldMs_ = 0;
    }

    Event update(uint32_t nowMs)
    {
        if (pin_ < 0) return Event::None;
        const bool raw = readRaw();
        if (raw != candidate_) {
            candidate_ = raw;
            candidateSinceMs_ = nowMs;
            return Event::None;
        }
        if (raw == stable_ || nowMs - candidateSinceMs_ < debounceMs_) return Event::None;
        stable_ = raw;
        if (stable_) {
            pressedAtMs_ = nowMs;
            return Event::Pressed;
        }
        heldMs_ = nowMs - pressedAtMs_;
        return Event::Released;
    }

    bool isPressed() const
    {
        return stable_;
    }

    // While pressed: time since the press. After Event::Released: the press duration.
    uint32_t heldMs(uint32_t nowMs) const
    {
        return stable_ ? nowMs - pressedAtMs_ : heldMs_;
    }

private:
    bool readRaw() const
    {
        const bool high = gpio_get_level(static_cast<gpio_num_t>(pin_)) != 0;
        return activeLow_ ? !high : high;
    }

    int pin_ = -1;
    bool activeLow_ = true;
    uint32_t debounceMs_ = 50;
    bool stable_ = false;
    bool candidate_ = false;
    uint32_t candidateSinceMs_ = 0;
    uint32_t pressedAtMs_ = 0;
    uint32_t heldMs_ = 0;
};
