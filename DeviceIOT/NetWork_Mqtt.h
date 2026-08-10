
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
String getAsconEncryptedPayload(const String &payload);
bool tryAsconDecryptPayload(const String &payload, String &plainText);
void ensureAsconKeyReady();
#endif
