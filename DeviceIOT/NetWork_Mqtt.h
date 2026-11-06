#pragma once

#include <Arduino.h>
#include "define_All.h"

class NetWork_Mqtt {
    public:
        void setupInfoMQTT();
        void getAllDataSetup();
        void disconnetMqtt();
        void  connectMqtt();
        unsigned char checkStatusMqtt();
        void sendMessageInfo(char * data);
        void MqttSubscribe(char *topic);
        void lisenMqtt();
        void MqttReconnect();
};

#if ENABLE_COMMAND_PASSWORD
// true when received equals the device password (constant time).
bool commandPasswordMatches(const char* received);
#endif

#if ENABLE_LAN_CONTROL
// LAN control (POST LAN_CONTROL_PATH): runs json exactly like an MQTT
// message on the subscribe topic and returns, as a JSON array, the replies
// the device would have published. "[]" = rejected or unknown command.
// Call from the task that services MQTT (TaskNetwork).
String handleLanCommand(const char* json, size_t length);
#endif

#if ENABLE_ASCON_AEAD128
// Encrypts with the current MQTT session key for the HTTP API (info.txt rule).
// Fails closed until the first key exists.
String getAsconEncryptedPayload(const String &payload);
#endif
