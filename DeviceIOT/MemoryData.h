#ifndef MEMORY_DATA_H
#define MEMORY_DATA_H
#include "Common.h"

class MemoryData {
public:
    static MemoryData &GetInstance();

	InfoSensor *sensorData_;
	InfoDeviceControl *deviceStatus_;
	DeviceCommand *deviceCommand_;

private:
    MemoryData();
    ~MemoryData();

    MemoryData(const MemoryData &) = delete;
    MemoryData &operator=(const MemoryData &) = delete;

};

#endif // MEMORY_DATA_H
