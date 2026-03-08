#include "TaskNetwork.h"
#include <iostream>

TaskNetwork::TaskNetwork(VirtualGPIO& gpioRef, TaskSensor& sensorTask, TaskDevice& deviceTask, int period_ms)
    : Task(period_ms), gpio(gpioRef), sensor(sensorTask), device(deviceTask) {
    
    // Initialize network components
    initializeNetwork();
}

void TaskNetwork::initializeNetwork() {
    std::cout << "\n[TaskNetwork] Initializing network components..." << std::endl;
    
    // Create WifiNetwork
    wifi_network = std::make_unique<WifiNetwork>(gpio, gpio.isSimulationMode());
    wifi_network->loadConfigFromStorage();
    wifi_network->connect();
    
    // Create RealTimeControl with reference to WifiNetwork
    mqtt_controller = std::make_unique<RealTimeControl>(gpio, *wifi_network, gpio.isSimulationMode());
    mqtt_controller->loadConfigFromStorage();
    
    // Setup MQTT message callback
    mqtt_controller->setOnMessageReceived([this](const std::string& topic, const std::string& payload) {
        std::cout << "[TaskNetwork] MQTT Message Received on " << topic << ": " << payload << std::endl;
        // Handle incoming MQTT messages here
    });
    
    std::cout << "[TaskNetwork] Network initialization complete" << std::endl;
}

void TaskNetwork::handleNetworkStatus() {
    if (!wifi_network) return;
    
    // Update WiFi connection state
    wifi_network->loop();
    
    // If WiFi is connected, update MQTT
    if (wifi_network->isConnected()) {
        if (!mqtt_controller->isConnected()) {
            mqtt_controller->connect();
        }
        mqtt_controller->loop();
    } else {
        if (mqtt_controller->isConnected()) {
            mqtt_controller->disconnect();
        }
    }
}

void TaskNetwork::sendMQTT(const std::string& topic, const std::string& payload) {
    if (!mqtt_controller) return;
    
    if (mqtt_controller->isConnected()) {
        mqtt_controller->publish(topic, payload, 1);
    } else {
        if (gpio.isSimulationMode()) {
            std::cout << "[MQTT SIM] Not connected. Message queued: " << payload << std::endl;
        } else {
            std::cout << "[MQTT HW] Not connected. Message will be sent when MQTT reconnects." << std::endl;
        }
    }
}

void TaskNetwork::sendUART(const std::string& message) {
    if (gpio.isSimulationMode()) {
        std::cout << "[UART SIM] " << message << std::endl;
    } else {
        std::cout << "[UART HW] " << message << " [REAL]" << std::endl;
        // Real code would send over UART serial interface
    }
}

void TaskNetwork::loop() {
    // Handle WiFi and MQTT connection management
    handleNetworkStatus();
    
    // Get sensor data
    SensorData data = sensor.getData();
    
    // Prepare sensor data payload
    std::string payload = "temp=" + std::to_string(data.temperature) +
                          ",hum=" + std::to_string(data.humidity) +
                          ",light=" + std::to_string(data.light);
    
    // Send via MQTT
    sendMQTT("home/sensors/room", payload);
    
    // Also send via UART (for debugging/monitoring)
    sendUART(payload);
    
    // Print status periodically
    static int status_counter = 0;
    status_counter++;
    if (status_counter > 50) {
        std::cout << "\n[TaskNetwork Status]" << std::endl;
        std::cout << "  WiFi: " << (wifi_network->isConnected() ? "CONNECTED" : "DISCONNECTED") << std::endl;
        std::cout << "  MQTT: " << (mqtt_controller->isConnected() ? "CONNECTED" : "DISCONNECTED") << std::endl;
        std::cout << "  IP: " << wifi_network->getIPAddress() << std::endl;
        std::cout << std::endl;
        status_counter = 0;
    }
}
