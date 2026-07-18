#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include "Common.h"
#include "define_All.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>

#if MQTT_NO_TLS
#include <WiFiClientSecure.h>
using MqttWiFiClient = WiFiClientSecure;
#else
#include <WiFiClient.h>
using MqttWiFiClient = WiFiClient;
#endif

#include <StreamString.h>                   // Webserver, Updater                  // WifiManager
#include "Memory.h"
#include "MemoryData.h"
#include "DebugInfo.h"


MqttWiFiClient EspClient;
PubSubClient MqttClient(EspClient);         // MQTT Client

extern InfoSensor sensorValue;
extern InfoDeviceControl statusDevice;
StaticJsonDocument<512> jsonBufferMqtt;

struct SYSCFG {
  char          mqtt_fingerprint[60];      // 1AD To be freed by binary fingerprint
  char          mqtt_host[128];             // 1E9
  uint16_t      mqtt_port;                 // 20A
  char          mqtt_client[33];           // 20C
  char          mqtt_user[33];             // 22D
  char          mqtt_pwd[33];              // 24E
  char          public_topic[33];            // 26F
  char          subcribe_topic[33];          // 290
  char          mqtt_grptopic[33];         // 2B1
  char          web_password[33];          // 4A9
} Settings;
extern QueueHandle_t deviceCommandQueue;

void sendMessageInfoPublish(String data){
  char *p = new char[data.length() + 1];
  strcpy(p, data.c_str());
  if (MqttClient.publish(Settings.public_topic, p, 1)) {
      
  }
   
}
DeviceCommand cmd;
void MqttDataCallback(char* topic, byte* data, unsigned int data_len)
{
    String payload = String((char*)data).substring(0, data_len);
    DEVICE_LOG_INFO("MqttDataCallback................................:" + payload);
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
         DEVICE_LOG_INFO("[MQTT] JSON parse error:" + String(err.f_str()));
        return;
    }

    if (doc.containsKey("control") || doc.containsKey("ver") || doc.containsKey("movex") || doc.containsKey("movey") || doc.containsKey("around")) {
        uint8_t controlMode = doc["control"] | 0;
        int16_t throttle = doc["ver"] | 0;
        int16_t moveX = doc["movex"] | 0;
        int16_t moveY = doc["movey"] | 0;
        int16_t around = doc["around"] | 0;

        cmd.commandType = COMMAND_TYPE_CONTROL;
        cmd.commandValue = controlMode;
        cmd.controlMode = controlMode;
        cmd.throttle = throttle;
        cmd.moveX = moveX;
        cmd.moveY = moveY;
        cmd.around = around;
        cmd.reserved = 1;

        #if SUPPORT_RTOS
            if (deviceCommandQueue != NULL) {
                if (xQueueSend(deviceCommandQueue, &cmd, pdMS_TO_TICKS(50)) != pdTRUE) {
                    DEVICE_LOG_INFO("[MQTT] Failed to queue flight command");
                }
            }
        #else
            MemoryData::GetInstance().deviceCommand_ = &cmd;
        #endif
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
        return;
    }

    cmd.commandType = doc["com"] | 0;
    cmd.commandValue = doc["value"] | 0;
   
    if(cmd.commandType == 0x02) {
        cmd.reserved = 0;
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
    } else if(cmd.commandType == 0x01)  {
        cmd.reserved = 1;
        #if SUPPORT_RTOS
            if (deviceCommandQueue == NULL) return;
            if (xQueueSend(deviceCommandQueue, &cmd, pdMS_TO_TICKS(50)) != pdTRUE) {
                  DEVICE_LOG_INFO("[MQTT] Failed to queue device command");
            }
        #else
            MemoryData::GetInstance().deviceCommand_ = &cmd;
        #endif
        sendMessageInfoPublish(getInfoDevice(sensorValue,statusDevice));
    }

}


bool parseJsonToSettings(String json) {
  DEVICE_LOG_INFO("start NetWork_Mqtt::parseJsonToSettings");
  DEVICE_LOG_INFO(json);
  DeserializationError error = deserializeJson(jsonBufferMqtt, json);
  if (error) {
     DEVICE_LOG_INFO(F("deserializeJson() failed: "));
      DEVICE_LOG_INFO(error.f_str());
    return false;
  }

  strlcpy(Settings.mqtt_fingerprint, jsonBufferMqtt["mqtt_fingerprint"] | "", sizeof(Settings.mqtt_fingerprint));
  strlcpy(Settings.mqtt_host,       jsonBufferMqtt["mqtt_host"] | "",       sizeof(Settings.mqtt_host));
  Settings.mqtt_port =              jsonBufferMqtt["mqtt_port"] | 0;
  strlcpy(Settings.mqtt_client,     jsonBufferMqtt["mqtt_client"] | "",     sizeof(Settings.mqtt_client));
  strlcpy(Settings.mqtt_user,       jsonBufferMqtt["mqtt_user"] | "",       sizeof(Settings.mqtt_user));
  strlcpy(Settings.mqtt_pwd,        jsonBufferMqtt["mqtt_pwd"] | "",        sizeof(Settings.mqtt_pwd));
  strlcpy(Settings.public_topic,    jsonBufferMqtt["public_topic"] | "",    sizeof(Settings.public_topic));
  strlcpy(Settings.subcribe_topic,  jsonBufferMqtt["subcribe_topic"] | "",  sizeof(Settings.subcribe_topic));
  strlcpy(Settings.mqtt_grptopic,   jsonBufferMqtt["mqtt_grptopic"] | "",   sizeof(Settings.mqtt_grptopic));
  strlcpy(Settings.web_password,    jsonBufferMqtt["web_password"] | "",    sizeof(Settings.web_password));
  DEVICE_LOG_INFO("end NetWork_Mqtt::parseJsonToSettings");
  return true;
}

void NetWork_Mqtt::setupInfoMQTT()
{

    String payload = Memory::GetInstance()->readString(WIFI_SETUP_JSON);
    if(!parseJsonToSettings(payload)){
      DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT skipped due parseJsonToSettings failure");
      return;
    }
    
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT  mqtt_host ==>"+String(Settings.mqtt_host));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_port ==>"+String(Settings.mqtt_port));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_client ==>"+String(Settings.mqtt_client));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_user ==>"+String(Settings.mqtt_user));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT mqtt_pwd ==>"+String(Settings.mqtt_pwd));
    DEVICE_LOG_INFO("NetWork_Mqtt::setupInfoMQTT subcribe_topic ==>"+String(Settings.subcribe_topic));

#if MQTT_NO_TLS
    EspClient.setInsecure();
    if (strlen(Settings.mqtt_fingerprint) > 0) {
        EspClient.setCACert(Settings.mqtt_fingerprint);
    }
#endif
    MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);
    MqttClient.setCallback(MqttDataCallback);
    //if (MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd, Settings.subcribe_topic, 1, true, "")) {

    //}
    DEVICE_LOG_INFO("end NetWork_Mqtt::setupInfoMQTT");
}


void NetWork_Mqtt::getAllDataSetup(){
   DEVICE_LOG_INFO("start NetWork_Mqtt::getAllDataSetup");
   DEVICE_LOG_INFO("end NetWork_Mqtt::getAllDataSetup");
}



void NetWork_Mqtt::disconnetMqtt(){
   MqttClient.disconnect();
}

void NetWork_Mqtt::connectMqtt(){
  DEVICE_LOG_INFO("start NetWork_Mqtt::connectMqtt");
  MqttClient.setCallback(MqttDataCallback);
  MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);
  if (!MqttClient.connected())
  {
         DEVICE_LOG_INFO("Attempting MQTT connection...");
        if (MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd)) {
            DEVICE_LOG_INFO("connected");
            MqttClient.subscribe(Settings.subcribe_topic);
            this->sendMessageInfo("{\"test\":\"mqtt connect\"}");
        } else {
             DEVICE_LOG_INFO("failed, rc="+String(MqttClient.state()));
             DEVICE_LOG_INFO(" try again in 5 seconds");
        }
  }


  DEVICE_LOG_INFO("end NetWork_Mqtt::connectMqtt");
}


unsigned char  NetWork_Mqtt::checkStatusMqtt(){
  return (MqttClient.connected() ? 1 : 0);
}
void NetWork_Mqtt::sendMessageInfo(char * data){
  DEVICE_LOG_INFO("start NetWork_Mqtt::sendMessageInfo"+ String(data));
  if (MqttClient.publish(Settings.public_topic, data, 1)) {
      
  }
  DEVICE_LOG_INFO("end NetWork_Mqtt::sendMessageInfo");
}



void NetWork_Mqtt::MqttSubscribe(char *topic)
{
  MqttClient.subscribe(topic);
  MqttClient.loop();  // Solve LmacRxBlk:1 messages
}

void NetWork_Mqtt::lisenMqtt(){
  DEVICE_LOG_INFO("start NetWork_Mqtt::lisenMqtt");
  MqttClient.loop(); 
  DEVICE_LOG_INFO("end NetWork_Mqtt::lisenMqtt");
}

void NetWork_Mqtt::MqttReconnect()
{
  DEVICE_LOG_INFO("start NetWork_Mqtt::MqttReconnect");
/*
  EspClient.stop();
  if (!EspClient.connect(Settings.mqtt_host, Settings.mqtt_port)) {
    return;
  }

  EspClient.stop();
  yield();*/
  
  this->connectMqtt();
  DEVICE_LOG_INFO("end NetWork_Mqtt::MqttReconnect");
}


