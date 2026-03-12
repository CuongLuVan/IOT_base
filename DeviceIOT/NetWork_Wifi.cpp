#include "NetWork_Wifi.h"
#include "NetWork_config.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiServer.h>
#include <WiFiUdp.h>
#include <WebServer.h>
#include <DNSServer.h>                    // WifiManager
#include <StreamString.h>                   // webServer, Updater
#include <ESPmDNS.h>
#include "Memory.h" 
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Update.h>

#include <WiFiProv.h>

uint32_t      ip_address[4] ={192,168,0,1};             // 544
WebServer *webServer;
StaticJsonDocument<512> jsonBuffer;

static  String ssid;                        //string variable to store ssid
static  String password;                         //string variable to store password
static  SmartConfigStatus enableSmartConfig = SmartConfigStatus::DISABLE_SMARTCONFIG;
static  SmartProvisioningBle enableProvisioningBle = SmartProvisioningBle::DISABLE_BLE;

void NetWork_Wifi::setHeader()
{
  webServer->sendHeader(F("Cache-Control"), F("no-cache, no-store, must-revalidate"));
  webServer->sendHeader(F("Pragma"), F("no-cache"));
  webServer->sendHeader(F("Expires"), F("-1"));
  webServer->sendHeader(F("Access-Control-Allow-Origin"), F("*"));

}


void NetWork_Wifi::handleRoot(){
    String data = webServer->arg("data");
    deserializeJson(jsonBuffer, data);
    webServer->send(200, "application/json", "{'data':true}");
}

void NetWork_Wifi::handleSetUp(){
    String data = webServer->arg("data");
    deserializeJson(jsonBuffer, data);
    Memory::GetInstance()->writeString(WIFI_SETUP_JSON,data);
    //WIFI_BLE_PROVISION  WIFI_SMART_CONFIG
    Memory::GetInstance()->writeChar(WIFI_MODE,WIFI_BLE_SMART_CONFIG);
    webServer->send(200, "application/json", "{'data':true}");
    delay(2000);
    ESP.restart();            // Restart ESP
}

void NetWork_Wifi::handleControl(){
    String data = webServer->arg("data");
    deserializeJson(jsonBuffer, data);
    webServer->send(200, "application/json", "{'data':true}");
}

void NetWork_Wifi::handleUpdate(){
    String data = webServer->arg("data");
    deserializeJson(jsonBuffer, data);
    webServer->send(200, "application/json", "{'data':true}");
}



void NetWork_Wifi::startWebServer()
{
    webServer = new class WebServer(80);
    webServer->on("/control", this->handleControl);
    webServer->on("/update", this->handleUpdate);
    webServer->begin(); // Web server start 
}

void NetWork_Wifi::startWebserverRoot()
{
    webServer = new class WebServer(80);
    webServer->on("/", this->handleRoot);
    webServer->on("/setup", this->handleSetUp);
    webServer->begin(); // Web server start
}


void NetWork_Wifi::setupHostPost(void){
    Serial.begin(115200);
    // Set WiFi to station mode and disconnect from an AP if it was previously connected
     WiFi.disconnect();

    WiFi.mode(WIFI_STA);      // Disable AP mode
    WiFi.enableSTA(true);
    if (!WiFi.getAutoReconnect()) {
        WiFi.setAutoReconnect(true);
    }
    WiFi.config(ip_address[0], ip_address[1], ip_address[2], ip_address[3]);  // Set static IP
    delay(100);
    WiFi.setHostname(HOST_POST_INFO);
    WiFi.softAP(HOST_POST_INFO,HOST_POST_INFO);
    WiFi.begin();
    Serial.println("Setup done"); 
}

void NetWork_Wifi::loopHostPost(void){

}

bool NetWork_Wifi::checkModeHostPost(void){
  return true;
}


bool isVersionNewer(const String& current, const String& server) {
  int curMajor, curMinor, curPatch;
  int serMajor, serMinor, serPatch;

  sscanf(current.c_str(), "%d.%d.%d", &curMajor, &curMinor, &curPatch);
  sscanf(server.c_str(), "%d.%d.%d", &serMajor, &serMinor, &serPatch);

  if (serMajor > curMajor) return true;
  if (serMajor == curMajor && serMinor > curMinor) return true;
  if (serMajor == curMajor && serMinor == curMinor && serPatch > curPatch) return true;

  return false;
}

void NetWork_Wifi::setupOTA(void){
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(linkOTA_ESP_32);
        int httpCode = http.GET();
        if (httpCode != 200) {
          Serial.printf("Version check failed: %d\n", httpCode);
          http.end();
          return;
        }
        String payload = http.getString();
        http.end();
        DeserializationError error = deserializeJson(jsonBuffer, payload);

        if (error) {
          Serial.println("JSON parse failed");
          return;
        }
        String serverVersion = jsonBuffer["version"];
        String binUrl = jsonBuffer["bin"];
        String currentFirmwareVersion = Memory::GetInstance()->readString(VERSION_OTA);;

        Serial.printf("Current: %s, Server: %s\n", currentFirmwareVersion.c_str(), serverVersion.c_str());

        if (!isVersionNewer(currentFirmwareVersion, serverVersion)) {
          Serial.println("Version is up to date or newer than server. No update.");
          return;
        }

        http.begin(binUrl);

        Serial.println("Downloading firmware...");
        unsigned long startTime = millis(); // Record start time
        httpCode = http.GET();
        if (httpCode == HTTP_CODE_OK) {
          Serial.println("HTTP_CODE_OK");

          WiFiClient* stream = http.getStreamPtr();
          Serial.println("http.getStreamPtr");

          if (Update.begin()) {
            Serial.println("Uploading firmware...");
            size_t written = 0;
            unsigned long uploadStartTime = millis(); // Record upload start time
            do {
              written = Update.writeStream(*stream);
              if (written > 0) {
                Serial.print("Bytes written: ");
                Serial.println(written);
              }
            } while (written > 0 && millis() - uploadStartTime < 120000); // Continue writing until timeout or all data is written
            
            if (written == http.getSize()) {
              Serial.println("Firmware upload successful");
            } else {
              Serial.println("Firmware upload failed");
              return;
            }

            if (Update.end()) {
              Serial.println("OTA update successful");
              if (Update.isFinished()) {
                Serial.println("Update successful, saving version...");
                Memory::GetInstance()->writeString(WIFI_SETUP_JSON,serverVersion);
                Memory::GetInstance()->writeChar(WIFI_MODE,WIFI_START_CONNECT);
                delay(1000);
                ESP.restart();
              } else {
                Serial.println("Update failed: incomplete");
              }
            } else {
              Serial.println("OTA update failed");
            }
          } else {
            Serial.println("Could not begin firmware update");
          }
        } else {
          Serial.println("Failed to download firmware");
        }

        http.end();
      } else {
        Serial.println("Failed to connect to WiFi");
      }
}

void NetWork_Wifi::loopOTA(void){

}

void NetWork_Wifi::connectWifi(void){

  ssid = "";
  password = "";
  Memory::GetInstance()->getWiFiCredentials(WIFI_SSSID,WIFI_PASS,ssid,password);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  


  /*  Serial.begin(115200);
    // Set WiFi to station mode and disconnect from an AP if it was previously connected
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    Serial.println("Setup done");*/
}

unsigned char NetWork_Wifi::checkWifi(){
    return WiFi.status();
}
unsigned char NetWork_Wifi::pingNetWork(){
    return 0;
}
void NetWork_Wifi::getRTCInfo(){

}
void NetWork_Wifi::disconnetWifi(){
    
}

void NetWork_Wifi::handerHospost(){
    
}

void NetWork_Wifi::handerClient(){
    
}

void NetWork_Wifi::startSmartConfig(){
  // clear esp
  ESP.restart();            // Restart ESP
}

void NetWork_Wifi::setupSmartConfig(){
     WiFi.mode(WIFI_AP_STA);
    /* start SmartConfig */
    WiFi.beginSmartConfig();
    enableSmartConfig=  SmartConfigStatus::START_SMARTCONFIG;
}

uint64_t timeSmartConfig=0;
void NetWork_Wifi::loopSmartConfig(){
    if(SmartConfigStatus::DISABLE_SMARTCONFIG==enableSmartConfig){
      if(SmartConfigStatus::START_SMARTCONFIG==enableSmartConfig){
        if(WiFi.smartConfigDone()){
          enableSmartConfig=  SmartConfigStatus::WAIT_WIFI_SMARTCONFIG;
          timeSmartConfig = Memory::GetInstance()->getTimeStamp();
        }
      } else  if(SmartConfigStatus::WAIT_WIFI_SMARTCONFIG==enableSmartConfig){
        if(WiFi.status() == WL_CONNECTED){
            enableSmartConfig=  SmartConfigStatus::WIFI_CONNECT_SMARTCONFIG;
            if((Memory::GetInstance()->getTimeStamp()-timeSmartConfig)>MAX_TIME_WAIT_CONFIG){
              ESP.restart();            // Restart ESP
            }
        }
      } else  if(SmartConfigStatus::WIFI_CONNECT_SMARTCONFIG==enableSmartConfig){
          ssid = WiFi.SSID();
          password = WiFi.psk();
          // save to reset wifi
          enableSmartConfig=  SmartConfigStatus::DISABLE_SMARTCONFIG;
          Memory::GetInstance()->writeString(WIFI_SSSID,ssid);
          Memory::GetInstance()->writeString(WIFI_PASS,password);
          //WIFI_BLE_PROVISION  WIFI_SMART_CONFIG
          Memory::GetInstance()->writeChar(WIFI_MODE,WIFI_START_CONNECT);
          ESP.restart();            // Restart ESP
      }
    }
}


void NetWork_Wifi::setup(){
  ssid = "";
  password = "";


}

const char * pop = "abcd1234"; // Proof of possession - otherwise called a PIN - string provided by the device, entered by the user in the phone app
const char * service_name = "PROV_123"; // Name of your device (the Espressif apps expects by default device name starting with "Prov_")
const char * service_key = NULL; // Password used for SofAP method (NULL = no password needed)
bool reset_provisioned = true; // When true the library will automatically delete previously provisioned data.
#define WIFI_PROV_STA_AUTH_ERROR 0
// WARNING: SysProvEvent is called from a separate FreeRTOS task (thread)!
void  NetWork_Wifi::sysProvEvent(arduino_event_t *sys_event) {
  switch (sys_event->event_id) {
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.print("\nConnected IP address : ");
      Serial.println(IPAddress(sys_event->event_info.got_ip.ip_info.ip.addr));
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: Serial.println("\nDisconnected. Connecting to the AP again... "); break;
    case ARDUINO_EVENT_PROV_START:            Serial.println("\nProvisioning started\nGive Credentials of your access point using smartphone app"); break;
    case ARDUINO_EVENT_PROV_CRED_RECV:
    {
      Serial.println("\nReceived Wi-Fi credentials");
      Serial.print("\tSSID : ");
      ssid = (const char*)  sys_event->event_info.prov_cred_recv.ssid;
      password = (const char*)  sys_event->event_info.prov_cred_recv.password;
      Serial.println((const char *)sys_event->event_info.prov_cred_recv.ssid);
      Serial.print("\tPassword : ");
      Serial.println((char const *)sys_event->event_info.prov_cred_recv.password);
      Memory::GetInstance()->writeString(WIFI_SSSID,ssid);
      Memory::GetInstance()->writeString(WIFI_PASS,password);
      //WIFI_BLE_PROVISION  WIFI_SMART_CONFIG
      Memory::GetInstance()->writeChar(WIFI_MODE,WIFI_START_CONNECT);
      ESP.restart();            // Restart ESP
      // save eeprom
      break;
    }
    case ARDUINO_EVENT_PROV_CRED_FAIL:
    {
      Serial.println("\nProvisioning failed!\nPlease reset to factory and retry provisioning\n");
      if (sys_event->event_info.prov_fail_reason == WIFI_PROV_STA_AUTH_ERROR) {
        Serial.println("\nWi-Fi AP password incorrect");
      } else {
        Serial.println("\nWi-Fi AP not found....Add API \" nvs_flash_erase() \" before beginProvision()");
      }
      break;
    }
    case ARDUINO_EVENT_PROV_CRED_SUCCESS: Serial.println("\nProvisioning Successful"); break;
    case ARDUINO_EVENT_PROV_END:       {
       Serial.println("\nProvisioning Ends");
       enableProvisioningBle =  SmartProvisioningBle::DISABLE_BLE;
    }   break;
    default:                              break;
  }
}

void NetWork_Wifi::startProvisioning(){
  // clear esp
  enableProvisioningBle =  SmartProvisioningBle::START_BLE;
  //ESP.restart();            // Restart ESP
}

void NetWork_Wifi::setupProvisioning(){
  // clear esp
  WiFi.onEvent(sysProvEvent);

  Serial.println("Begin Provisioning using BLE");
  // Sample uuid that user can pass during provisioning using BLE
  uint8_t uuid[16] = {0xb4, 0xdf, 0x5a, 0x1c, 0x3f, 0x6b, 0xf4, 0xbf,
                      0xea, 0x4a, 0x82, 0x03, 0x04, 0x90, 0x1a, 0x02 };
  /*WiFiProv.beginProvision(
    WIFI_PROV_SCHEME_BLE,           // Scheme BLE
    WiFiProvScheme_BLE,   // Handler BLE
    WIFI_PROV_SECURITY_1,           // Security mode
    pop,                            // POP (proof of possession)
    service_name,                   // Tên BLE hiển thị
    service_key,                    // Mã ghép BLE (tuỳ chọn)
    NULL,                           // UUID (tuỳ chọn)
    reset_provisioned               // Xóa cấu hình cũ?
  );
*/
  WiFiProv.printQR(service_name, pop, "ble");
  enableProvisioningBle =  SmartProvisioningBle::START_BLE;
  timeSmartConfig = Memory::GetInstance()->getTimeStamp();

}

void NetWork_Wifi::loopProvisioning(){
  // clear esp
  if((Memory::GetInstance()->getTimeStamp()-timeSmartConfig)>MAX_TIME_WAIT_CONFIG){
    ESP.restart();            // Restart ESP
  }
  
}


