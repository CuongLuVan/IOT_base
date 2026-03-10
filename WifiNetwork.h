#ifndef WIFI_NETWORK_H
#define WIFI_NETWORK_H

#include "gpio/VirtualGPIO.h"
#include <string>
#include <ctime>
#include <mutex>

/**
 * WifiNetwork - Manages WiFi connectivity
 * 
 * Workflow:
 * 1. Boot → Load WiFi config from EEPROM/storage
 * 2. Connect to WiFi (Authentication + Association + DHCP)
 * 3. Verify Internet connectivity
 * 4. Monitor connection health
 * 5. Auto-reconnect on disconnect (max 3 attempts, 5min intervals)
 * 6. Sync time from NTP server every 24 hours
 */

struct WiFiConfig {
    std::string ssid;
    std::string password;
    std::string hostname;
    bool dhcp_enabled;
    uint32_t static_ip;
    uint32_t gateway;
    uint32_t netmask;
};

enum WiFiState {
    WIFI_INIT,
    WIFI_LOADING_CONFIG,
    WIFI_AUTHENTICATING,
    WIFI_ASSOCIATING,
    WIFI_OBTAINING_DHCP,
    WIFI_CONNECTED,
    WIFI_VERIFYING_INTERNET,
    WIFI_DISCONNECTED,
    WIFI_RECONNECTING,
    WIFI_ERROR
};

class WifiNetwork {
public:
    WifiNetwork();
    
    // Initialization & configuration
    void loadConfigFromStorage();
    void setCredentials(const std::string& ssid, const std::string& password);
    
    // Connection management
    void connect();
    void disconnect();
    void reconnect();
    
    // Status checking
    bool isConnected();
    bool hasInternetAccess();
    std::string getIPAddress();
    std::string getSSID();
    WiFiState getState();
    
    // Time synchronization (NTP)
    void syncTimeFromNTP();
    time_t getLastNTPSync();
    
    // Monitor (called periodically, e.g., every 1-5 seconds)
    void loop();
    
private:
    WiFiConfig config;
    WiFiState current_state;
    WiFiState previous_state;
    
    // Reconnection tracking
    int reconnect_attempts;
    static const int MAX_RECONNECT_ATTEMPTS = 3;
    static const int RECONNECT_INTERVAL_SEC = 300; // 5 minutes
    time_t last_reconnect_attempt;
    
    // NTP sync tracking
    time_t last_ntp_sync;
    static const int NTP_SYNC_INTERVAL_SEC = 86400; // 24 hours
    
    // Thread safety
    mutable std::mutex state_mutex;
    
    // Internal state machine
    void handleStateTransition();
    void authenticate();
    void associate();
    void obtainDHCP();
    void verifyInternet();
    void handleDisconnect();
    void resetReconnectCounter();
    
    // Simulation helpers
    void simulateWiFiConnection();
    void simulateInternetCheck();
};

#endif // WIFI_NETWORK_H
