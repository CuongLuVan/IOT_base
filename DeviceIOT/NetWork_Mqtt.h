
class NetWork_Mqtt {
    public:
        void setupInfoMQTT();
        void getAllDataSetup();
        void disconnetMqtt();
        void  connectMqtt();
        unsigned char checkStatusMqtt();
        void sendMessageInfo(const char * data);
        void MqttSubscribe(char *topic);
        void lisenMqtt();
        void MqttReconnect();
};
