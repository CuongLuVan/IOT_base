#include "Common.h"
#include <ArduinoJson.h>
#include "define_All.h"



StaticJsonDocument<JSON_BUFFER_SIZE> jsonBufferData;

String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice)
{
    jsonBufferData.clear();
    jsonBufferData["se"] = DEVICE_SERVICE_ID;
    String coString =  String(statusDevice.device_port) + "," + String(statusDevice.button_click) + "," + String(statusDevice.button_status) + "," + String(statusDevice.count_info);
    JsonObject va = jsonBufferData.createNestedObject("va");
    va["cu"] = sensorValue.valueCurrentAmpere;
    va["wo"] = sensorValue.valueEnergyWh;
    jsonBufferData["co"] = coString;
    String response;
    serializeJson(jsonBufferData, response);
    return response;
}
