#include "WifiNetwork.h"
#include <iostream>
#include <chrono>
#include <ctime>

WifiNetwork::WifiNetwork(VirtualGPIO& gpio, bool simulation_mode)
    : gpio(gpio), simulation_mode(simulation_mode),
      current_state(WIFI_INIT), previous_state(WIFI_INIT),
      reconnect_attempts(0), last_reconnect_attempt(0), last_ntp_sync(0) {
    
    if (simulation_mode) {
        std::cout << "[WiFi SIM] WifiNetwork initialized in SIMULATION mode" << std::endl;
    } else {
        std::cout << "[WiFi HW] WifiNetwork initialized in REAL HARDWARE mode (ESP32/ESP8266)" << std::endl;
    }
}

void WifiNetwork::loadConfigFromStorage() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (simulation_mode) {
        // Simulation: use hardcoded config
        config.ssid = "MyHomeWiFi";
        config.password = "MyPassword123";
        config.hostname = "esp32-device";
        config.dhcp_enabled = true;
        std::cout << "[WiFi SIM] Loaded WiFi config from storage (simulation)" << std::endl;
    } else {
        // Real hardware: load from EEPROM/NVS
        std::cout << "[WiFi HW] Loading WiFi config from ESP32/ESP8266 storage..." << std::endl;
        // config.ssid = readFromEEPROM(SSID_ADDR);
        // config.password = readFromEEPROM(PASSWORD_ADDR);
    }
    
    current_state = WIFI_LOADING_CONFIG;
    std::cout << "[WiFi] Config loaded: SSID=" << config.ssid << std::endl;
}

void WifiNetwork::setCredentials(const std::string& ssid, const std::string& password) {
    std::lock_guard<std::mutex> lock(state_mutex);
    config.ssid = ssid;
    config.password = password;
    std::cout << "[WiFi] Credentials set: SSID=" << ssid << std::endl;
}

void WifiNetwork::connect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (current_state == WIFI_CONNECTED) {
        std::cout << "[WiFi] Already connected" << std::endl;
        return;
    }
    
    current_state = WIFI_AUTHENTICATING;
    std::cout << "[WiFi] Starting connection sequence..." << std::endl;
}

void WifiNetwork::disconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    current_state = WIFI_DISCONNECTED;
    std::cout << "[WiFi] Disconnected" << std::endl;
}

void WifiNetwork::reconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    time_t now = std::time(nullptr);
    
    if (reconnect_attempts >= MAX_RECONNECT_ATTEMPTS) {
        std::cout << "[WiFi] Max reconnect attempts (" << MAX_RECONNECT_ATTEMPTS 
                  << ") reached. Restarting WiFi..." << std::endl;
        reconnect_attempts = 0;
        current_state = WIFI_INIT;
        return;
    }
    
    if (now - last_reconnect_attempt < RECONNECT_INTERVAL_SEC) {
        std::cout << "[WiFi] Waiting before next reconnect attempt..." << std::endl;
        return;
    }
    
    reconnect_attempts++;
    last_reconnect_attempt = now;
    current_state = WIFI_RECONNECTING;
    
    std::cout << "[WiFi] Reconnect attempt " << reconnect_attempts << "/" 
              << MAX_RECONNECT_ATTEMPTS << std::endl;
}

bool WifiNetwork::isConnected() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return current_state == WIFI_CONNECTED;
}

bool WifiNetwork::hasInternetAccess() {
    std::lock_guard<std::mutex> lock(state_mutex);
    // In simulation, always return true; otherwise check by pinging
    if (simulation_mode) {
        return current_state == WIFI_CONNECTED;
    }
    // Real hardware would verify internet connectivity here
    return current_state == WIFI_CONNECTED;
}

std::string WifiNetwork::getIPAddress() {
    if (simulation_mode) {
        return "192.168.1.100";
    }
    // Real hardware returns actual IP
    return "0.0.0.0";
}

std::string WifiNetwork::getSSID() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return config.ssid;
}

WiFiState WifiNetwork::getState() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return current_state;
}

void WifiNetwork::syncTimeFromNTP() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (simulation_mode) {
        std::cout << "[WiFi NTP SIM] Syncing time from NTP server..." << std::endl;
        last_ntp_sync = std::time(nullptr);
        std::cout << "[WiFi NTP SIM] Time synced: " << std::ctime(&last_ntp_sync);
    } else {
        std::cout << "[WiFi NTP HW] Syncing time from NTP (real hardware)" << std::endl;
        // Real hardware would call configTime() or similar
        last_ntp_sync = std::time(nullptr);
    }
}

time_t WifiNetwork::getLastNTPSync() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return last_ntp_sync;
}

void WifiNetwork::loop() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    // State machine
    handleStateTransition();
    
    // Check if NTP sync is needed (every 24 hours)
    time_t now = std::time(nullptr);
    if (current_state == WIFI_CONNECTED && 
        (last_ntp_sync == 0 || now - last_ntp_sync >= NTP_SYNC_INTERVAL_SEC)) {
        // Unlock before calling syncTimeFromNTP to avoid recursive locking
        state_mutex.unlock();
        syncTimeFromNTP();
        state_mutex.lock();
    }
    
    if (simulation_mode) {
        // Simulate connection transitions for demo
        static int sim_counter = 0;
        sim_counter++;
        if (sim_counter > 50 && current_state == WIFI_AUTHENTICATING) {
            current_state = WIFI_ASSOCIATING;
        } else if (sim_counter > 100 && current_state == WIFI_ASSOCIATING) {
            current_state = WIFI_OBTAINING_DHCP;
        } else if (sim_counter > 150 && current_state == WIFI_OBTAINING_DHCP) {
            current_state = WIFI_CONNECTED;
            resetReconnectCounter();
            std::cout << "[WiFi SIM] Connected! IP=" << getIPAddress() << std::endl;
        }
    }
}

void WifiNetwork::handleStateTransition() {
    if (current_state == previous_state) return;
    
    switch (current_state) {
        case WIFI_LOADING_CONFIG:
            std::cout << "[WiFi State] → LOADING_CONFIG" << std::endl;
            break;
        case WIFI_AUTHENTICATING:
            std::cout << "[WiFi State] → AUTHENTICATING (SSID: " << config.ssid << ")" << std::endl;
            authenticate();
            break;
        case WIFI_ASSOCIATING:
            std::cout << "[WiFi State] → ASSOCIATING" << std::endl;
            associate();
            break;
        case WIFI_OBTAINING_DHCP:
            std::cout << "[WiFi State] → OBTAINING_DHCP" << std::endl;
            obtainDHCP();
            break;
        case WIFI_CONNECTED:
            std::cout << "[WiFi State] → CONNECTED" << std::endl;
            verifyInternet();
            break;
        case WIFI_DISCONNECTED:
            std::cout << "[WiFi State] → DISCONNECTED" << std::endl;
            handleDisconnect();
            break;
        case WIFI_RECONNECTING:
            std::cout << "[WiFi State] → RECONNECTING" << std::endl;
            break;
        case WIFI_ERROR:
            std::cout << "[WiFi State] → ERROR" << std::endl;
            break;
        default:
            break;
    }
    
    previous_state = current_state;
}

void WifiNetwork::authenticate() {
    if (simulation_mode) {
        std::cout << "[WiFi SIM] Authentication: sending credentials to AP" << std::endl;
    } else {
        std::cout << "[WiFi HW] Authentication with " << config.ssid << std::endl;
        // Real hardware: WiFi.begin(ssid, password);
    }
}

void WifiNetwork::associate() {
    if (simulation_mode) {
        std::cout << "[WiFi SIM] Association: joining network (4-way handshake)" << std::endl;
    } else {
        std::cout << "[WiFi HW] Waiting for association..." << std::endl;
    }
}

void WifiNetwork::obtainDHCP() {
    if (simulation_mode) {
        std::cout << "[WiFi SIM] DHCP: requesting dynamic IP from DHCP server" << std::endl;
        std::cout << "[WiFi SIM] DHCP: assigned IP=" << getIPAddress() << std::endl;
    } else {
        std::cout << "[WiFi HW] Requesting DHCP lease..." << std::endl;
        // Real hardware waits for DHCP to complete
    }
}

void WifiNetwork::verifyInternet() {
    if (simulation_mode) {
        std::cout << "[WiFi SIM] Verifying internet connectivity (ping check)" << std::endl;
    } else {
        std::cout << "[WiFi HW] Checking internet connectivity..." << std::endl;
        // Real hardware: use ping or HTTP request to verify
    }
}

void WifiNetwork::handleDisconnect() {
    std::cout << "[WiFi] WiFi disconnected. Starting reconnection..." << std::endl;
    reconnect_attempts = 0;
    reconnect();
}

void WifiNetwork::resetReconnectCounter() {
    reconnect_attempts = 0;
    last_reconnect_attempt = 0;
}

void WifiNetwork::simulateWiFiConnection() {
    if (!simulation_mode) return;
    
    // Simulate random disconnects for testing
    static int sim_disconnect_counter = 0;
    sim_disconnect_counter++;
    
    if (sim_disconnect_counter > 500 && current_state == WIFI_CONNECTED) {
        std::cout << "[WiFi SIM] Simulating WiFi disconnection..." << std::endl;
        handleDisconnect();
        sim_disconnect_counter = 0;
    }
}

void WifiNetwork::simulateInternetCheck() {
    if (!simulation_mode) return;
    
    if (current_state == WIFI_CONNECTED) {
        // Periodically verify internet
        static int check_counter = 0;
        check_counter++;
        if (check_counter > 200) {
            std::cout << "[WiFi SIM] Internet connectivity: OK" << std::endl;
            check_counter = 0;
        }
    }
}
