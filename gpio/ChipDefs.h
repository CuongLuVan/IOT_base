#ifndef CHIP_DEFS_H
#define CHIP_DEFS_H

// ============================================================
// Arduino-style Pin Definitions for Different Chips
// ============================================================

// ---- AVR / Arduino Uno/Nano ----
#define A0  14
#define A1  15
#define A2  16
#define A3  17
#define A4  18
#define A5  19

// ---- ESP8266 ----
// Digital pins: D0-D8 (GPIO 16, 5, 4, 0, 2, 14, 12, 13, 15)
// Analog: A0 (ADC0)
#define D0  16
#define D1  5
#define D2  4
#define D3  0
#define D4  2
#define D5  14
#define D6  12
#define D7  13
#define D8  15

// ---- ESP32 GPIO naming ----
#define GPIO0   0
#define GPIO1   1
#define GPIO2   2
#define GPIO3   3
#define GPIO4   4
#define GPIO5   5
#define GPIO12  12
#define GPIO13  13
#define GPIO14  14
#define GPIO15  15
#define GPIO16  16
#define GPIO17  17
#define GPIO18  18
#define GPIO19  19
#define GPIO21  21
#define GPIO22  22
#define GPIO23  23
#define GPIO25  25
#define GPIO26  26
#define GPIO27  27
#define GPIO32  32
#define GPIO33  33
#define GPIO34  34
#define GPIO35  35
#define GPIO36  36
#define GPIO37  37
#define GPIO38  38
#define GPIO39  39

// ---- STM32 naming (generic) ----
// Usually named PA0, PA1, ... PB0, PB1, etc
// For simplicity, we use numeric pins 0-99

// ---- MSP430 naming ----
// P1.0-P1.7, P2.0-P2.7, etc. We use numeric 0-15

#endif // CHIP_DEFS_H
