#ifndef REALTIME_CONTROL_H
#define REALTIME_CONTROL_H

#include "WifiNetwork.h"
#include <string>
#include <functional>
#include <ctime>
#include <mutex>
#include <queue>

/**
 * RealTimeControl - Manages MQTT connectivity and real-time data transmission
 * 
 * Monitors WiFi connection and MQTT broker status.
 * Handles publish/subscribe operations.
 * Auto-reconnects MQTT if connection lost (max 5 attempts before WiFi restart).
 * Workflow:
 * - If WiFi lost → reconnect WiFi → reconnect MQTT (after WiFi restored)
 * - If MQTT lost → check WiFi internet → reconnect MQTT (max 5 fails then restart WiFi)
 */

struct MQTTConfig {
    std::string broker_address;
    int broker_port;
    std::string client_id;
    std::string username;
    std::string password;
    std::string publish_topic;
    std::string subscribe_topic;
};

enum MQTTState {
    MQTT_DISCONNECTED,
    MQTT_CONNECTING,
    MQTT_CONNECTED,
    MQTT_RECONNECTING,
    MQTT_ERROR
};

// Callback for received MQTT messages
using MQTTMessageCallback = std::function<void(const std::string& topic, const std::string& payload)>;

class RealTimeControl {
public:
    RealTimeControl(WifiNetwork& wifi);
    
    // Configuration
    void loadConfigFromStorage();
    void setMQTTConfig(const MQTTConfig& config);
    
    // Connection management
    void connect();
    void disconnect();
    void reconnect();
    
    // Publish/Subscribe
    void publish(const std::string& topic, const std::string& payload, int qos = 0);
    void subscribe(const std::string& topic, int qos = 0);
    void setOnMessageReceived(MQTTMessageCallback callback);
    
    // Status
    bool isConnected();
    MQTTState getState();
    
    // Monitoring (called periodically)
    void loop();
    
private:
    WifiNetwork& wifi;
    
    MQTTConfig config;
    MQTTState current_state;
    MQTTState previous_state;
    
    // Reconnection tracking
    int reconnect_attempts;
    static const int MAX_MQTT_RECONNECT_ATTEMPTS = 5;
    static const int MQTT_RECONNECT_INTERVAL_SEC = 10;
    time_t last_mqtt_reconnect_attempt;
    
    // Message callback
    MQTTMessageCallback on_message_callback;
    
    // Message queue (for offline storage)
    std::queue<std::string> pending_messages;
    
    // Thread safety
    mutable std::mutex state_mutex;
    
    // Internal state machine
    void handleStateTransition();
    void connectToBroker();
    void handleDisconnect();
    void resetReconnectCounter();
    
    // Simulation helpers
    void simulateMQTTConnection();
    void simulateMessageReceive();
};

#endif // REALTIME_CONTROL_H
