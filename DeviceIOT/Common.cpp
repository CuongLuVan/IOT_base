#include "Common.h"

#include "define_All.h"

namespace {

String joinValues(const int* values, size_t count)
{
    String text;
    text.reserve(count * 6);
    for (size_t i = 0; i < count; ++i) {
        if (i != 0) text += ',';
        text += values[i];
    }
    return text;
}

}  // namespace

void writeDeviceInfo(JsonObject target, const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice)
{
    const int va[] = {sensorValue.valueHumi,       sensorValue.valueTemp,      sensorValue.valueDust,
                      sensorValue.valueDust_PM2_5, sensorValue.valueDust_PM10, sensorValue.valueDust_PM1,
                      sensorValue.valueControl};
    const int co[] = {statusDevice.device_port, statusDevice.button_click, statusDevice.button_status,
                      statusDevice.count_info};
    target["se"] = DEVICE_SERVICE_ID;
    target["va"] = joinValues(va, sizeof(va) / sizeof(va[0]));
    target["co"] = joinValues(co, sizeof(co) / sizeof(co[0]));
}

// Plaintext: the MQTT and HTTP senders apply Ascon themselves.
String getInfoDevice(const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice)
{
    JsonDocument document;
    writeDeviceInfo(document.to<JsonObject>(), sensorValue, statusDevice);
    String response;
    response.reserve(measureJson(document) + 1);
    if (document.overflowed() || serializeJson(document, response) == 0) return String();
    return response;
}

bool sensorReading(const InfoSensor& sensorValue, uint8_t sensor, int32_t& value)
{
    switch (sensor) {
        case 1: value = sensorValue.valueHumi; return sensorValue.dhtValid;
        case 2: value = sensorValue.valueTemp; return sensorValue.dhtValid;
        case 3: value = sensorValue.valueDust; return sensorValue.pmsValid;
        case 4: value = sensorValue.valueDust_PM2_5; return sensorValue.pmsValid;
        case 5: value = sensorValue.valueDust_PM10; return sensorValue.pmsValid;
        case 6: value = sensorValue.valueDust_PM1; return sensorValue.pmsValid;
        default: return false;
    }
}
