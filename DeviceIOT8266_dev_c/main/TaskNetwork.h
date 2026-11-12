#pragma once

// Network task: Wi-Fi link (NetworkWifi), web server (HttpServer), MQTT,
// LoRa, and publishing of the device state and telemetry. The Wi-Fi mode
// stored at EEPROM_ADDR_WIFI_MODE selects what runs.

class TaskNetwork {
public:
    // Starts the network for the stored Wi-Fi mode. Call from app_main() after
    // TaskDevice, TaskSensor and SystemTask.
    static void setup();
    // FreeRTOS task body: service() every NETWORK_TASK_PERIOD_MS.
    static void taskRun(void* parameter);
    // One non-blocking pass.
    static void service();
};
