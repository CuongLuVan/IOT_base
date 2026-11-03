#include "Common.h"
#include <ArduinoJson.h>
#include "define_All.h"



String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice)
{
    // Local document: no permanent RAM, and the HTTP and MQTT tasks no longer
    // share one buffer.
    StaticJsonDocument<JSON_BUFFER_SIZE> jsonBufferData;
    jsonBufferData["se"] = DEVICE_SERVICE_ID;
    String vaString =  String(sensorValue.valueHumi) + "," + String(sensorValue.valueTemp) + "," + String(sensorValue.valueDust) + "," + String(sensorValue.valueDust_PM2_5) + "," + String(sensorValue.valueDust_PM10) + "," + String(sensorValue.valueDust_PM1) + "," + String(sensorValue.valueControl);
    String coString =  String(statusDevice.device_port) + "," + String(statusDevice.button_click) + "," + String(statusDevice.button_status) + "," + String(statusDevice.count_info);
    jsonBufferData["va"] = vaString;
    jsonBufferData["co"] = coString;
    String response;
    serializeJson(jsonBufferData, response);
    // Plaintext here: the MQTT and HTTP senders apply Ascon themselves, so
    // MQTT payloads are not encrypted twice.
    return response;
}
