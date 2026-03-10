#include "RealTimeControl.h"
#include <iostream>
#include <chrono>

RealTimeControl::RealTimeControl(WifiNetwork& wifi)
    : wifi(wifi),
      current_state(MQTT_DISCONNECTED), previous_state(MQTT_DISCONNECTED),
      reconnect_attempts(0), last_mqtt_reconnect_attempt(0) {
    
#if SIMULATION_MODE
    std::cout << "[MQTT SIM] RealTimeControl initialized in SIMULATION mode" << std::endl;
#endif
    // Real hardware mode: no initialization logs (like Arduino)
}

void RealTimeControl::loadConfigFromStorage() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
#if SIMULATION_MODE
    // Simulation: use hardcoded MQTT config
    config.broker_address = "192.168.1.50";
    config.broker_port = 1883;
    config.client_id = "esp32-client-001";
    config.username = "mqtt_user";
    config.password = "mqtt_pass";
    config.publish_topic = "home/sensors/room/data";
    config.subscribe_topic = "home/control/room/cmd";
    std::cout << "[MQTT SIM] Loaded MQTT config from storage (simulation)" << std::endl;
#else
    // Real hardware: load from EEPROM/NVS (no logs)
    // config.broker_address = readFromEEPROM(MQTT_BROKER_ADDR);
#endif
    
#if SIMULATION_MODE
    std::cout << "[MQTT] Broker: " << config.broker_address << ":" << config.broker_port << std::endl;
#endif
}

void RealTimeControl::setMQTTConfig(const MQTTConfig& cfg) {
    std::lock_guard<std::mutex> lock(state_mutex);
    config = cfg;
#if SIMULATION_MODE
    std::cout << "[MQTT] Config set: broker=" << config.broker_address << ":" << config.broker_port << std::endl;
#endif
}

void RealTimeControl::connect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    // Check if WiFi is connected first
    if (!wifi.isConnected()) {
#if SIMULATION_MODE
        std::cout << "[MQTT] WiFi not connected. Cannot connect to MQTT broker." << std::endl;
#endif
        current_state = MQTT_ERROR;
        return;
    }
    
    if (current_state == MQTT_CONNECTED) {
#if SIMULATION_MODE
        std::cout << "[MQTT] Already connected" << std::endl;
#endif
        return;
    }
    
    current_state = MQTT_CONNECTING;
#if SIMULATION_MODE
    std::cout << "[MQTT] Starting connection to broker " << config.broker_address << std::endl;
#endif
}

void RealTimeControl::disconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    current_state = MQTT_DISCONNECTED;
#if SIMULATION_MODE
    std::cout << "[MQTT] Disconnected from broker" << std::endl;
#endif
}

void RealTimeControl::reconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    // First check if WiFi is still connected
    if (!wifi.isConnected()) {
#if SIMULATION_MODE
        std::cout << "[MQTT] WiFi disconnected. Starting WiFi reconnection..." << std::endl;
#endif
        wifi.reconnect();
        current_state = MQTT_ERROR;
        return;
    }
    
    time_t now = std::time(nullptr);
    
    if (reconnect_attempts >= MAX_MQTT_RECONNECT_ATTEMPTS) {
#if SIMULATION_MODE
        std::cout << "[MQTT] Max MQTT reconnect attempts (" << MAX_MQTT_RECONNECT_ATTEMPTS 
                  << ") reached. Restarting WiFi..." << std::endl;
#endif
        reconnect_attempts = 0;
        wifi.disconnect();
        wifi.connect();
        current_state = MQTT_ERROR;
        return;
    }
    
    if (now - last_mqtt_reconnect_attempt < MQTT_RECONNECT_INTERVAL_SEC) {
        return;
    }
    
    reconnect_attempts++;
    last_mqtt_reconnect_attempt = now;
    current_state = MQTT_RECONNECTING;
    
#if SIMULATION_MODE
    std::cout << "[MQTT] Reconnect attempt " << reconnect_attempts << "/" 
              << MAX_MQTT_RECONNECT_ATTEMPTS << std::endl;
#endif
    
    std::cout << "[MQTT] Reconnect attempt " << reconnect_attempts << "/" 
              << MAX_MQTT_RECONNECT_ATTEMPTS << std::endl;
}

void RealTimeControl::publish(const std::string& topic, const std::string& payload, int qos) {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (!isConnected()) {
#if SIMULATION_MODE
        std::cout << "[MQTT] Not connected. Queueing message for later delivery." << std::endl;
#endif
        pending_messages.push(payload);
        return;
    }
    
#if SIMULATION_MODE
    std::cout << "[MQTT SIM] PUBLISH topic=" << topic << " data=" << payload << " qos=" << qos << std::endl;
#else
    // Real hardware: MqttClient.publish(topic.c_str(), payload.c_str(), 1, qos); (no logs)
#endif
}

void RealTimeControl::subscribe(const std::string& topic, int qos) {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (!isConnected()) {
#if SIMULATION_MODE
        std::cout << "[MQTT] Not connected. Cannot subscribe to " << topic << std::endl;
#endif
        return;
    }
    
#if SIMULATION_MODE
    std::cout << "[MQTT SIM] SUBSCRIBE topic=" << topic << " qos=" << qos << std::endl;
#else
    // Real hardware: MqttClient.subscribe(topic.c_str(), qos); (no logs)
#endif
}

void RealTimeControl::setOnMessageReceived(MQTTMessageCallback callback) {
    std::lock_guard<std::mutex> lock(state_mutex);
    on_message_callback = callback;
#if SIMULATION_MODE
    std::cout << "[MQTT] Message callback registered" << std::endl;
#endif
}

bool RealTimeControl::isConnected() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return current_state == MQTT_CONNECTED;
}

MQTTState RealTimeControl::getState() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return current_state;
}

void RealTimeControl::loop() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    // Check WiFi status
    if (!wifi.isConnected() && current_state != MQTT_ERROR) {
#if SIMULATION_MODE
        std::cout << "[MQTT] WiFi disconnected. Disconnecting MQTT..." << std::endl;
#endif
        current_state = MQTT_ERROR;
    }
    
    // State machine
    handleStateTransition();
    
#if SIMULATION_MODE
    // Simulate MQTT connection for demo
    static int sim_counter = 0;
    sim_counter++;
    if (sim_counter > 30 && current_state == MQTT_CONNECTING) {
        current_state = MQTT_CONNECTED;
        resetReconnectCounter();
        std::cout << "[MQTT SIM] Connected to broker " << config.broker_address << std::endl;
    }
#endif
}

void RealTimeControl::handleStateTransition() {
    if (current_state == previous_state) return;
    
#if SIMULATION_MODE
    switch (current_state) {
        case MQTT_CONNECTING:
            std::cout << "[MQTT State] → CONNECTING to " << config.broker_address << std::endl;
            connectToBroker();
            break;
        case MQTT_CONNECTED:
            std::cout << "[MQTT State] → CONNECTED" << std::endl;
            // Flush pending messages
            while (!pending_messages.empty()) {
                std::cout << "[MQTT] Flushing pending message..." << std::endl;
                pending_messages.pop();
            }
            break;
        case MQTT_DISCONNECTED:
            std::cout << "[MQTT State] → DISCONNECTED" << std::endl;
            handleDisconnect();
            break;
        case MQTT_RECONNECTING:
            std::cout << "[MQTT State] → RECONNECTING" << std::endl;
            break;
        case MQTT_ERROR:
            std::cout << "[MQTT State] → ERROR" << std::endl;
            break;
        default:
            break;
    }
#else
    // Real hardware: execute state handlers without logging
    switch (current_state) {
        case MQTT_CONNECTING:
            connectToBroker();
            break;
        case MQTT_CONNECTED:
            // Flush pending messages (no logs)
            while (!pending_messages.empty()) {
                pending_messages.pop();
            }
            break;
        case MQTT_DISCONNECTED:
            handleDisconnect();
            break;
        default:
            break;
    }
#endif
    
    previous_state = current_state;
}

void RealTimeControl::connectToBroker() {
#if SIMULATION_MODE
    std::cout << "[MQTT SIM] Connecting to broker: " << config.broker_address 
              << ":" << config.broker_port << std::endl;
    std::cout << "[MQTT SIM] Client ID: " << config.client_id << std::endl;
    std::cout << "[MQTT SIM] Auth: " << config.username << std::endl;
#else
    // Real hardware: MqttClient.setServer(broker, port); MqttClient.connect(clientId, username, password); (no logs)
#endif
}

void RealTimeControl::handleDisconnect() {
#if SIMULATION_MODE
    std::cout << "[MQTT] MQTT disconnected. Will attempt reconnection..." << std::endl;
#endif
    reconnect_attempts = 0;
}

void RealTimeControl::resetReconnectCounter() {
    reconnect_attempts = 0;
    last_mqtt_reconnect_attempt = 0;
}

void RealTimeControl::simulateMQTTConnection() {
#if !SIMULATION_MODE
    return;
#endif
    
    // Simulate random MQTT disconnects for testing
    static int sim_mqtt_counter = 0;
    sim_mqtt_counter++;
    
    if (sim_mqtt_counter > 300 && current_state == MQTT_CONNECTED) {
        std::cout << "[MQTT SIM] Simulating MQTT disconnection..." << std::endl;
        current_state = MQTT_DISCONNECTED;
        sim_mqtt_counter = 0;
    }
}

void RealTimeControl::simulateMessageReceive() {
#if !SIMULATION_MODE
    return;
#endif
    if (current_state != MQTT_CONNECTED) return;
    
    static int msg_counter = 0;
    msg_counter++;
    
    if (msg_counter > 100) {
        std::cout << "[MQTT SIM] Received message on " << config.subscribe_topic 
                  << ": {'cmd':'turn_on'}" << std::endl;
        if (on_message_callback) {
            on_message_callback(config.subscribe_topic, "{\"cmd\":\"turn_on\"}");
        }
        msg_counter = 0;
    }
}
