
  #include <Arduino.h>
  #include <WiFiProv.h> // Nếu bạn dùng provisioning
#define D_PROGRAMNAME          "Sonoff-Tasmota"
#define D_AUTHOR               "Theo Arends"
#define HOST_POST_INFO                "setup_now" 
#define  WIFI_MODE    1
#define  VERSION_OTA    2



#define  WIFI_START_CONNECT    1
#define  WIFI_BLE_PROVISION    2
#define  WIFI_SMART_CONFIG    3
#define  WIFI_BLE_SMART_CONFIG    4
#define  WIFI_START_OTA    5

#define  MAX_TIME_WAIT_CONFIG 300000

enum SmartConfigStatus {
    DISABLE_SMARTCONFIG = 0,
    START_SMARTCONFIG = 1,
    WAIT_WIFI_SMARTCONFIG = 2,
    WIFI_CONNECT_SMARTCONFIG=3,
    FINISH_SMARTCONFIG=4
};


enum SmartProvisioningBle {
    DISABLE_BLE = 0,
    START_BLE = 1,
    FINISH_BLE=4
};



class NetWork_Wifi {
    public:


        String linkOTA_ESP_32;
        int Version_OTA; 

        static void    handleRoot(void);
        static void   handleSetUp(void);
        static void   handleControl(void);
        static void   handleUpdate(void);


        void setHeader(void);
        void startWebServer(void);
        void startWebserverRoot(void);
        void setupHostPost(void);
        void loopHostPost(void);
        void setupOTA(void);
        void loopOTA(void);
        void connectWifi(void);
        unsigned char checkWifi();
        unsigned char pingNetWork();
        void getRTCInfo();
        void disconnetWifi();
        void handerHospost();
        void handerClient();
        bool checkModeHostPost(void);

        void startSmartConfig(void);
        void setupSmartConfig(void);
        void loopSmartConfig(void);
        void setup();
        static void sysProvEvent(arduino_event_t *sys_event);
        void startProvisioning(void);
        void setupProvisioning(void);
        void loopProvisioning(void);

        
        
};
