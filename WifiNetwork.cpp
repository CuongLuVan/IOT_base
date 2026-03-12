#include "WifiNetwork.h"
#include <iostream>
#include <chrono>
#include <ctime>

WifiNetwork::WifiNetwork()
    : config(), current_state(WIFI_INIT), previous_state(WIFI_INIT),
      reconnect_attempts(0), last_reconnect_attempt(0), last_ntp_sync(0) {
    Memory::GetInstance()->initStorage(1024);
    hostpost_mode = false;
    smartconfig_active = false;
    ble_provision_active = false;
    ota_active = false;
    ota_pending = false;
    hostpost_thread_running = false;

#if SIMULATION_MODE
    std::cout << "[WiFi SIM] WifiNetwork initialized in SIMULATION mode" << std::endl;
#else
    web_server = nullptr;
#endif
    // Real hardware mode: no initialization logs (like Arduino)
}

bool WifiNetwork::hasSavedConfig() {
    Memory *mem = Memory::GetInstance();
    return !mem->readString(WIFI_SSID_ADDR).empty();
}

void WifiNetwork::saveConfigToStorage() {
    Memory *mem = Memory::GetInstance();
    mem->saveWiFiCredentials(WIFI_SSID_ADDR, WIFI_PASS_ADDR, config.ssid, config.password);
    // Also keep a JSON backup if available
    if (!pending_config_json.empty()) {
        mem->writeString(HOSTPOST_CONFIG_ADDR, pending_config_json);
    }

#if SIMULATION_MODE
    std::cout << "[WiFi SIM] Configuration saved to storage" << std::endl;
#endif
}

void WifiNetwork::handleJSONConfig(const std::string& jsonPayload) {
    pending_config_json = jsonPayload;

    // Minimal JSON parser supports {"ssid":"X","password":"Y","hostname":"Z"}
    auto getValue = [&](const std::string &key) -> std::string {
        std::string pattern = std::string("\"") + key + "\"";
        size_t pos = jsonPayload.find(pattern);
        if (pos == std::string::npos) return "";
        size_t colon = jsonPayload.find(':', pos);
        if (colon == std::string::npos) return "";
        size_t start = jsonPayload.find('"', colon);
        if (start == std::string::npos) return "";
        size_t end = jsonPayload.find('"', start + 1);
        if (end == std::string::npos) return "";
        return jsonPayload.substr(start + 1, end - start - 1);
    };

    std::string parsed_ssid = getValue("ssid");
    std::string parsed_password = getValue("password");
    std::string parsed_hostname = getValue("hostname");

    if (!parsed_ssid.empty()) {
        config.ssid = parsed_ssid;
    }
    if (!parsed_password.empty()) {
        config.password = parsed_password;
    }
    if (!parsed_hostname.empty()) {
        config.hostname = parsed_hostname;
    }

    saveConfigToStorage();
    hostpost_mode = false;
    current_state = WIFI_LOADING_CONFIG;
    connect();

#if SIMULATION_MODE
    std::cout << "[WiFi SIM] Received hostpost JSON config: " << jsonPayload << std::endl;
#endif
}

void WifiNetwork::processHostPostRequest(const std::string &jsonPayload) {
    handleJSONConfig(jsonPayload);
}

void WifiNetwork::startHostPostServer() {
    hostpost_mode = true;
#if SIMULATION_MODE
    if (hostpost_thread_running) return;
    hostpost_thread_running = true;
    hostpost_thread = std::thread([this]() {
        while (hostpost_thread_running) {
            std::this_thread::sleep_for(std::chrono::seconds(2));
            if (!hostpost_mode) continue;
            std::cout << "[WiFi SIM] HostPost server active. POST JSON to processHostPostRequest()." << std::endl;
        }
    });
#else
    if (web_server) return;
    web_server = new AsyncWebServer(80);
    web_server->on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
        request->send(200, "application/json", "{\"status\":\"ok\"}");
    });
    web_server->on("/config", HTTP_POST, [this](AsyncWebServerRequest *request) {
        if (request->hasParam("body", true)) {
            String body = request->getParam("body", true)->value();
            processHostPostRequest(std::string(body.c_str()));
            request->send(200, "application/json", "{\"success\":true}\n");
        } else {
            request->send(400, "application/json", "{\"error\":\"no body\"}");
        }
    });
    web_server->on("/ota", HTTP_POST, [this](AsyncWebServerRequest *request) {
        triggerOTAUpdate();
        request->send(200, "application/json", "{\"ota\":\"started\"}");
    });
    web_server->begin();
#endif
}

void WifiNetwork::stopHostPostServer() {
    hostpost_mode = false;
#if SIMULATION_MODE
    hostpost_thread_running = false;
    if (hostpost_thread.joinable()) {
        hostpost_thread.join();
    }
#else
    if (web_server) {
        web_server->end();
        delete web_server;
        web_server = nullptr;
    }
#endif
}

void WifiNetwork::triggerSmartConfig() {
    smartconfig_active = true;
    hostpost_mode = false;
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] SmartConfig trigger started" << std::endl;
#endif
}

void WifiNetwork::triggerBLEProvisioning() {
    ble_provision_active = true;
    hostpost_mode = false;
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] BLE provisioning trigger started" << std::endl;
#endif
}

void WifiNetwork::triggerOTAUpdate() {
    ota_active = true;
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] OTA update requested" << std::endl;
#else
    // ESP32 OTA flow handled in upload handler
#endif
}

void WifiNetwork::applyConfigAndReboot() {
    saveConfigToStorage();
    std::cout << "[WiFi] Applying config and rebooting" << std::endl;
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] Simulated reboot (no real restart on PC)" << std::endl;
#else
    ESP.restart();
#endif
}

bool WifiNetwork::isHostPostMode() {
    return hostpost_mode;
}

void WifiNetwork::loadConfigFromStorage() {
    std::lock_guard<std::mutex> lock(state_mutex);
    Memory *mem = Memory::GetInstance();

#if SIMULATION_MODE
    config.ssid = mem->readString(WIFI_SSID_ADDR);
    config.password = mem->readString(WIFI_PASS_ADDR);
    if (config.ssid.empty()) {
        config.ssid = "MyHomeWiFi";
        config.password = "MyPassword123";
        config.hostname = "esp32-device";
        config.dhcp_enabled = true;
        mem->saveWiFiCredentials(WIFI_SSID_ADDR, WIFI_PASS_ADDR, config.ssid, config.password);
        std::cout << "[WiFi SIM] Created default WiFi config in storage" << std::endl;
    } else {
        std::cout << "[WiFi SIM] Loaded WiFi config from storage" << std::endl;
    }
#else
    config.ssid = mem->readString(WIFI_SSID_ADDR);
    config.password = mem->readString(WIFI_PASS_ADDR);
    config.hostname = "esp32-device";
    config.dhcp_enabled = true;
#endif

#if SIMULATION_MODE
    std::cout << "[WiFi] Config loaded: SSID=" << config.ssid << std::endl;
#endif
    current_state = WIFI_LOADING_CONFIG;
}

void WifiNetwork::setCredentials(const std::string& ssid, const std::string& password) {
    std::lock_guard<std::mutex> lock(state_mutex);
    config.ssid = ssid;
    config.password = password;
#if SIMULATION_MODE
    std::cout << "[WiFi] Credentials set: SSID=" << ssid << std::endl;
#endif
}

void WifiNetwork::connect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    if (current_state == WIFI_CONNECTED) {
#if SIMULATION_MODE
        std::cout << "[WiFi] Already connected" << std::endl;
#endif
        return;
    }

#if !SIMULATION_MODE
    if (!config.ssid.empty()) {
        WiFi.begin(config.ssid.c_str(), config.password.c_str());
    }
#endif
    current_state = WIFI_AUTHENTICATING;
#if SIMULATION_MODE
    std::cout << "[WiFi] Starting connection sequence..." << std::endl;
#endif
}

void WifiNetwork::disconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    current_state = WIFI_DISCONNECTED;
#if SIMULATION_MODE
    std::cout << "[WiFi] Disconnected" << std::endl;
#endif
}

void WifiNetwork::reconnect() {
    std::lock_guard<std::mutex> lock(state_mutex);
    
    time_t now = std::time(nullptr);
    
    if (reconnect_attempts >= MAX_RECONNECT_ATTEMPTS) {
#if SIMULATION_MODE
        std::cout << "[WiFi] Max reconnect attempts (" << MAX_RECONNECT_ATTEMPTS 
                  << ") reached. Restarting WiFi..." << std::endl;
#endif
        reconnect_attempts = 0;
        current_state = WIFI_INIT;
        return;
    }
    
    if (now - last_reconnect_attempt < RECONNECT_INTERVAL_SEC) {
#if SIMULATION_MODE
        std::cout << "[WiFi] Waiting before next reconnect attempt..." << std::endl;
#endif
        return;
    }
    
    reconnect_attempts++;
    last_reconnect_attempt = now;
    current_state = WIFI_RECONNECTING;
    
#if SIMULATION_MODE
    std::cout << "[WiFi] Reconnect attempt " << reconnect_attempts << "/" 
              << MAX_RECONNECT_ATTEMPTS << std::endl;
#endif
}

bool WifiNetwork::isConnected() {
    std::lock_guard<std::mutex> lock(state_mutex);
    return current_state == WIFI_CONNECTED;
}

bool WifiNetwork::hasInternetAccess() {
    std::lock_guard<std::mutex> lock(state_mutex);
#if SIMULATION_MODE
    // In simulation, always return true if connected
    return current_state == WIFI_CONNECTED;
#else
    // Real hardware would verify internet connectivity here
    return current_state == WIFI_CONNECTED;
#endif
}

std::string WifiNetwork::getIPAddress() {
#if SIMULATION_MODE
    return "192.168.1.100";
#else
    // Real hardware returns actual IP
    return "0.0.0.0";
#endif
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
    
#if SIMULATION_MODE
    std::cout << "[WiFi NTP SIM] Syncing time from NTP server..." << std::endl;
    last_ntp_sync = std::time(nullptr);
    std::cout << "[WiFi NTP SIM] Time synced: " << std::ctime(&last_ntp_sync);
#else
    // Real hardware: sync NTP (no logs)
    last_ntp_sync = std::time(nullptr);
#endif
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

    if (hostpost_mode) {
        // In hostpost mode server is already running; just keep loop moving
#if SIMULATION_MODE
        std::cout << "[WiFi SIM] HostPost mode active" << std::endl;
#endif
    }

#if SIMULATION_MODE
    // Simulate connection transitions for demo
    static int sim_counter = 0;
    sim_counter++;
    if (smartconfig_active && sim_counter % 20 == 0) {
        config.ssid = "AutoSmartSSID";
        config.password = "AutoSmartPass";
        smartconfig_active = false;
        std::cout << "[WiFi SIM] SmartConfig complete, SSID=" << config.ssid << std::endl;
        saveConfigToStorage();
        connect();
    }

    if (ble_provision_active && sim_counter % 30 == 0) {
        config.ssid = "BLENet";
        config.password = "BLEPass";
        ble_provision_active = false;
        std::cout << "[WiFi SIM] BLE Provisioning complete, SSID=" << config.ssid << std::endl;
        saveConfigToStorage();
        connect();
    }

    if (ota_active && sim_counter % 50 == 0) {
        ota_pending = true;
        ota_active = false;
        std::cout << "[WiFi SIM] OTA firmware simulated applied" << std::endl;
    }

    // Simulate connection transitions based on state
    if (sim_counter > 50 && current_state == WIFI_AUTHENTICATING) {
        current_state = WIFI_ASSOCIATING;
    } else if (sim_counter > 100 && current_state == WIFI_ASSOCIATING) {
        current_state = WIFI_OBTAINING_DHCP;
    } else if (sim_counter > 150 && current_state == WIFI_OBTAINING_DHCP) {
        current_state = WIFI_CONNECTED;
        resetReconnectCounter();
        std::cout << "[WiFi SIM] Connected! IP=" << getIPAddress() << std::endl;
    }

    if (ota_pending) {
        ota_pending = false;
        std::cout << "[WiFi SIM] OTA done, simulating reboot" << std::endl;
        applyConfigAndReboot();
    }
#endif

    // Real-time connection monitoring and fallback
    simulateWiFiConnection();
    simulateInternetCheck();
}

void WifiNetwork::handleStateTransition() {
    if (current_state == previous_state) return;
    
#if SIMULATION_MODE
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
#else
    // Real hardware: execute state handlers without logging
    switch (current_state) {
        case WIFI_AUTHENTICATING:
            authenticate();
            break;
        case WIFI_ASSOCIATING:
            associate();
            break;
        case WIFI_OBTAINING_DHCP:
            obtainDHCP();
            break;
        case WIFI_CONNECTED:
            verifyInternet();
            break;
        case WIFI_DISCONNECTED:
            handleDisconnect();
            break;
        default:
            break;
    }
#endif
    
    previous_state = current_state;
}

void WifiNetwork::authenticate() {
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] Authentication: sending credentials to AP" << std::endl;
#else
    // Real hardware: WiFi.begin(ssid, password);
#endif
}

void WifiNetwork::associate() {
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] Association: joining network (4-way handshake)" << std::endl;
#else
    // Real hardware: wait for association
#endif
}

void WifiNetwork::obtainDHCP() {
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] DHCP: requesting dynamic IP from DHCP server" << std::endl;
    std::cout << "[WiFi SIM] DHCP: assigned IP=" << getIPAddress() << std::endl;
#else
    // Real hardware: wait for DHCP
#endif
}

void WifiNetwork::verifyInternet() {
#if SIMULATION_MODE
    std::cout << "[WiFi SIM] Verifying internet connectivity (ping check)" << std::endl;
#else
    // Real hardware: check internet connectivity
#endif
}

void WifiNetwork::handleDisconnect() {
#if SIMULATION_MODE
    std::cout << "[WiFi] WiFi disconnected. Starting reconnection..." << std::endl;
#endif
    reconnect_attempts = 0;
    reconnect();
}

void WifiNetwork::resetReconnectCounter() {
    reconnect_attempts = 0;
    last_reconnect_attempt = 0;
}

void WifiNetwork::simulateWiFiConnection() {
#if !SIMULATION_MODE
    return;
#endif
    
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
    #if !SIMULATION_MODE
        return;
    #endif
    
    
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
