#pragma once

#include <stdint.h>
#include <string>

#include "JsonUtil.h"

// Latest sensor values (TaskSensor::copyLatest). Temperature and humidity are
// centi-units (2570 = 25.70) to avoid float payloads.
struct InfoSensor {
    int16_t valueHumi;
    int16_t valueTemp;
    uint16_t valueAdc;
    uint32_t sampleSequence;  // Increases with every new sample.
    bool dhtValid;            // valueHumi / valueTemp hold a real reading.
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

// Device info message: {"se":DEVICE_SERVICE_ID,"va":"<sensor list>","co":"<status list>",
// "dht_valid":bool,"sample":sampleSequence}.
// "va" = humidity,temperature,ADC raw value.
// "co" = device_port,button_click,button_status,count_info.
void writeDeviceInfo(cJSON* target, const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice);
std::string getInfoDevice(const InfoSensor& sensorValue, const InfoDeviceControl& statusDevice);

// Value number sensor (1-based) of the "va" list, for threshold rules
// (THRESHOLD_SENSOR_COUNT of them). false: no such sensor or no valid reading.
bool sensorReading(const InfoSensor& sensorValue, uint8_t sensor, int32_t& value);
