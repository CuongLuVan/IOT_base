# Real Hardware Integration Guide

## Overview

This guide explains how to integrate the `WifiNetwork` and `RealTimeControl` classes with real WiFi and MQTT libraries on ESP32 and ESP8266.

## Current State: Simulation

The code currently runs in **simulation mode** on Windows/Linux:
- No actual WiFi driver calls
- No actual MQTT broker connection
- State transitions are printed to console
- Perfect for testing application logic

## Target State: Real Hardware

Running on **ESP32 or ESP8266** with:
- Real WiFi authentication and association
- Real MQTT publishing/subscribing
- Real network error handling
- Production-ready reliability

## Phase 1: Library Integration

### Step 1.1: Add Required Libraries

#### For ESP32 (PlatformIO)

Create `platformio.ini`:
```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

lib_deps =
    knolleary/PubSubClient @ ^2.8
    bblanchon/ArduinoJson @ ^6.21

build_flags =
    -DREAL_HARDWARE=1
    -DSUPPORT_RTOS=1
```

#### For ESP8266 (PlatformIO)

```ini
[env:esp8266]
platform = espressif8266
board = nodemcuv2
framework = arduino

lib_deps =
    knolleary/PubSubClient @ ^2.8
    bblanchon/ArduinoJson @ ^6.21

build_flags =
    -DREAL_HARDWARE=1
    -DSUPPORT_RTOS=1
```

### Step 1.2: Update Includes

In `WifiNetwork.h`, add real hardware headers:

```cpp
#ifndef REAL_HARDWARE
    // Simulation mode - no includes needed
#else
    #include <WiFi.h>        // ESP32/ESP8266 WiFi library
    #include <time.h>        // TIME_H for configTime()
    #include <lwip/sockets.h> // For socket operations
    #include <esp_sntp.h>     // SNTP (NTP) support
#endif
```

In `RealTimeControl.h`:

```cpp
#ifndef REAL_HARDWARE
    // Simulation mode
#else
    #include <PubSubClient.h> // MQTT library
    #include <WiFiClient.h>   // WiFi network client
#endif
```

## Phase 2: WifiNetwork Hardware Integration

### Step 2.1: Configuration Loading

**Current (Simulation):**
```cpp
void WifiNetwork::loadConfigFromStorage() {
    config.ssid = "MyHomeWiFi";
    config.password = "password123";
    config.hostname = "iot-device";
    // ...
}
```

**Required (Real Hardware):**
```cpp
void WifiNetwork::loadConfigFromStorage() {
    #ifdef REAL_HARDWARE
        // Load from NVS (Non-Volatile Storage)
        nvs_handle_t nvs_handle;
        nvs_open("wifi_config", NVS_READONLY, &nvs_handle);
        
        char ssid[32] = {0};
        char password[64] = {0};
        size_t len = sizeof(ssid);
        
        nvs_get_str(nvs_handle, "ssid", ssid, &len);
        len = sizeof(password);
        nvs_get_str(nvs_handle, "password", password, &len);
        
        config.ssid = ssid;
        config.password = password;
        nvs_close(nvs_handle);
    #else
        // Simulation mode defaults
        config.ssid = "MyHomeWiFi";
        config.password = "password123";
    #endif
}
```

### Step 2.2: Authentication Implementation

**Current (Simulation stub - WifiNetwork.cpp line ~140):**
```cpp
void WifiNetwork::authenticate() {
    std::cout << "[WiFi Auth SIM] Simulating authentication..." << std::endl;
    // Fake delay in simulation
    auth_start_time = std::chrono::steady_clock::now();
}
```

**Required (Real Hardware):**
```cpp
void WifiNetwork::authenticate() {
    #ifdef REAL_HARDWARE
        Serial.println("[WiFi Auth] Starting WPA2 authentication...");
        
        // Disable power save during connection
        WiFi.setSleep(false);
        
        // Set hostname
        WiFi.setHostname(config.hostname.c_str());
        
        // Start WiFi connection
        WiFi.mode(WIFI_STA);
        WiFi.begin(config.ssid.c_str(), config.password.c_str());
        
        auth_start_time = millis();
        state = WIFI_AUTHENTICATING;
    #else
        // Simulation
        state = WIFI_AUTHENTICATING;
    #endif
}
```

### Step 2.3: Association Implementation

**Current (Simulation stub):**
```cpp
void WifiNetwork::associate() {
    std::cout << "[WiFi Assoc SIM] Simulating 802.11 join..." << std::endl;
}
```

**Required (Real Hardware):**
```cpp
void WifiNetwork::associate() {
    #ifdef REAL_HARDWARE
        wl_status_t wifi_status = WiFi.status();
        
        if (wifi_status == WL_CONNECTED) {
            Serial.println("[WiFi Assoc] Association successful!");
            state = WIFI_OBTAINING_DHCP;
        } else if (wifi_status == WL_CONNECT_FAILED) {
            Serial.println("[WiFi Error] Association failed (wrong password?)");
            reconnect_count++;
            state = WIFI_RECONNECTING;
        } else if (millis() - auth_start_time > 20000) {
            // Timeout after 20 seconds
            Serial.println("[WiFi Error] Association timeout");
            reconnect_count++;
            state = WIFI_RECONNECTING;
        }
    #else
        // Simulation
        assoc_elapsed_ms += 100;  // Simulate 100ms per call
        if (assoc_elapsed_ms >= 1500) {
            state = WIFI_OBTAINING_DHCP;
        }
    #endif
}
```

### Step 2.4: DHCP Implementation

**Current (Simulation stub):**
```cpp
void WifiNetwork::obtainDHCP() {
    std::cout << "[DHCP SIM] Requesting IP..." << std::endl;
}
```

**Required (Real Hardware):**
```cpp
void WifiNetwork::obtainDHCP() {
    #ifdef REAL_HARDWARE
        if (config.dhcp_enabled) {
            // DHCP is automatic in Arduino WiFi library
            IPAddress ip = WiFi.localIP();
            if (ip != INADDR_NONE) {
                Serial.print("[DHCP] Assigned IP: ");
                Serial.println(ip);
                assigned_ip = ip.toString().c_str();
                state = WIFI_VERIFYING_INTERNET;
            } else if (millis() - auth_start_time > 30000) {
                // DHCP timeout
                Serial.println("[DHCP Error] Timeout, using static IP fallback");
                config.dhcp_enabled = false;
                assignStaticIP();
            }
        } else {
            // Static IP configuration
            assignStaticIP();
            state = WIFI_VERIFYING_INTERNET;
        }
    #else
        // Simulation
        state = WIFI_VERIFYING_INTERNET;
        assigned_ip = "192.168.1.100";
    #endif
}

void WifiNetwork::assignStaticIP() {
    #ifdef REAL_HARDWARE
        IPAddress ip, gateway, subnet;
        ip.fromString(config.static_ip.c_str());
        gateway.fromString(config.gateway.c_str());
        subnet.fromString(config.netmask.c_str());
        
        WiFi.config(ip, gateway, subnet);
        Serial.println("[WiFi] Static IP assigned");
    #endif
}
```

### Step 2.5: Internet Verification

**Current (Simulation stub):**
```cpp
void WifiNetwork::verifyInternet() {
    std::cout << "[WiFi Internet SIM] Checking..." << std::endl;
}
```

**Required (Real Hardware):**
```cpp
void WifiNetwork::verifyInternet() {
    #ifdef REAL_HARDWARE
        // Use simple HTTP HEAD to 8.8.8.8 or cloudflare
        // Option 1: Use WiFiClient
        WiFiClient client;
        if (client.connect("8.8.8.8", 80)) {
            client.println("HEAD / HTTP/1.0");
            client.println("Host: 8.8.8.8");
            client.println("Connection: close");
            client.println();
            
            Serial.println("[WiFi] Internet verified (8.8.8.8 reachable)");
            client.stop();
            state = WIFI_CONNECTED;
        } else {
            Serial.println("[WiFi Warn] Internet unavailable");
            // Still go to CONNECTED anyway (might be isolated WiFi)
            state = WIFI_CONNECTED;
        }
    #else
        // Simulation
        state = WIFI_CONNECTED;
    #endif
}
```

### Step 2.6: NTP Time Synchronization

**Current (Simulation stub - line ~180):**
```cpp
void WifiNetwork::syncTimeFromNTP() {
    std::cout << "[NTP SIM] Mock sync from NTP..." << std::endl;
    last_ntp_sync = std::time(nullptr);
}
```

**Required (Real Hardware):**
```cpp
void WifiNetwork::syncTimeFromNTP() {
    #ifdef REAL_HARDWARE
        Serial.println("[NTP] Starting time sync...");
        
        // Configure time with NTP support
        configTime(
            0,           // GMT offset (0 for UTC)
            0,           // Daylight offset
            "pool.ntp.org",
            "time.nist.gov"
        );
        
        // Wait for time to be set (max 20 seconds)
        time_t now = time(nullptr);
        int retry = 0;
        while (now < 24 * 3600 && ++retry < 40) {
            delay(500);
            now = time(nullptr);
        }
        
        Serial.print("[NTP] Time set: ");
        Serial.println(ctime(&now));
        last_ntp_sync = now;
    #else
        // Simulation
        last_ntp_sync = std::time(nullptr);
    #endif
}
```

### Step 2.7: Connection Status Checks

**Current (Simulation):**
```cpp
bool WifiNetwork::isConnected() {
    return state == WIFI_CONNECTED;
}
```

**Required (Real Hardware - add check):**
```cpp
bool WifiNetwork::isConnected() {
    #ifdef REAL_HARDWARE
        return WiFi.status() == WL_CONNECTED;
    #else
        return state == WIFI_CONNECTED;
    #endif
}

bool WifiNetwork::hasInternetAccess() {
    #ifdef REAL_HARDWARE
        // Quick check if we can reach DNS
        return WiFi.status() == WL_CONNECTED && WiFi.localIP() != INADDR_NONE;
    #else
        return state == WIFI_CONNECTED;
    #endif
}

std::string WifiNetwork::getIPAddress() {
    #ifdef REAL_HARDWARE
        return WiFi.localIP().toString().c_str();
    #else
        return assigned_ip;
    #endif
}

std::string WifiNetwork::getSSID() {
    #ifdef REAL_HARDWARE
        return WiFi.SSID().c_str();
    #else
        return config.ssid;
    #endif
}
```

## Phase 3: RealTimeControl Hardware Integration

### Step 3.1: Configuration Loading

**Current (Simulation):**
```cpp
void RealTimeControl::loadConfigFromStorage() {
    config.broker_address = "192.168.1.50";
    config.broker_port = 1883;
    config.client_id = "iot-device-001";
    // ...
}
```

**Required (Real Hardware):**
```cpp
void RealTimeControl::loadConfigFromStorage() {
    #ifdef REAL_HARDWARE
        nvs_handle_t nvs_handle;
        nvs_open("mqtt_config", NVS_READONLY, &nvs_handle);
        
        char broker[64] = {0};
        char client_id[32] = {0};
        size_t len = sizeof(broker);
        
        nvs_get_str(nvs_handle, "broker", broker, &len);
        len = sizeof(client_id);
        nvs_get_str(nvs_handle, "client_id", client_id, &len);
        uint32_t port = 1883;
        nvs_get_u32(nvs_handle, "port", &port);
        
        config.broker_address = broker;
        config.broker_port = port;
        config.client_id = client_id;
        
        nvs_close(nvs_handle);
    #else
        // Simulation
        config.broker_address = "192.168.1.50";
        config.broker_port = 1883;
    #endif
}
```

### Step 3.2: MQTT Connection

**Current (Simulation stub - line ~140):**
```cpp
void RealTimeControl::connectToBroker() {
    std::cout << "[MQTT Connection SIM] Connecting..." << std::endl;
}
```

**Required (Real Hardware):**
```cpp
void RealTimeControl::connectToBroker() {
    #ifdef REAL_HARDWARE
        if (!wifi.isConnected()) {
            Serial.println("[MQTT Error] WiFi not connected");
            state = MQTT_ERROR;
            return;
        }
        
        // Initialize PubSubClient
        static WiFiClient espClient;
        mqtt_client = std::make_unique<PubSubClient>(espClient);
        
        mqtt_client->setServer(
            config.broker_address.c_str(),
            config.broker_port
        );
        
        mqtt_client->setCallback([this](char* topic, byte* payload, unsigned int length) {
            std::string topic_str(topic);
            std::string payload_str((char*)payload, length);
            
            if (on_message_callback) {
                on_message_callback(topic_str, payload_str);
            }
        });
        
        Serial.print("[MQTT] Connecting to ");
        Serial.print(config.broker_address.c_str());
        Serial.println("...");
        
        // Attempt connection
        if (mqtt_client->connect(
            config.client_id.c_str(),
            config.username.c_str(),
            config.password.c_str()
        )) {
            Serial.println("[MQTT] Connected to broker!");
            state = MQTT_CONNECTED;
            
            // Subscribe to topics
            mqtt_client->subscribe(config.subscribe_topic.c_str(), 1);
            
            // Flush pending messages
            flushPendingMessages();
        } else {
            Serial.print("[MQTT] Connection failed, rc=");
            Serial.println(mqtt_client->state());
            mqtt_reconnect_count++;
            state = MQTT_RECONNECTING;
        }
        
        connection_start_time = millis();
    #else
        // Simulation
        if (wifi.isConnected()) {
            state = MQTT_CONNECTED;
        }
    #endif
}

void RealTimeControl::flushPendingMessages() {
    #ifdef REAL_HARDWARE
        while (!pending_messages.empty() && mqtt_client->connected()) {
            auto& msg = pending_messages.front();
            mqtt_client->publish(
                msg.topic.c_str(),
                msg.payload.c_str(),
                false,  // retain
                msg.qos
            );
            pending_messages.pop();
            delay(10);  // Small delay between messages
        }
    #endif
}
```

### Step 3.3: Publishing Messages

**Current (Simulation stub):**
```cpp
void RealTimeControl::publish(const std::string& topic,
                              const std::string& payload,
                              uint8_t qos) {
    std::cout << "[MQTT SIM] PUBLISH " << topic << ": " << payload << std::endl;
}
```

**Required (Real Hardware):**
```cpp
void RealTimeControl::publish(const std::string& topic,
                              const std::string& payload,
                              uint8_t qos) {
    #ifdef REAL_HARDWARE
        if (!mqtt_client || !mqtt_client->connected()) {
            // Queue for later
            PendingMessage msg{topic, payload, qos};
            pending_messages.push(msg);
            return;
        }
        
        bool result = mqtt_client->publish(
            topic.c_str(),
            payload.c_str(),
            qos > 0  // retain if QoS > 0
        );
        
        if (!result) {
            Serial.print("[MQTT Error] Publish failed to topic: ");
            Serial.println(topic.c_str());
        }
    #else
        // Simulation
        if (!pending_messages.empty()) {
            Serial.print("[MQTT SIM] PUBLISH ");
            Serial.print(topic.c_str());
            Serial.print(": ");
            Serial.println(payload.c_str());
        }
    #endif
}
```

### Step 3.4: Main Loop Handling

**Current (Simulation):**
```cpp
void RealTimeControl::loop() {
    // State machine updates
}
```

**Required (Real Hardware):**
```cpp
void RealTimeControl::loop() {
    #ifdef REAL_HARDWARE
        if (!wifi.isConnected()) {
            if (mqtt_client && mqtt_client->connected()) {
                mqtt_client->disconnect();
                state = MQTT_DISCONNECTED;
            }
            return;
        }
        
        // Reconnect if needed
        if (!mqtt_client || !mqtt_client->connected()) {
            if (state != MQTT_RECONNECTING) {
                state = MQTT_RECONNECTING;
                mqtt_reconnect_count = 0;
            }
            
            if (mqtt_reconnect_count < MAX_MQTT_RECONNECT_ATTEMPTS) {
                if (millis() - last_reconnect_attempt > MQTT_RECONNECT_INTERVAL_SEC * 1000) {
                    Serial.print("[MQTT] Reconnect attempt ");
                    Serial.print(mqtt_reconnect_count + 1);
                    Serial.print("/");
                    Serial.println(MAX_MQTT_RECONNECT_ATTEMPTS);
                    
                    connectToBroker();
                    last_reconnect_attempt = millis();
                }
            } else {
                // Too many failures - restart WiFi
                Serial.println("[MQTT] Too many failures, restarting WiFi");
                wifi.reconnect();
            }
        } else {
            mqtt_reconnect_count = 0;
            mqtt_client->loop();  // Handle subscribed messages
        }
        
        // Try to flush pending messages
        if (mqtt_client && mqtt_client->connected()) {
            flushPendingMessages();
        }
    #else
        // Simulation
        // ... existing code ...
    #endif
}
```

## Phase 4: Build Configuration

### Update CMakeLists.txt or platformio.ini

For **platformio.ini**, add board-specific configurations:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200

lib_deps =
    knolleary/PubSubClient @ ^2.8

build_flags =
    -DREAL_HARDWARE=1
    -DSUPPORT_RTOS=1

[env:esp8266]
platform = espressif8266
board = nodemcuv2
framework = arduino
monitor_speed = 115200

lib_deps =
    knolleary/PubSubClient @ ^2.8

build_flags =
    -DREAL_HARDWARE=1
    -DSUPPORT_RTOS=1

# Fallback for simulation on PC
[env:native_sim]
platform = native
build_flags =
    -DREAL_HARDWARE=0
    -DSUPPORT_RTOS=0
```

## Phase 5: Credentials Storage (NVS)

### Provisioning WiFi Credentials

Create a helper function for initial provisioning:

```cpp
void provisionWiFiCredentials(
    const char* ssid,
    const char* password,
    const char* hostname = "iot-device"
) {
    #ifdef REAL_HARDWARE
        nvs_handle_t nvs_handle;
        nvs_open("wifi_config", NVS_READWRITE, &nvs_handle);
        
        nvs_set_str(nvs_handle, "ssid", ssid);
        nvs_set_str(nvs_handle, "password", password);
        nvs_set_str(nvs_handle, "hostname", hostname);
        nvs_commit(nvs_handle);
        nvs_close(nvs_handle);
        
        Serial.println("[NVS] WiFi credentials stored");
    #endif
}
```

### Provisioning MQTT Credentials

```cpp
void provisionMQTTConfig(
    const char* broker,
    uint32_t port,
    const char* client_id,
    const char* username,
    const char* password
) {
    #ifdef REAL_HARDWARE
        nvs_handle_t nvs_handle;
        nvs_open("mqtt_config", NVS_READWRITE, &nvs_handle);
        
        nvs_set_str(nvs_handle, "broker", broker);
        nvs_set_u32(nvs_handle, "port", port);
        nvs_set_str(nvs_handle, "client_id", client_id);
        nvs_set_str(nvs_handle, "username", username);
        nvs_set_str(nvs_handle, "password", password);
        nvs_commit(nvs_handle);
        nvs_close(nvs_handle);
        
        Serial.println("[NVS] MQTT config stored");
    #endif
}
```

## Phase 6: Testing Checklist

- [ ] Code compiles on ESP32/ESP8266
- [ ] WiFi connects to home router
- [ ] MQTT connects to broker
- [ ] Can publish sensor data
- [ ] Can receive commands via MQTT
- [ ] WiFi reconnects on disconnect
- [ ] MQTT queues messages when offline
- [ ] NTP syncs time on first boot
- [ ] Serial monitor shows full state transitions
- [ ] Works with WiFi power save enabled
- [ ] Memory usage acceptable (<400kb for critical features)
- [ ] Task scheduling still smooth under network activity

## Troubleshooting Real Hardware

### WiFi Fails to Associate

**Cause**: Wrong password or WiFi AP issue
```cpp
// Add debug output in associate():
Serial.print("[Debug] WiFi Status: ");
Serial.println(WiFi.status());  // Check numeric code
```

WiFi status codes:
- 0 = WL_IDLE_STATUS
- 1 = WL_NO_SSID_AVAIL
- 2 = WL_SCAN_COMPLETED
- 3 = WL_CONNECTED
- 4 = WL_CONNECT_FAILED
- 5 = WL_CONNECTION_LOST
- 6 = WL_DISCONNECTED

### MQTT Auth Fails

**Cause**: Wrong username/password
```cpp
// Add debug in connectToBroker():
Serial.print("[Debug] MQTT State: ");
Serial.println(mqtt_client->state());  // Returns error code
```

### Memory Exhaustion

**Solution**: Reduce buffer sizes or increase heap:
```cpp
// In ESP32 sketch setup():
heap_caps_print_heap_info(MALLOC_CAP_DEFAULT);  // Monitor heap

// Reduce message queue size in RealTimeControl.h:
static constexpr size_t MAX_PENDING_MESSAGES = 10;  // Was 50
```

## Summary: What Gets Replaced

| Component | Simulation | Real Hardware |
|-----------|-----------|---------------|
| WiFi auth | Print + fake delay | `WiFi.begin()` |
| IP assignment | Hardcoded IP | DHCP or static config |
| Internet check | Assumed OK | Ping test to 8.8.8.8 |
| Time sync | NTP stub | `configTime()` |
| MQTT connect | Print + fake delay | `mqtt_client->connect()` |
| Message publish | Print | `mqtt_client->publish()` |
| Callbacks | Simulated receive | Real PubSubClient callbacks |
| Config storage | Hardcoded | NVS (EEPROM) |
| Serial output | `std::cout` | `Serial.println()` |

## Next Steps

1. Choose target hardware (ESP32 or ESP8266)
2. Follow Phases 1-3 to implement library calls
3. Set up PlatformIO or Arduino IDE
4. Provision WiFi + MQTT credentials using helper functions
5. Test with real broker (e.g., mosquitto)
6. Monitor WiFi/MQTT failures with Serial output
7. Optimize for your specific use case
