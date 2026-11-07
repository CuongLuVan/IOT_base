#pragma once

// Firmware update over HTTP (WifiMode::Ota). DeviceIOT (ESP32) only.
// versionUrl answers {"version":"x.y.z","bin":"http://.../firmware.bin"}; the
// image is flashed when version is newer than the one stored at
// EEPROM_ADDR_FW_VERSION. Blocks while it downloads: run it only in
// WifiMode::Ota, once the station is online.

namespace ota_updater {

// true when a new image was flashed (the caller restarts).
bool updateIfNewer(const char* versionUrl);

}  // namespace ota_updater
