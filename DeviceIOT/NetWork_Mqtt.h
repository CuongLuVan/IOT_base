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

#if ENABLE_ASCON_AEAD128
// Encrypts with the current MQTT session key for the HTTP API (info.txt rule).
// Fails closed until the first key exists.
String getAsconEncryptedPayload(const String &payload);
#endif
