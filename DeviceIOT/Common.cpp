#include "Common.h"
#include <ArduinoJson.h>
#include "define_All.h"



StaticJsonDocument<JSON_BUFFER_SIZE> jsonBufferData;

String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice)
{
    jsonBufferData.clear();
    jsonBufferData["se"] = DEVICE_SERVICE_ID;
    String vaString =  String(sensorValue.valueHumi) + "," + String(sensorValue.valueTemp) + "," + String(sensorValue.valueDust) + "," + String(sensorValue.valueDust_PM2_5) + "," + String(sensorValue.valueDust_PM10) + "," + String(sensorValue.valueDust_PM1) + "," + String(sensorValue.valueControl) + "," + String(sensorValue.valueClientState);
    String coString =  String(statusDevice.device_port) + "," + String(statusDevice.button_click) + "," + String(statusDevice.button_status) + "," + String(statusDevice.count_info);
    jsonBufferData["va"] = vaString;
    jsonBufferData["co"] = coString;
    String response;
    serializeJson(jsonBufferData, response);
    return response;
}

String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice,
                     uint16_t clientDeviceId, uint8_t clientState)
{
    // Use an event snapshot so a later nRF24 packet cannot change this payload.
    sensorValue.valueClientState = clientState;
    jsonBufferData.clear();
    jsonBufferData["se"] = DEVICE_SERVICE_ID;
    jsonBufferData["id"] = clientDeviceId;
    String vaString = String(sensorValue.valueHumi) + "," + String(sensorValue.valueTemp) + "," + String(sensorValue.valueDust) + "," + String(sensorValue.valueDust_PM2_5) + "," + String(sensorValue.valueDust_PM10) + "," + String(sensorValue.valueDust_PM1) + "," + String(sensorValue.valueControl) + "," + String(sensorValue.valueClientState);
    String coString = String(statusDevice.device_port) + "," + String(statusDevice.button_click) + "," + String(statusDevice.button_status) + "," + String(statusDevice.count_info);
    jsonBufferData["va"] = vaString;
    jsonBufferData["co"] = coString;
    String response;
    serializeJson(jsonBufferData, response);
    return response;
}
