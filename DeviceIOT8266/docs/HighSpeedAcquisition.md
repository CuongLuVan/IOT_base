# High-speed acquisition retired

This ESP8266 firmware no longer supports high-speed UDP capture, ICM, ADS, or PMS sensors. Command 15 is answered with rs=2 (unknown command).

The active acquisition path is DHT11 plus the internal ADC (`A0`); LoRa is handled by the network task. See [BUILD_MODES.md](BUILD_MODES.md) for the supported wiring and build modes.
