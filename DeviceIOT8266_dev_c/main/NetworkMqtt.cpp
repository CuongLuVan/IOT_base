// Public API of the MQTT module (NetworkMqtt.h). The work is done in the
// files listed in MqttInternal.h.

#include "NetworkMqtt.h"

#include "MqttInternal.h"

void NetworkMqtt::begin()
{
    mqtt::reloadCommandPassword();
    (void)mqtt::transport::begin();
}

bool NetworkMqtt::connect()
{
    return mqtt::transport::connect();
}

void NetworkMqtt::disconnect()
{
    mqtt::transport::disconnect();
}

bool NetworkMqtt::isConnected()
{
    return mqtt::transport::connected();
}

bool NetworkMqtt::publish(const std::string& payload)
{
    return mqtt::publishEncryptedText(payload);
}

void NetworkMqtt::loop()
{
    mqtt::transport::service();
}
