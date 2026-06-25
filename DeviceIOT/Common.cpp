#include "Common.h"
#include <ArduinoJson.h>

StaticJsonDocument<512> jsonBufferData;

String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice)
{
    jsonBufferData.clear();
    jsonBufferData["data"] = 2;
    String vaString =  String(sensorValue.valueHumi) + "," + String(sensorValue.valueTemp) + "," + String(sensorValue.valueDust) + "," + String(sensorValue.valueDust_PM2_5) + "," + String(sensorValue.valueDust_PM10) + "," + String(sensorValue.valueDust_PM1) + "," + String(sensorValue.valueControl);
    String coString =  String(statusDevice.device_port) + "," + String(statusDevice.button_click) + "," + String(statusDevice.button_status) + "," + String(statusDevice.count_info);
    jsonBufferData["va"] = vaString;
    jsonBufferData["co"] = coString;
    String response;
    serializeJson(jsonBufferData, response);
    return response;
}
