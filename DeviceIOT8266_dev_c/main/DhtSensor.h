#pragma once

// DHT11 driver on one GPIO (replaces the Adafruit "DHT sensor library"; same
// protocol and decoding). The 40 data bits are timed with interrupts off for
// about 4 ms, as the Arduino library does. Call at most every 2 s.

#include <stdint.h>

class DhtSensor {
public:
    void begin(int pin);
    // false: the sensor did not answer, a bit timed out or the checksum is wrong.
    bool read(float& humidity, float& temperature);

private:
    int pin_ = -1;
};
