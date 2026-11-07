#pragma once

// Debounced push button. Call update() every few tens of milliseconds; it
// reports each debounced press and, on release, how long the button was held.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>
#include <stdint.h>

class ButtonInput {
public:
    enum class Event : uint8_t {
        None,
        Pressed,   // Debounced press.
        Released,  // Debounced release; heldMs() is the press duration.
    };

    // activeLow: the pin reads LOW while pressed (button to GND with a pull-up).
    void begin(int pin, uint8_t pinMode_, bool activeLow, uint32_t debounceMs)
    {
        pin_ = pin;
        activeLow_ = activeLow;
        debounceMs_ = debounceMs;
        pinMode(pin_, pinMode_);
        stable_ = readRaw();
        candidate_ = stable_;
        candidateSinceMs_ = millis();
        pressedAtMs_ = candidateSinceMs_;
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
        const bool high = digitalRead(pin_) == HIGH;
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
