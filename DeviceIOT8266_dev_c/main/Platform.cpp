#include "Platform.h"

#include <stdio.h>
#include <string.h>

#include "esp_system.h"

uint32_t deviceSecureRandom32()
{
    return esp_random();
}

void deviceFillRandom(uint8_t* out, size_t length)
{
    for (size_t offset = 0; offset < length; offset += sizeof(uint32_t)) {
        const uint32_t value = esp_random();
        const size_t count = length - offset < sizeof(value) ? length - offset : sizeof(value);
        memcpy(out + offset, &value, count);
    }
}

uint32_t deviceFreeHeap()
{
    return static_cast<uint32_t>(esp_get_free_heap_size());
}

void deviceRestartNow()
{
    esp_restart();
    for (;;) vTaskDelay(delayTicks(1000));
}

std::string ipToString(uint32_t address)
{
    char text[16];
    snprintf(text, sizeof(text), "%u.%u.%u.%u", static_cast<unsigned>(address & 0xFF),
             static_cast<unsigned>((address >> 8) & 0xFF), static_cast<unsigned>((address >> 16) & 0xFF),
             static_cast<unsigned>((address >> 24) & 0xFF));
    return text;
}

void trimString(std::string& text)
{
    static const char kSpace[] = " \t\r\n\f\v";
    const size_t first = text.find_first_not_of(kSpace);
    if (first == std::string::npos) {
        text.clear();
        return;
    }
    const size_t last = text.find_last_not_of(kSpace);
    text = text.substr(first, last - first + 1);
}
