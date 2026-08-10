#include "Common.h"
#include "NetWork_Mqtt.h"
#include <ArduinoJson.h>
#include "define_All.h"



StaticJsonDocument<JSON_BUFFER_SIZE> jsonBufferData;

String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice)
{
    jsonBufferData.clear();
    jsonBufferData["data"] = DEVICE_INFO_DEFAULT_VALUE;
    String vaString =  String(sensorValue.valueHumi) + "," + String(sensorValue.valueTemp) + "," + String(sensorValue.valueDust) + "," + String(sensorValue.valueDust_PM2_5) + "," + String(sensorValue.valueDust_PM10) + "," + String(sensorValue.valueDust_PM1) + "," + String(sensorValue.valueControl);
    String coString =  String(statusDevice.device_port) + "," + String(statusDevice.button_click) + "," + String(statusDevice.button_status) + "," + String(statusDevice.count_info);
    jsonBufferData["va"] = vaString;
    jsonBufferData["co"] = coString;
    String response;
    serializeJson(jsonBufferData, response);
#if ENABLE_ASCON_AEAD128
    return getAsconEncryptedPayload(response);
#else
    return response;
#endif
}
