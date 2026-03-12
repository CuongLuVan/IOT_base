//#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiServer.h>
#include <WiFiUdp.h>
//#include <WebServer.h>
#include <DNSServer.h>                    // WifiManager
#include <StreamString.h>                   // Webserver, Updater
//#include <WebServer.h>
  #include <DNSServer.h>                    // WifiManager
// #include <ESPmDNS.h>
  
#define D_PROGRAMNAME          "Sonoff-Tasmota"
#define D_AUTHOR               "Theo Arends"



class TaskNetWork {
    public:
       
        void setup(void);
        static void taskRun(void * parameter);
        static void loopNetWork(void);
};
