#include "HighSpeedSampler.h"

HighSpeedSampler& HighSpeedSampler::GetInstance() {
    static HighSpeedSampler instance;
    return instance;
}

bool HighSpeedSampler::setup() { return true; }
bool HighSpeedSampler::startSampling(const HighSpeedConfig&) { return false; }
void HighSpeedSampler::stopSampling() {}
bool HighSpeedSampler::isSamplingActive() const { return false; }
bool HighSpeedSampler::isModeAvailable(HighSpeedMode) const { return false; }
bool HighSpeedSampler::processSensorTask() { return false; }
bool HighSpeedSampler::receivePacket(HighSpeedUdpPacket&) { return false; }
uint32_t HighSpeedSampler::packetQueueDepth() const { return 0; }