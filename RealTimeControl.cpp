#include "RealTimeControl.h"
#include <iostream>
#include <chrono>

RealTimeControl::RealTimeControl(VirtualGPIO& gpio, WifiNetwork& wifi, bool simulation_mode)
    : gpio(gpio), wifi(wifi), simulation_mode(simulation_mode),
      current_state(MQTT_DISCONNECTED), previous_state(MQTT_DISCONNECTED),
      reconnect_attempts(0), last_mqtt_reconnect_attempt(0) {
    
    if (simulation_mode) {
        std::cout << "[MQTT SIM] RealTimeControl initialized in SIMULATION mode" << std::endl;
    } else {
        std::cout << "[MQTT HW] RealTimeControl initialized in REAL HARDWARE mode (PubSubClient)" << std::endl;
    }
}

void RealTimeControl::loadConfigFromStorage() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (simulation_mode) {
        // Simulation: use hardcoded MQTT config
        config.broker_address = "192.168.1.50";
        config.broker_port = 1883;
        config.client_id = "esp32-client-001";
        config.username = "mqtt_user";
        config.password = "mqtt_pass";
        config.publish_topic = "home/sensors/room/data";
        config.subscribe_topic = "home/control/room/cmd";
        std::cout << "[MQTT SIM] Loaded MQTT config from storage (simulation)" << std::endl;
    } else {
        std::cout << "[MQTT HW] Loading MQTT config from ESP32/ESP8266 storage..." << std::endl;
        // config.broker_address = readFromEEPROM(MQTT_BROKER_ADDR);
    }
    
    std::cout << "[MQTT] Broker: " << config.broker_address << ":" << config.broker_port << std::endl;
}

void RealTimeControl::setMQTTConfig(const MQTTConfig& cfg) {
    std::lock_guard<std::mutex> lock(state_mutex);
    config = cfg;
    std::cout << "[MQTT] Config set: broker=" << config.broker_address << ":" << config.broker_port << std::endl;
}

void RealTimeControl::connect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    // Check if WiFi is connected first
    if (!wifi.isConnected()) {
        std::cout << "[MQTT] WiFi not connected. Cannot connect to MQTT broker." << std::endl;
        current_state = MQTT_ERROR;
        return;
    }
    
    if (current_state == MQTT_CONNECTED) {
        std::cout << "[MQTT] Already connected" << std::endl;
        return;
    }
    
    current_state = MQTT_CONNECTING;
    std::cout << "[MQTT] Starting connection to broker " << config.broker_address << std::endl;
}

void RealTimeControl::disconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    current_state = MQTT_DISCONNECTED;
    std::cout << "[MQTT] Disconnected from broker" << std::endl;
}

void RealTimeControl::reconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    // First check if WiFi is still connected
    if (!wifi.isConnected()) {
        std::cout << "[MQTT] WiFi disconnected. Starting WiFi reconnection..." << std::endl;
        wifi.reconnect();
        current_state = MQTT_ERROR;
        return;
    }
    
    time_t now = std::time(nullptr);
    
    if (reconnect_attempts >= MAX_MQTT_RECONNECT_ATTEMPTS) {
        std::cout << "[MQTT] Max MQTT reconnect attempts (" << MAX_MQTT_RECONNECT_ATTEMPTS 
                  << ") reached. Restarting WiFi..." << std::endl;
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
    
    std::cout << "[MQTT] Reconnect attempt " << reconnect_attempts << "/" 
              << MAX_MQTT_RECONNECT_ATTEMPTS << std::endl;
}

void RealTimeControl::publish(const std::string& topic, const std::string& payload, int qos) {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (!isConnected()) {
        std::cout << "[MQTT] Not connected. Queueing message for later delivery." << std::endl;
        pending_messages.push(payload);
        return;
    }
    
    if (simulation_mode) {
        std::cout << "[MQTT SIM] PUBLISH topic=" << topic << " data=" << payload << " qos=" << qos << std::endl;
    } else {
        std::cout << "[MQTT HW] Publishing to " << topic << " qos=" << qos << std::endl;
        // Real hardware: MqttClient.publish(topic.c_str(), payload.c_str(), 1, qos);
    }
}

void RealTimeControl::subscribe(const std::string& topic, int qos) {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (!isConnected()) {
        std::cout << "[MQTT] Not connected. Cannot subscribe to " << topic << std::endl;
        return;
    }
    
    if (simulation_mode) {
        std::cout << "[MQTT SIM] SUBSCRIBE topic=" << topic << " qos=" << qos << std::endl;
    } else {
        std::cout << "[MQTT HW] Subscribing to " << topic << " qos=" << qos << std::endl;
        // Real hardware: MqttClient.subscribe(topic.c_str(), qos);
    }
}

void RealTimeControl::setOnMessageReceived(MQTTMessageCallback callback) {
    std::lock_guard<std::mutex> lock(state_mutex);
    on_message_callback = callback;
    std::cout << "[MQTT] Message callback registered" << std::endl;
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
        std::cout << "[MQTT] WiFi disconnected. Disconnecting MQTT..." << std::endl;
        current_state = MQTT_ERROR;
    }
    
    // State machine
    handleStateTransition();
    
    if (simulation_mode) {
        // Simulate MQTT connection for demo
        static int sim_counter = 0;
        sim_counter++;
        if (sim_counter > 30 && current_state == MQTT_CONNECTING) {
            current_state = MQTT_CONNECTED;
            resetReconnectCounter();
            std::cout << "[MQTT SIM] Connected to broker " << config.broker_address << std::endl;
        }
    }
}

void RealTimeControl::handleStateTransition() {
    if (current_state == previous_state) return;
    
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
    
    previous_state = current_state;
}

void RealTimeControl::connectToBroker() {
    if (simulation_mode) {
        std::cout << "[MQTT SIM] Connecting to broker: " << config.broker_address 
                  << ":" << config.broker_port << std::endl;
        std::cout << "[MQTT SIM] Client ID: " << config.client_id << std::endl;
        std::cout << "[MQTT SIM] Auth: " << config.username << std::endl;
    } else {
        std::cout << "[MQTT HW] Connecting to broker (real PubSubClient library)" << std::endl;
        // Real hardware: MqttClient.setServer(broker, port);
        //               MqttClient.connect(clientId, username, password);
    }
}

void RealTimeControl::handleDisconnect() {
    std::cout << "[MQTT] MQTT disconnected. Will attempt reconnection..." << std::endl;
    reconnect_attempts = 0;
}

void RealTimeControl::resetReconnectCounter() {
    reconnect_attempts = 0;
    last_mqtt_reconnect_attempt = 0;
}

void RealTimeControl::simulateMQTTConnection() {
    if (!simulation_mode) return;
    
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
    if (!simulation_mode || current_state != MQTT_CONNECTED) return;
    
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
