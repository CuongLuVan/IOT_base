#pragma once

// Network task: Wi-Fi link (NetworkWifi), web server (HttpServer), MQTT,
// LoRa, and publishing of the device state and telemetry. The Wi-Fi mode
// stored at EEPROM_ADDR_WIFI_MODE selects what runs (docs/Connectivity.md).
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

class TaskNetwork {
public:
    // Starts the network for the stored Wi-Fi mode. Call from setup() after
    // TaskDevice, TaskSensor and SystemTask.
    static void setup();
    // SUPPORT_RTOS task body: service() every NETWORK_TASK_PERIOD_MS.
    static void taskRun(void* parameter);
    // One non-blocking pass; called from loop() when SUPPORT_RTOS is 0.
    static void service();
};
