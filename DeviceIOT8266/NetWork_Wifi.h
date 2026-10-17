#pragma once

#include <Arduino.h>
#include "PlatformCompat.h"

#define HOST_POST_INFO "setup_now"
#define WIFI_MODE 1
#define VERSION_OTA 2

#define WIFI_START_CONNECT 1
#define WIFI_BLE_PROVISION 2
#define WIFI_SMART_CONFIG 3
#define WIFI_BLE_SMART_CONFIG 4
#define WIFI_START_OTA 5

class NetWork_Wifi {
public:
    static void handleRoot();
    static void handleSetUp();
    static void handleSetUpWifi();
    static void handleControl();
    static void handleUpdate();
    static void handleLoraGet();
    static void handleLoraPost();

    void setHeader();
    void startWebServer();
    void startWebserverRoot();
    void setupHostPost();
    void loopHostPost();
    void startWebserverAP();
    void setupAP();
    void loopAP();
    void setupOTA();
    void loopOTA();
    void connectWifi();
    void maintainConnection();
    void getWifiStatusIP();
    void printWifiStatusIP();
    unsigned char checkWifi();
    uint32_t getNetworkTimestamp();
    unsigned char pingNetWork();
    void disconnetWifi();
    void handerHospost();
    void handerClient();
    bool checkModeHostPost();

    // ESP8266 has no BLE provisioning. These modes safely use the AP portal.
    void startSmartConfig();
    void setupSmartConfig();
    void loopSmartConfig();
    void setup();
    void startProvisioning();
    void setupProvisioning();
    void loopProvisioning();
};