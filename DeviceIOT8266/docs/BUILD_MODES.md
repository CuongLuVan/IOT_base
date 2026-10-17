# DeviceIOT8266 build modes

`define_All.h` chooses exactly one runtime:

- `#define SUPPORT_RTOS 0` (default): build with the official ESP8266 Arduino core. The sketch uses the cooperative scheduler in `loop()`.
- `#define SUPPORT_RTOS 1`: build with `alexCajas/esp8266RTOSArduCore`. The sketch creates four FreeRTOS tasks: device I/O, sensors, network/LoRa, and system telemetry.

Do not enable RTOS with the official ESP8266 Arduino core; it does not supply the FreeRTOS task API used by this sketch. Install the RTOS board package and run its documented Windows `setup_env.bat` before building.

## Required Arduino libraries

- DHT sensor library (DHT11)
- LoRa (SX127x)
- ArduinoJson 6
- PubSubClient

## Retained hardware

Only DHT11, the on-chip ADC (`A0`), and LoRa remain enabled. PMS, IMU, ADS, and high-speed UDP capture are removed; the old high-speed class is a disabled compatibility stub.

| Function | ESP8266 GPIO |
| --- | --- |
| DHT11 data | GPIO2 / D4 |
| ADC | A0 / TOUT |
| LoRa SCK / MISO / MOSI | GPIO14 / GPIO12 / GPIO13 |
| LoRa NSS / reset | GPIO15 / GPIO16 |
| LoRa IRQ | not connected; receive uses polling |
| Pump output | GPIO4 / D2 |
| Device button | GPIO0 / D3 |

GPIO14 is required for LoRa SPI, so the former second device output is deliberately disabled. Ensure DHT11 has an appropriate pull-up to 3.3 V and that the external signal presented to the ESP8266 TOUT pin is within the board/chip ADC limits.