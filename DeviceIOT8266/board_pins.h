#pragma once

// DeviceIOT8266 wiring and output ports (docs/BUILD_MODES.md).

// Outputs. Bit n of every port byte drives one output; bit0 = pump. GPIO14 is
// SPI SCK for LoRa, so the second legacy output is disabled.
#define OUTPUT_PUMP_PIN 4  // GPIO4 / D2
#define OUTPUT_DEVICE_1_PIN (-1)
// Outputs that physically exist; every command is masked with this.
#define DEVICE_OUTPUT_MASK 0x01
// Ports schedules, threshold rules and countdowns may drive.
#define AUTOMATION_PORT_MASK DEVICE_OUTPUT_MASK
// Output toggled by the device button (the pump).
#define BUTTON_TOGGLE_PORT_MASK 0x01

#if (BUTTON_TOGGLE_PORT_MASK & ~DEVICE_OUTPUT_MASK) != 0
#error "The device button must toggle an existing output."
#endif

// GPIO0 is the flash button; DHT11 needs the GPIO2 boot pull-up.
#define DEVICE_BUTTON_PIN 0  // GPIO0 / D3
#define INPUT_PULLUP_PIN 5   // GPIO5 / D1

// DHT11 temperature / humidity sensor.
#define DHT_PIN 2  // GPIO2 / D4
#define DHT_TYPE DHT11
// Sensors of "va" a threshold rule may use: humidity, temperature, ADC.
#define THRESHOLD_SENSOR_COUNT 3

// SX127x on the ESP8266 hardware SPI bus: SCK=14, MISO=12, MOSI=13.
// Polling receive avoids another GPIO conflict; do not wire DIO0/IRQ.
#define LORA_FREQUENCY_HZ 915E6L
#define LORA_CS_PIN 15     // GPIO15 / D8
#define LORA_RESET_PIN 16  // GPIO16 / D0
#define LORA_IRQ_PIN (-1)
#define LORA_BUFFER_SIZE 255
#define LORA_MAX_PAYLOAD_SIZE 255

#if SUPPORT_LORA && (LORA_RESET_PIN == DEVICE_BUTTON_PIN || LORA_CS_PIN == DEVICE_BUTTON_PIN || \
                     LORA_IRQ_PIN == DEVICE_BUTTON_PIN)
#error "A LoRa pin is wired to the device button."
#endif
