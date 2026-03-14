#include <cstdint>


struct InfoSensor {
    int valueHumi;
    int valueTemp;
    int valueDust;
    int valueDust_PM2_5;
    int valueDust_PM10;
    int valueDust_PM1;
    int valueControl;
};

struct InfoDeviceControl {
    uint8_t device_port;
    uint8_t button_click;
    uint8_t button_status;
    uint16_t count_info;
};

struct DeviceCommand {
    uint8_t commandType;
    uint8_t commandValue;
    uint16_t reserved;
};

struct TestTimeData
{
    unsigned long timeStart;
    unsigned char state;
    unsigned char numberCheck;
    unsigned long countNetWorkWorng;
    /* data */
};