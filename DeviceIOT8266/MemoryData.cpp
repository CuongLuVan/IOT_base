#include "MemoryData.h"

MemoryData& MemoryData::GetInstance() {
    static MemoryData instance;
    return instance;
}

MemoryData::MemoryData()
    : sensorData_(nullptr), deviceStatus_(nullptr), deviceCommand_(nullptr) {}

MemoryData::~MemoryData() = default;