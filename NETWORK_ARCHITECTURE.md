# WiFi & MQTT Network Implementation

## Architecture Overview

The `TaskNetwork` now uses two specialized classes to manage connectivity:

```
┌─────────────────────────────────────────────────┐
│           TaskNetwork (Base Task)               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────────────────────┐                  │
│  │  WifiNetwork             │                  │
│  │  - WiFi connection       │                  │
│  │  - DHCP + Auth           │                  │
│  │  - NTP time sync (daily) │                  │
│  │  - Auto-reconnect (3x)   │                  │
│  └──────────────────────────┘                  │
│           ↓                                     │
│  ┌──────────────────────────┐                  │
│  │  RealTimeControl         │                  │
│  │  - MQTT broker connect   │                  │
│  │  - Publish/Subscribe     │                  │
│  │  - Auto-reconnect (5x)   │                  │
│  │  - Message queuing       │                  │
│  └──────────────────────────┘                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Class Descriptions

### WifiNetwork

Manages WiFi connectivity with state machine:

| State | Description |
|-------|-------------|
| `WIFI_INIT` | Initial state |
| `WIFI_LOADING_CONFIG` | Loading credentials from storage |
| `WIFI_AUTHENTICATING` | Sending credentials to AP |
| `WIFI_ASSOCIATING` | Performing 4-way handshake |
| `WIFI_OBTAINING_DHCP` | Requesting IP from DHCP |
| `WIFI_CONNECTED` | Connected, verifying internet |
| `WIFI_RECONNECTING` | Attempting to reconnect |
| `WIFI_ERROR` | Error state |

**Key Features:**
- Authentication (WPA2, etc.)
- Association (802.11 join)
- Dynamic DHCP IP assignment
- Internet verification (ping/HTTP)
- Auto-reconnect: max 3 attempts, 5 min interval
- NTP time sync: once every 24 hours
- Thread-safe state management

**Usage:**
```cpp
WifiNetwork wifi(gpio, true);  // true = simulation mode
wifi.loadConfigFromStorage();
wifi.connect();
wifi.loop();  // Call periodically to update state

if (wifi.isConnected()) {
    std::cout << "IP: " << wifi.getIPAddress() << std::endl;
}
```

### RealTimeControl

Manages MQTT broker connectivity and real-time data transmission:

| State | Description |
|-------|-------------|
| `MQTT_DISCONNECTED` | Not connected |
| `MQTT_CONNECTING` | Connecting to broker |
| `MQTT_CONNECTED` | Connected, ready to publish/subscribe |
| `MQTT_RECONNECTING` | Attempting to reconnect |
| `MQTT_ERROR` | Error state |

**Key Features:**
- MQTT broker connection (with auth)
- Publish with QoS support
- Subscribe with callbacks
- Auto-reconnect: max 5 attempts, 10 sec interval
- Message queuing when offline
- Integrated WiFi status checking
- If WiFi down → restart WiFi
- If MQTT fails 5x → restart WiFi
- Thread-safe operations

**Usage:**
```cpp
RealTimeControl mqtt(gpio, wifi, true);  // wifi is WifiNetwork instance
mqtt.loadConfigFromStorage();
mqtt.connect();

// Set message callback
mqtt.setOnMessageReceived([](const std::string& topic, const std::string& payload) {
    std::cout << "Received: " << payload << std::endl;
});

// Publish data
mqtt.publish("home/sensors/room", "temp=25,hum=50,light=600", 1);

mqtt.loop();  // Call periodically
```

## Workflow Diagram

### Boot Sequence

```
┌─ Boot
│
├─ Load WiFi config from ROM/EEPROM
│  └─ WifiNetwork::loadConfigFromStorage()
│
├─ Connect to WiFi
│  ├─ Authentication (WPA2)
│  ├─ Association (802.11 handshake)
│  ├─ DHCP (obtain IP)
│  └─ Verify Internet (ping test)
│
├─ Sync time from NTP server
│  └─ WifiNetwork::syncTimeFromNTP()
│
├─ Load MQTT config from ROM/EEPROM
│  └─ RealTimeControl::loadConfigFromStorage()
│
└─ Connect to MQTT broker
   └─ RealTimeControl::connect()
```

### Runtime Connectivity Monitoring

```
WiFi Connected? ──Yes─→ MQTT Connected? ──Yes─→ Normal Operation
                          │
                          No
                          │
                    Reconnect MQTT (5x, 10s interval)
                          │
                       Fail 5x?
                          │
                         Yes
                          │
                    Restart WiFi
│
No
│
Reconnect WiFi (3x, 5min interval)
│
Fail 3x?
│
Yes
│
Full Reset/Reboot
```

## Simulation vs Real Hardware

Both `WifiNetwork` and `RealTimeControl` support dual-mode operation:

### Simulation Mode (Windows/Linux Development)
- WiFi connection: simulated state transitions
- MQTT: prints to console
- No actual network access required
- Perfect for testing application logic

```cpp
WifiNetwork wifi(gpio, true);   // true = simulation
RealTimeControl mqtt(gpio, wifi, true);
```

Output:
```
[WiFi SIM] WifiNetwork initialized in SIMULATION mode
[WiFi State] → AUTHENTICATING (SSID: MyHomeWiFi)
[WiFi State] → ASSOCIATING
[WiFi State] → OBTAINING_DHCP
[DHCP SIM] DHCP: assigned IP=192.168.1.100
[WiFi State] → CONNECTED
[WiFi NTP SIM] Syncing time from NTP server...
[MQTT SIM] Connecting to broker: 192.168.1.50:1883
[MQTT SIM] PUBLISH topic=home/sensors/room data=temp=25,hum=50
```

### Real Hardware Mode (ESP32/ESP8266)
- Uses PubSubClient library for MQTT
- Uses built-in WiFi drivers
- Uses configTime() for NTP
- Full production operation

```cpp
WifiNetwork wifi(gpio, false);  // false = real hardware
RealTimeControl mqtt(gpio, wifi, false);
```

## Time Synchronization

- **First sync**: On WiFi connection
- **Periodic sync**: Every 24 hours thereafter
- Uses NTP (Network Time Protocol)
- Required for logging, MQTT timestamps, etc.

```cpp
time_t last_sync = wifi.getLastNTPSync();
std::cout << "Last NTP sync: " << std::ctime(&last_sync);
```

## Error Recovery Strategies

### WiFi Disconnection
1. Detect disconnection
2. Attempt reconnect (3 times)
3. Wait 5 minutes between attempts
4. After 3 failures: full WiFi reset
5. Restart connection sequence

### MQTT Connection Failure
1. Verify WiFi still has internet
2. Attempt MQTT reconnect (5 times)
3. Wait 10 seconds between attempts
4. After 5 failures: restart WiFi
5. WiFi will re-establish, then MQTT can reconnect

### Logic
```
WiFi Lost?
├─ Yes: Disconnect MQTT, restart WiFi sequence
└─ No: 
  MQTT Lost?
  ├─ Yes: Verify WiFi internet
  │  ├─ Internet OK: Reconnect MQTT (5x)
  │  └─ Internet Lost: Already handled by WiFi
  └─ No: Continue normal operation
```

## Integration with TaskNetwork

`TaskNetwork` uses both classes to manage all network operations:

```cpp
class TaskNetwork : public Task {
private:
    std::unique_ptr<WifiNetwork> wifi_network;
    std::unique_ptr<RealTimeControl> mqtt_controller;

public:
    void loop() override {
        // Update WiFi and MQTT states
        handleNetworkStatus();
        
        // Publish sensor data
        SensorData data = sensor.getData();
        std::string payload = /* ... */;
        sendMQTT("home/sensors/room", payload);
    }
};
```

When called periodically in `main.cpp`:

```cpp
#if SUPPORT_RTOS
    network.start();  // Runs in own thread
#else
    network.runOnce();  // Called from main loop
#endif
```

## Configuration Storage

Both classes can load configuration from EEPROM/NVS:

**WifiNetwork config:**
- SSID
- Password
- Hostname
- DHCP enable/disable
- Static IP (if DHCP disabled)

**RealTimeControl config:**
- MQTT broker address
- MQTT port
- Client ID
- Username/Password
- Publish topic
- Subscribe topic

In simulation mode, hardcoded defaults are used. In real hardware, implement:
```cpp
void WifiNetwork::loadConfigFromStorage() {
    config.ssid = readFromEEPROM(SSID_ADDR);
    config.password = readFromEEPROM(PASSWORD_ADDR);
    // ...
}
```

## Testing Checklist

- [ ] WiFi connection in simulation mode
- [ ] WiFi reconnection after 3 failures
- [ ] MQTT connection after WiFi established
- [ ] MQTT message publishing
- [ ] MQTT message subscription + callback
- [ ] MQTT reconnection after 5 failures
- [ ] NTP time sync (24-hour interval)
- [ ] Message queuing when MQTT offline
- [ ] Mode switching (simulation ↔ real hardware)
- [ ] Thread safety with multiple tasks

## Future Enhancements

- [ ] TLS/SSL support for MQTT
- [ ] Custom WiFi provisioning UI
- [ ] MQTT last-will testament (LWT)
- [ ] Configurable reconnection intervals
- [ ] Event logging to EEPROM
- [ ] OTA firmware update support
- [ ] mDNS service discovery
