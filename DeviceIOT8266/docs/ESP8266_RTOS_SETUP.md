# RTOS-like cooperative runtime

`DeviceIOT8266` is built for the official ESP8266 Arduino core and provides
RTOS-like periodic services through cooperative scheduling. It does not use
`esp8266RTOSArduCore` or FreeRTOS. The incompatible FreeRTOS build mode is
rejected by `config_features.h`.

The firmware organizes work as cooperative services in `loop()` plus one
recurrent device-I/O callback. This provides periodic task-like execution, but
does not provide preemption or multiple CPU threads. See
[BUILD_MODES.md](BUILD_MODES.md) for the task layout and build instructions.
