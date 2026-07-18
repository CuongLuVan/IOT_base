#pragma once
#include <cstdint>
#include <Arduino.h>

struct InfoSensor {
    int valueHumi;
    int valueTemp;
    int valueDust;
    int valueDust_PM2_5;
    int valueDust_PM10;
    int valueDust_PM1;
    int valueControl;
    float rollAngle;
    float pitchAngle;
    float yawRate;
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
    uint8_t controlMode;
    int16_t throttle;
    int16_t moveX;
    int16_t moveY;
    int16_t around;
};

struct ProcessTimeData
{
    unsigned long timeStart;
    unsigned long time_counter_start;
    unsigned long time_counter_end;  
    unsigned char numberCheck;
    unsigned long timestamp;
    unsigned char state;
    unsigned long countNetWorkWorng;
    unsigned long lastExternalPingTime;
    /* data */
};

String getInfoDevice(InfoSensor sensorValue, InfoDeviceControl statusDevice);