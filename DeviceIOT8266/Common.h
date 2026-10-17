#pragma once

#include <Arduino.h>
#include <cstdint>

// Temperature and humidity are stored in centi-units to avoid float payloads.
struct InfoSensor {
    int16_t valueHumi;
    int16_t valueTemp;
    uint16_t valueAdc;
    uint32_t sampleSequence;
    bool dhtValid;
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
    uint8_t commandValue;
    uint16_t reserved;
};

struct ProcessTimeData {
    unsigned long timeStart;
    unsigned long time_counter_start;
    unsigned long time_counter_end;
    unsigned char numberCheck;
    unsigned long timestamp;
    unsigned char state;
    unsigned long countNetWorkWorng;
    unsigned long lastExternalPingTime;
};

String getInfoDevice(const InfoSensor& sensorValue,
                     const InfoDeviceControl& statusDevice);