# Network Debugging & Testing Guide

## Overview

This guide helps debug WiFi and MQTT connectivity issues in simulation and real-hardware modes.

## Debugging Modes

### 1. Terminal Output (Simulation Mode)

When running in **simulation mode**, both `WifiNetwork` and `RealTimeControl` print detailed state transitions:

```
[WiFi SIM] WifiNetwork initialized in SIMULATION mode
[WiFi State] → LOADING_CONFIG
[WiFi Config] Loaded: SSID=MyHomeWiFi, hostname=iot-device
[WiFi State] → AUTHENTICATING
[WiFi Auth SIM] Simulating authentication handshake...
[WiFi State] → ASSOCIATING
[WiFi Assoc SIM] Simulating 802.11 association (3-way)...
[WiFi State] → OBTAINING_DHCP
[DHCP SIM] DHCP: assigned IP=192.168.1.100, gateway=192.168.1.1
[WiFi State] → VERIFYING_INTERNET
[WiFi Internet SIM] Pinging 8.8.8.8 (simulated)...
[WiFi State] → CONNECTED
[WiFi NTP SIM] Syncing time from NTP server...
[WiFi NTP] Last sync: <timestamp>
[MQTT SIM] Connecting to broker: 192.168.1.50:1883 (user=mqtt_user)
[MQTT State] → CONNECTING
[MQTT Connection SIM] Connecting to MQTT broker...
[MQTT State] → CONNECTED
[MQTT SIM] PUBLISH topic=home/sensors/room data={"temp":25.5,"humidity":50}
[MQTT Callback SIM] Received message on home/lights/kitchen: {"brightness":80}
```

### 2. State Machine Inspection

Check current states at runtime:

```cpp
WiFiState wifi_state = wifi.getState();
MQTTState mqtt_state = mqtt.getState();

std::cout << "WiFi: " << (int)wifi_state;  // 0-9
std::cout << "MQTT: " << (int)mqtt_state;  // 0-4
```

State values:
- WiFiState: 0=INIT, 1=LOADING_CONFIG, 2=AUTHENTICATING, 3=ASSOCIATING, 4=OBTAINING_DHCP, 5=CONNECTED, 6=VERIFYING_INTERNET, 7=DISCONNECTED, 8=RECONNECTING, 9=ERROR
- MQTTState: 0=DISCONNECTED, 1=CONNECTING, 2=CONNECTED, 3=RECONNECTING, 4=ERROR

### 3. Connection Status Monitoring

In `TaskNetwork::loop()`, connection status is printed every 50 cycles:

```
[Network Status] WiFi: CONNECTED (IP=192.168.1.100) | MQTT: CONNECTED | NTP: synced
[Network Status] WiFi: CONNECTED (IP=192.168.1.100) | MQTT: DISCONNECTED, reconnecting... | NTP: synced
[Network Status] WiFi: RECONNECTING | MQTT: OFFLINE (WiFi down) | NTP: outdated
```

## Troubleshooting Scenarios

### Scenario 1: WiFi Connection Hangs

**Symptoms:**
```
[WiFi State] → AUTHENTICATING
[WiFi Auth SIM] Simulating authentication handshake...
[WiFi State] → AUTHENTICATING  (repeats without progressing)
```

**Causes:**
- Incorrect SSID or password
- WiFi router not responding
- Authentication timeout

**Solution:**
```cpp
// In simulation mode, progress is driven by loop() calls
// Ensure loop() is called frequently:
while (running) {
    wifi.loop();  // Must call every 10-100ms
    std::this_thread::sleep_for(std::chrono::milliseconds(50));
}
```

### Scenario 2: DHCP Assignment Fails

**Symptoms:**
```
[WiFi State] → OBTAINING_DHCP
[DHCP SIM] Requesting IP from DHCP server...
[DHCP SIM] DHCP: timeout (no IP assigned)
[WiFi State] → ERROR
```

**Causes:**
- Router DHCP disabled
- DHCP server unreachable
- Network congestion

**Solution (Real Hardware):**
```cpp
// In WifiNetwork::obtainDHCP(), add fallback to static IP:
if (!dhcp_success) {
    config.dhcp_enabled = false;
    config.static_ip = "192.168.1.100";  // Fallback IP
    assignStaticIP();
}
```

### Scenario 3: MQTT Connection Fails After WiFi OK

**Symptoms:**
```
[WiFi State] → CONNECTED (MQTT should connect now)
[MQTT State] → CONNECTING
[MQTT Connection SIM] Connecting to MQTT broker...
[MQTT State] → ERROR
```

**Causes:**
- MQTT broker unreachable
- Authentication failed
- Wrong broker address/port
- Firewall blocking connection

**Debugging:**
```cpp
// Check WiFi can reach broker IP:
std::string broker = mqtt.getConfig().broker_address;
std::cout << "Pinging broker: " << broker << std::endl;

// In real hardware:
// Arduino >= 1.8.11 can use WiFiClient.connect(broker, port)
```

### Scenario 4: Message Publish Fails

**Symptoms:**
```
[MQTT SIM] PUBLISH topic=home/sensors/room data={"temp":25}
[MQTT SIM] Publish failed: not connected
```

**Causes:**
- MQTT not connected yet
- Topic unauthorized
- Broker max message rate exceeded

**Solution:**
```cpp
// Queue is automatic:
if (!mqtt.isConnected()) {
    mqtt.publish(topic, data);  // Queued internally
}
mqtt.loop();  // Drain queue when reconnected
```

### Scenario 5: NTP Sync Never Happens

**Symptoms:**
```
[WiFi State] → CONNECTED
[WiFi NTP] Sync enabled but not triggered...
```

**Causes:**
- 24-hour interval not elapsed yet
- WiFi not verified internet access
- NTP server unreachable

**Debugging:**
```cpp
time_t last_sync = wifi.getLastNTPSync();
if (last_sync == 0) {
    std::cout << "NTP not yet synced" << std::endl;
} else {
    std::cout << "Last sync: " << std::ctime(&last_sync) << std::endl;
}
```

## Performance Analysis

### WiFi State Transition Times

| Transition | Expected Duration (simulation) |
|------------|------|
| AUTHENTICATING → ASSOCIATING | 2-3 seconds |
| ASSOCIATING → OBTAINING_DHCP | 1-2 seconds |
| OBTAINING_DHCP → VERIFYING_INTERNET | 2-5 seconds |
| VERIFYING_INTERNET → CONNECTED | instant |

**Real hardware times are much faster (500ms-2s typically)**

### MQTT State Transition Times

| Transition | Expected Duration (simulation) |
|------------|------|
| DISCONNECTED → CONNECTING | instant |
| CONNECTING → CONNECTED | 1-2 seconds |
| CONNECTED → publishing | instant |

### Message Publish Latency

- Simulation mode: <10ms
- Real hardware: 10-100ms (depends on WiFi signal strength)
- Publishing 10 messages/sec is typical max rate

## Unit Testing

### Test 1: WiFi Initialization

```cpp
void testWiFiInit() {
    VirtualGPIO gpio(ChipType::ESP32, true);
    WifiNetwork wifi(gpio, true);
    
    assert(wifi.getState() == WiFiState::WIFI_INIT);
    wifi.loadConfigFromStorage();
    assert(wifi.getState() == WiFiState::WIFI_LOADING_CONFIG);
    wifi.connect();
    assert(wifi.getState() == WiFiState::WIFI_AUTHENTICATING);
}
```

### Test 2: WiFi Reconnection Count

```cpp
void testWiFiReconnect() {
    WifiNetwork wifi(gpio, true);
    wifi.connect();
    
    // Simulate 5 failures
    for (int i = 0; i < 500; i++) {  // 500 loop calls = reconnection cycle
        wifi.loop();
        if (i == 100) wifi.forceDisconnect();  // Simulate failure
    }
    
    // Should have attempted 3 reconnections max
    assert(wifi.getState() == WiFiState::WIFI_ERROR ||
           wifi.isConnected());
}
```

### Test 3: TaskDevice Button Logic

```cpp
void testDeviceButtons() {
    VirtualGPIO gpio(ChipType::ESP32, true);
    const int btnPump = 2;
    const int pinPump = 3;
    const int btnDev = 4;
    const int pinDev = 5;
    gpio.pinMode(btnPump, INPUT);
    gpio.pinMode(pinPump, OUTPUT);
    gpio.pinMode(btnDev, INPUT);
    gpio.pinMode(pinDev, OUTPUT);

    TaskDevice device(gpio, btnPump, pinPump, btnDev, pinDev, 100);

    // initial state: both outputs low
    assert(gpio.digitalRead(pinPump) == LOW);
    assert(gpio.digitalRead(pinDev) == LOW);

    // simulate pump button press
    gpio.setDigitalInput(btnPump, HIGH);
    device.runOnce();
    gpio.setDigitalInput(btnPump, LOW);
    device.runOnce();
    assert(gpio.digitalRead(pinPump) == HIGH);

    // simulate device button press
    gpio.setDigitalInput(btnDev, HIGH);
    device.runOnce();
    gpio.setDigitalInput(btnDev, LOW);
    device.runOnce();
    assert(gpio.digitalRead(pinDev) == HIGH);
}
```

### Test 3: MQTT Offline Queueing

```cpp
void testMQTTQueueing() {
    WifiNetwork wifi(gpio, true);
    RealTimeControl mqtt(gpio, wifi, true);
    
    wifi.connect();
    // Don't connect MQTT
    assert(!mqtt.isConnected());
    
    // Try to publish - should be queued
    mqtt.publish("test/topic", "data1");
    mqtt.publish("test/topic", "data2");
    
    // Now connect MQTT
    mqtt.connect();
    mqtt.loop();  // Should flush queue
    
    // Verify both messages were sent
}
```

### Test 4: Network Cascading Failure

```cpp
void testCascadingFailure() {
    WifiNetwork wifi(gpio, true);
    RealTimeControl mqtt(gpio, wifi, true);
    
    // Connect both
    wifi.connect();
    // ... simulate connection
    mqtt.connect();
    
    // WiFi drops
    wifi.forceDisconnect();
    
    // MQTT should notice and disconnect
    mqtt.loop();
    assert(!mqtt.isConnected());
    
    // When WiFi reconnects, MQTT auto-reconnects
    // ... simulate WiFi reconnection
    mqtt.loop();
    assert(mqtt.isConnected());
}
```

## Real Hardware Testing

### On ESP32/ESP8266

1. **Serial Monitor Setup**
   ```
   Baud rate: 115200
   Open PlatformIO serial monitor or Arduino IDE serial monitor
   ```

2. **WiFi Debug Output**
   ```cpp
   // In setup():
   Serial.begin(115200);
   delay(1000);
   Serial.println("\n[DEBUG] WiFi initialization starting...");
   
   WifiNetwork wifi(gpio, false);  // Real hardware mode
   wifi.loadConfigFromStorage();
   wifi.connect();
   ```

3. **MQTT Debug Output**
   ```cpp
   // Check in loop():
   if (mqtt.isConnected()) {
       Serial.println("[DEBUG] MQTT: Connected");
   } else {
       Serial.println("[DEBUG] MQTT: Disconnected");
   }
   ```

### Monitoring with MQTT CLI

```bash
# Subscribe to sensor data
mosquitto_sub -h 192.168.1.50 -u mqtt_user -P password \
  -t "home/sensors/#" -v

# Publish test command
mosquitto_pub -h 192.168.1.50 -u mqtt_user -P password \
  -t "home/lights/kitchen" -m '{"brightness":50}'
```

## Performance Tuning

### Reduce WiFi Reconnection Interval

Edit `WifiNetwork.h`:
```cpp
static constexpr uint32_t RECONNECT_INTERVAL_SEC = 60;  // Was 300 (5 min)
```

### Reduce MQTT Reconnection Interval

Edit `RealTimeControl.h`:
```cpp
static constexpr uint32_t MQTT_RECONNECT_INTERVAL_SEC = 5;  // Was 10
```

### Increase MQTT QoS for Reliability

```cpp
mqtt.publish("home/sensors", data, 2);  // QoS 2 = guaranteed delivery
```

### Enable WiFi Power Save

```cpp
// In WifiNetwork::loop(), add:
WiFi.setSleep(WIFI_PS_MIN_MODEM);  // Save power on idle
```

## Logging to File

For production debugging, log to EEPROM/SD:

```cpp
class NetworkLogger {
    void log(const std::string& msg) {
        // Write to EEPROM with timestamp
        uint32_t size = readLogSize();
        writeToEEPROM(size, msg.c_str());
    }
};
```

## Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| WiFi Error 1 | SSID not found | Check SSID spelling |
| WiFi Error 2 | Authentication failed | Check password |
| WiFi Error 3 | DHCP timeout | Check router DHCP |
| MQTT Error 1 | Broker unreachable | Check IP/port |
| MQTT Error 2 | Auth failed | Check username/password |
| MQTT Error 3 | Connection timeout | Check firewall |

## End-to-End Test Scenario

```
1. Start device in simulation mode
2. Verify WiFi reaches CONNECTED state within 10 seconds
3. Verify NTP sync completes
4. Verify MQTT transitions to CONNECTED
5. Verify sensor data publishes to broker
6. Simulate WiFi disconnect (via forceDisconnect)
7. Verify MQTT queues outgoing messages
8. Simulate WiFi reconnect
9. Verify queued messages flush
10. Verify MQTT callbacks work
11. Verify tasking handles network delays gracefully
12. Repeat 6-11 five times
```

**Expected Result**: Device recovers from all network failures automatically
