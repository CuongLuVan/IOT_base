#ifndef CONFIG_H
#define CONFIG_H

// Define SUPPORT_RTOS to 1 if you want each task to run in its own thread.
// Set to 0 for a simple cooperative scheduler (loop calling Task::run manually).
#define SUPPORT_RTOS 1

// Simulation mode configuration:
// - 1: GPU simulation mode (no real sensors; DHT/PMS read skipped)
// - 0: Real hardware mode (read DHT11, PMS5003, ADC)
#define SIMULATION_MODE 1

// EEPROM/memory address for WiFi credential storage
#define WIFI_SSID_ADDR 50
#define WIFI_PASS_ADDR 100

#endif // CONFIG_H
