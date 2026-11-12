#include "Common.h"

#include <stdio.h>

#include "define_All.h"

namespace {

std::string joinValues(const int* values, size_t count)
{
    std::string text;
    text.reserve(count * 6);
    for (size_t i = 0; i < count; ++i) {
        if (i != 0) text += ',';
        char number[12];
        snprintf(number, sizeof(number), "%d", values[i]);
        text += number;
    }
    return text;
}

}  // namespace

void writeDeviceInfo(cJSON* target, const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice)
{
    const int va[] = {sensorValue.valueHumi, sensorValue.valueTemp, sensorValue.valueAdc};
    const int co[] = {statusDevice.device_port, statusDevice.button_click, statusDevice.button_status,
                      statusDevice.count_info};
    json::setNumber(target, "se", DEVICE_SERVICE_ID);
    json::setString(target, "va", joinValues(va, sizeof(va) / sizeof(va[0])));
    json::setString(target, "co", joinValues(co, sizeof(co) / sizeof(co[0])));
    json::setBool(target, "dht_valid", sensorValue.dhtValid);
    json::setNumber(target, "sample", sensorValue.sampleSequence);
}

// Plaintext: the MQTT and HTTP senders apply Ascon themselves.
std::string getInfoDevice(const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice)
{
    json::Ptr document = json::newObject();
    if (!document) return std::string();
    writeDeviceInfo(document.get(), sensorValue, statusDevice);
    return json::print(document.get());
}

bool sensorReading(const InfoSensor& sensorValue, uint8_t sensor, int32_t& value)
{
    switch (sensor) {
        case 1: value = sensorValue.valueHumi; return sensorValue.dhtValid;
        case 2: value = sensorValue.valueTemp; return sensorValue.dhtValid;
        case 3: value = sensorValue.valueAdc; return true;
        default: return false;
    }
}
