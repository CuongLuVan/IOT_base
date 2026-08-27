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
    int valueTempK;              // K-type thermocouple temperature, 0.01 degree C
    uint8_t isTempKValid;        // 1 when MAX6675 has a connected thermocouple
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
