# ESP32 build

In Arduino IDE, select the ESP32 board that matches the device, then set
**Tools > Partition Scheme > Huge APP (3MB No OTA/1MB SPIFFS)** before compiling
`DeviceIOT.ino`. The firmware image exceeds the default 1.2 MB application
partition; this scheme provides a 3 MB application partition.

This partition scheme does not support OTA updates. It also reserves only
1 MB for SPIFFS. Use a board with at least 4 MB of flash.

The matching Arduino CLI setting is:

```sh
arduino-cli compile --fqbn esp32:esp32:esp32:PartitionScheme=huge_app DeviceIOT
```
