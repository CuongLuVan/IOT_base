#pragma once

// Wi-Fi provisioning without the setup pages. DeviceIOT (ESP32) only.
//   WifiMode::BleProvision: Espressif BLE provisioning (ESP BLE Provisioning
//                           app, WIFI_PROV_SERVICE_NAME / WIFI_PROV_POP).
//   WifiMode::SmartConfig:  ESP-Touch SmartConfig.
// Received credentials are stored and the device restarts as a station.
// Without credentials within WIFI_PROVISIONING_TIMEOUT_MS the device restarts
// as a station (stored network) or into the Wi-Fi page access point.

#include <stdint.h>

namespace wifi_provisioning {

void beginBle(uint32_t nowMs);
void beginSmartConfig(uint32_t nowMs);
// One non-blocking step; call from the network task.
void service(uint32_t nowMs);

}  // namespace wifi_provisioning
