#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <stdint.h>

// Latest sensor values (TaskSensor::copyLatest). Temperature and humidity are
// centi-units (2570 = 25.70), dust values ug/m3; valueDust is the US EPA
// PM2.5 AQI (AirQuality.h).
struct InfoSensor {
    int valueHumi;
    int valueTemp;
    int valueDust;
    int valueDust_PM2_5;
    int valueDust_PM10;
    int valueDust_PM1;
    int valueControl;
    uint32_t sampleSequence;  // Increases with every new sample.
    bool dhtValid;            // valueHumi / valueTemp hold a real reading.
    bool pmsValid;            // The dust values hold a real reading.
};

struct InfoDeviceControl {
    uint8_t device_port;
    uint8_t button_click;
    uint8_t button_status;
    uint16_t count_info;
    uint8_t device_port_last;
};

struct DeviceCommand {
    uint8_t commandType;
    uint8_t commandValue;     // Port state bits.
    uint16_t reserved;
    uint8_t portMask;         // Ports this command changes; 0 = all (legacy com:1).
    uint16_t autoOffSeconds;  // Schedule commands only; 0 = no auto OFF.
};

// Device info message: {"se":DEVICE_SERVICE_ID,"va":"<sensor list>","co":"<status list>"}.
// "va" = humidity,temperature,dust AQI,PM2.5,PM10,PM1,control.
// "co" = device_port,button_click,button_status,count_info.
void writeDeviceInfo(JsonObject target, const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice);
String getInfoDevice(const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice);

// Value number sensor (1-based) of the "va" list, for threshold rules
// (THRESHOLD_SENSOR_COUNT of them). false: no such sensor or no valid reading.
bool sensorReading(const InfoSensor& sensorValue, uint8_t sensor, int32_t& value);
