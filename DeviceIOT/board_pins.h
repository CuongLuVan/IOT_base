#pragma once

// DeviceIOT (ESP32-WROOM-32 DevKit V1) wiring and output ports.

// Outputs. Bit n of every port byte (device_port, "value", "mask") drives one
// output; bit0 = pump, bit1 = device 1.
#define OUTPUT_PUMP_PIN 22
#define OUTPUT_DEVICE_1_PIN 23
// Outputs that physically exist; every command is masked with this.
#define DEVICE_OUTPUT_MASK 0x03
// Ports schedules, threshold rules and countdowns may drive.
#define AUTOMATION_PORT_MASK DEVICE_OUTPUT_MASK
// Output toggled by the device button (the pump).
#define BUTTON_TOGGLE_PORT_MASK 0x01

#if (BUTTON_TOGGLE_PORT_MASK & ~DEVICE_OUTPUT_MASK) != 0
#error "The device button must toggle an existing output."
#endif

// Device button: toggles BUTTON_TOGGLE_PORT_MASK (TaskDevice).
#define DEVICE_BUTTON_PIN 14
// Network configuration button (GPIO0 / BOOT): a long press selects the Wi-Fi
// mode (TaskNetwork). A different button from DEVICE_BUTTON_PIN.
#define NETWORK_CONFIG_BUTTON_PIN 0
#define INPUT_PULLUP_PIN 13

// DHT11 temperature / humidity sensor.
// WARNING: GPIO12 (MTDI) is a strapping pin. It selects the flash voltage at
// reset: the pull-up resistor of every DHT module holds it HIGH, which sets
// VDD_SDIO to 1.8 V, and an ESP32-WROOM-32 (3.3 V flash) then fails to boot or
// boot-loops. Fix one of two ways before deploying:
//   1. Rewire DHT DATA to a non-strapping pin (e.g. GPIO32) and change DHT_PIN.
//   2. Keep GPIO12 and burn the flash-voltage eFuse once (irreversible):
//        espefuse.py --port <PORT> set_flash_voltage 3.3V
//      then define DHT_PIN_STRAPPING_ACKNOWLEDGED to silence the build
//      warning (TaskSensor.cpp).
#define DHT_PIN 12
#define DHT_TYPE DHT11

// PMS dust sensor on UART2 (Serial2). UART0 is the console, and the default
// UART1 pins (26/27) belong to the high-speed IMU bus. Wire PMS TX -> GPIO16.
#define PMS_SERIAL Serial2
#define PMS_RX_PIN 16
#define PMS_TX_PIN 17
#define SENSOR_SERIAL_BAUD_RATE 9600
// Sensors of "va" a threshold rule may use: humidity, temperature, dust,
// PM2.5, PM10, PM1.
#define THRESHOLD_SENSOR_COUNT 6

// SX127x LoRa (SUPPORT_LORA) on the default VSPI bus.
#define LORA_FREQUENCY_HZ 915E6L
#define LORA_CS_PIN 5
#define LORA_RESET_PIN 14  // Shares GPIO14 with DEVICE_BUTTON_PIN: rewire one before enabling SUPPORT_LORA.
#define LORA_IRQ_PIN 2
#define LORA_BUFFER_SIZE 255
#define LORA_MAX_PAYLOAD_SIZE 255

// LoRa uses the default VSPI pins (18/19/23), which the ADS8866 capture bus
// (adsSPI on VSPI, TaskSensor) and OUTPUT_DEVICE_1_PIN also use.
#if SUPPORT_LORA
#error "SUPPORT_LORA on ESP32 conflicts with the ADS8866 VSPI bus and OUTPUT_DEVICE_1_PIN: move LoRa to other pins first."
#endif

#if SUPPORT_LORA && (LORA_RESET_PIN == DEVICE_BUTTON_PIN || LORA_CS_PIN == DEVICE_BUTTON_PIN || \
                     LORA_IRQ_PIN == DEVICE_BUTTON_PIN)
#error "A LoRa pin is wired to the device button."
#endif

// High-speed capture. Reassign these pins if they conflict with the board wiring.
#define HS_ADC_PIN 34
#define HS_ICM_SCK_PIN 25
#define HS_ICM_MISO_PIN 26
#define HS_ICM_MOSI_PIN 27
#define HS_ICM_CS_PIN 33
#define HS_ICM_SPI_HZ 8000000
#define HS_ADS_SCK_PIN 18
#define HS_ADS_MISO_PIN 19
#define HS_ADS_CNV_PIN 21
#define HS_ADS_SPI_HZ 16000000
