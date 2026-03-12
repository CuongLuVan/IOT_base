
class NetWork_Mqtt {
    public:
        void setupInfoMQTT();
        void getAllDataSetup();
        void disconnetMqtt();
        void  connectMqtt();
        unsigned char checkStatusMqtt();
        void sendMessageInfo(char * data);
        void decodeMessange(char * data);
        void MqttSubscribe(char *topic);
        void lisenMqtt();
        void MqttReconnect();
};
