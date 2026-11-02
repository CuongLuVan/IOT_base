# MQTT public sensor simulator

This sample simulates an environmental sensor and publishes JSON telemetry to a public MQTT broker. It uses the existing `mqtt` dependency.

Install dependencies once, then start it:

```powershell
npm install
npm run sensor-sim
```

The default broker is `mqtt://broker.emqx.io:1883`. A unique `SITE_ID` is generated on every run, so separate runs do not collide. The console prints the exact topic, for example:

```text
iot-demo/demo-a1b2c3d4/sensors/sensor-01/telemetry
```

Customize without editing source:

```powershell
$env:MQTT_URL = 'mqtt://broker.emqx.io:1883'
$env:SITE_ID = 'factory-hanoi'
$env:DEVICE_ID = 'air-sensor-01'
$env:INTERVAL_MS = '2000'
npm run sensor-sim
```

Each message contains `timestamp`, `sequence`, `deviceId`, `siteId`, and generated `temperatureC`, `humidityPct`, `pressureHpa`, `co2Ppm`, and `batteryPct` values. Stop with `Ctrl+C`.

Public brokers are for testing only: anyone who knows the topic may read or publish data. Use a private broker plus TLS and credentials for real devices.
