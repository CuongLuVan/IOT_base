# High-speed acquisition retired

This ESP8266 firmware no longer supports high-speed UDP capture, ICM, ADS, or PMS sensors. `HighSpeedSampler` is retained only as a disabled compatibility stub so older includes can link safely.

The active acquisition path is DHT11 plus the internal ADC (`A0`); LoRa is handled by the network task. See [BUILD_MODES.md](BUILD_MODES.md) for the supported wiring and build modes.
