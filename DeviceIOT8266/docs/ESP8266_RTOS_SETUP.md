# ESP8266 RTOS Arduino build

`DeviceIOT8266.ino` is the active entry point for this folder. It supports both scheduler modes through `SUPPORT_RTOS` in `define_All.h`:

- `0`: official ESP8266 Arduino core with the cooperative scheduler.
- `1`: `esp8266RTOSArduCore` with FreeRTOS tasks.

For RTOS mode install the `esp8266RTOSArduCore` board package, run the package's `setup_env.bat` on Windows, then choose its ESP8266 RTOS board in the IDE. Build the sketch with `SUPPORT_RTOS` set to `1`; the sketch uses standard `xTaskCreate()` because ESP8266 has one CPU core.

The active peripherals are DHT11, A0/TOUT ADC, and an SX127x LoRa module. Wi-Fi reconnects asynchronously and opens the configuration AP if credentials are unavailable or association keeps failing. Details and pin allocation are in [BUILD_MODES.md](BUILD_MODES.md).
