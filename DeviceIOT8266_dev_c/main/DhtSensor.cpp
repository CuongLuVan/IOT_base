#include "DhtSensor.h"

#include "Platform.h"
#include "driver/gpio.h"
#include "rom/ets_sys.h"

namespace {

// Loop iterations before a level counts as stuck. Pulses last at most 80 us;
// this is several milliseconds of polling, as microsecondsToClockCycles(1000)
// in the Arduino library.
constexpr uint32_t kTimeout = 20000;
// Release time before the sensor pulls the line low (Adafruit: 55 us).
constexpr uint32_t kPullTimeUs = 55;

uint32_t expectPulse(gpio_num_t pin, int level)
{
    uint32_t count = 0;
    while (gpio_get_level(pin) == level) {
        if (count++ >= kTimeout) return kTimeout;
    }
    return count;
}

void setInputPullUp(gpio_num_t pin)
{
    gpio_set_direction(pin, GPIO_MODE_INPUT);
    gpio_set_pull_mode(pin, GPIO_PULLUP_ONLY);
}

}  // namespace

void DhtSensor::begin(int pin)
{
    pin_ = pin;
    if (pin_ < 0) return;
    gpio_config_t config = {};
    config.pin_bit_mask = 1ULL << pin_;
    config.mode = GPIO_MODE_INPUT;
    config.pull_up_en = GPIO_PULLUP_ENABLE;
    config.pull_down_en = GPIO_PULLDOWN_DISABLE;
    config.intr_type = GPIO_INTR_DISABLE;
    gpio_config(&config);
}

bool DhtSensor::read(float& humidity, float& temperature)
{
    if (pin_ < 0) return false;
    const gpio_num_t pin = static_cast<gpio_num_t>(pin_);

    // Start signal: release, then hold DATA low for at least 18 ms. Starting
    // right after a tick makes the FreeRTOS delay of 20 ms (2 ticks at 100 Hz)
    // last almost exactly 20 ms.
    setInputPullUp(pin);
    vTaskDelay(1);
    gpio_set_direction(pin, GPIO_MODE_OUTPUT);
    gpio_set_level(pin, 0);
    vTaskDelay(delayTicks(20));

    uint32_t cycles[80];
    {
        taskENTER_CRITICAL();
        setInputPullUp(pin);
        ets_delay_us(kPullTimeUs);
        // The sensor answers with 80 us low, then 80 us high.
        bool answered = expectPulse(pin, 0) != kTimeout && expectPulse(pin, 1) != kTimeout;
        if (answered) {
            // Each bit: 50 us low, then 26-28 us high for 0 or 70 us high for 1.
            for (int i = 0; i < 80; i += 2) {
                cycles[i] = expectPulse(pin, 0);
                cycles[i + 1] = expectPulse(pin, 1);
            }
        }
        taskEXIT_CRITICAL();
        if (!answered) return false;
    }

    uint8_t data[5] = {0, 0, 0, 0, 0};
    for (int i = 0; i < 40; ++i) {
        const uint32_t lowCycles = cycles[2 * i];
        const uint32_t highCycles = cycles[2 * i + 1];
        if (lowCycles == kTimeout || highCycles == kTimeout) return false;
        data[i / 8] = static_cast<uint8_t>(data[i / 8] << 1);
        // A high pulse longer than the low one is a 1 (relative timing, so the
        // loop speed does not matter).
        if (highCycles > lowCycles) data[i / 8] |= 1;
    }
    if (data[4] != static_cast<uint8_t>(data[0] + data[1] + data[2] + data[3])) return false;

    // DHT11 decoding of the Adafruit library.
    humidity = data[0] + data[1] * 0.1f;
    float value = data[2];
    if ((data[3] & 0x80) != 0) value = -1 - value;
    value += (data[3] & 0x0F) * 0.1f;
    temperature = value;
    return true;
}
