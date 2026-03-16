#include "MemoryData.h"


    
MemoryData &MemoryData::GetInstance() {
    static MemoryData instance;
    return instance;
}

MemoryData::MemoryData()
{
	
}

MemoryData::~MemoryData() {
}
