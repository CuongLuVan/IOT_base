#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include <PubSubClient.h>  
#include <ArduinoJson.h>
#include <WiFiClient.h>
#include <StreamString.h>                   // Webserver, Updater                  // WifiManager
#include "Memory.h" 

WiFiClient EspClient;
PubSubClient MqttClient(EspClient);         // MQTT Client


StaticJsonDocument<512> jsonBufferMqtt;

struct SYSCFG {
  char          mqtt_fingerprint[60];      // 1AD To be freed by binary fingerprint
  char          mqtt_host[33];             // 1E9
  uint16_t      mqtt_port;                 // 20A
  char          mqtt_client[33];           // 20C
  char          mqtt_user[33];             // 22D
  char          mqtt_pwd[33];              // 24E
  char          public_topic[33];            // 26F
  char          subcribe_topic[33];          // 290
  char          mqtt_grptopic[33];         // 2B1
  char          web_password[33];          // 4A9
} Settings;


void MqttDataCallback(char* topic, byte* data, unsigned int data_len)
{
    //decodeMessange()
}


bool parseJsonToSettings(String json) {
  DeserializationError error = deserializeJson(jsonBufferMqtt, json);
  if (error) {
    Serial.print(F("deserializeJson() failed: "));
    Serial.println(error.f_str());
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
  return true;
}

void NetWork_Mqtt::setupInfoMQTT()
{

    String payload = Memory::GetInstance()->readString(WIFI_SETUP_JSON);
    if(!parseJsonToSettings(payload)){
      return;
    }
    MqttClient.setCallback(MqttDataCallback);
    MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);
    if (MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd, Settings.subcribe_topic, 1, true, "")) {

    } 
}


void NetWork_Mqtt::getAllDataSetup(){
   
}



void NetWork_Mqtt::disconnetMqtt(){
   MqttClient.disconnect();
}

void NetWork_Mqtt::connectMqtt(){
   
}


unsigned char  NetWork_Mqtt::checkStatusMqtt(){
    return 0;
}
void NetWork_Mqtt::sendMessageInfo(char * data){

  if (MqttClient.publish(Settings.subcribe_topic, data, 1)) {
      
  }
   
}
void NetWork_Mqtt::decodeMessange(char * data){
   
}


void NetWork_Mqtt::MqttSubscribe(char *topic)
{
  MqttClient.subscribe(topic);
  MqttClient.loop();  // Solve LmacRxBlk:1 messages
}

void NetWork_Mqtt::lisenMqtt(){
  MqttClient.loop(); 
}

void NetWork_Mqtt::MqttReconnect()
{

  EspClient.stop();
  if (!EspClient.connect(Settings.mqtt_host, Settings.mqtt_port)) {
    return;
  }

  EspClient.stop();
  yield();
  MqttClient.setCallback(MqttDataCallback);
  MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);

  if (MqttClient.connect(Settings.mqtt_client, Settings.mqtt_user, Settings.mqtt_pwd, Settings.subcribe_topic, 1, true, "")) {
    this->sendMessageInfo("test");
    this->connectMqtt();
  }
}


