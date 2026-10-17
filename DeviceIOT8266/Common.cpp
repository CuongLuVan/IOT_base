#include "Common.h"
#include "define_All.h"
#include <ArduinoJson.h>

String getInfoDevice(const InfoSensor& sensorValue,
                     const InfoDeviceControl& statusDevice)
{
    StaticJsonDocument<JSON_BUFFER_SIZE> document;
    document["se"] = DEVICE_SERVICE_ID;

    // Keep the legacy va/co fields while publishing only the retained sensors:
    // humidity (centi-%RH), temperature (centi-C), ADC raw value.
    document["va"] = String(sensorValue.valueHumi) + "," +
                     String(sensorValue.valueTemp) + "," +
                     String(sensorValue.valueAdc);
    document["co"] = String(statusDevice.device_port) + "," +
                     String(statusDevice.button_click) + "," +
                     String(statusDevice.button_status) + "," +
                     String(statusDevice.count_info);
    document["dht_valid"] = sensorValue.dhtValid;
    document["sample"] = sensorValue.sampleSequence;

    String response;
    if (serializeJson(document, response) == 0 || document.overflowed()) {
        return String();
    }
    return response;
}