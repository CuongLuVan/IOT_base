#include "HighSpeedUdpSender.h"

#include <WiFiUdp.h>

#include "ByteCodec.h"
#include "CaptureTypes.h"
#include "DebugInfo.h"
#include "HighSpeedSampler.h"
#include "SystemTask.h"
#include "define_All.h"

namespace high_speed_udp {

namespace {

constexpr uint32_t kFailureLogIntervalMs = 1000;

WiFiUDP socket;
bool socketOpen = false;
// Samples lost on the network side per capture type, added to the dropped
// field of the next datagram of the same session that leaves.
uint32_t droppedSamples[kCaptureTypeCount] = {};
uint32_t droppedSessionIds[kCaptureTypeCount] = {};
bool droppedSessionValid[kCaptureTypeCount] = {};
uint32_t sendFailures = 0;
uint32_t lastFailureLogMs = 0;

void addPendingDrops(HighSpeedUdpPacket& packet)
{
    const int index = captureIndex(packet.bytes[capture_udp::kOffType]);
    if (index < 0) return;
    const uint32_t sessionId = be::get32(packet.bytes + capture_udp::kOffSession);
    if (droppedSessionValid[index] && droppedSessionIds[index] != sessionId) {
        droppedSamples[index] = 0;
        droppedSessionValid[index] = false;
    }
    const uint32_t total = be::get32(packet.bytes + capture_udp::kOffDropped) + droppedSamples[index];
    be::put32(packet.bytes + capture_udp::kOffDropped, total);
    droppedSamples[index] = 0;
}

void recordDrop(const HighSpeedUdpPacket& packet)
{
    ++sendFailures;
    const int index = captureIndex(packet.bytes[capture_udp::kOffType]);
    if (index < 0) return;
    const uint32_t sessionId = be::get32(packet.bytes + capture_udp::kOffSession);
    if (!droppedSessionValid[index] || droppedSessionIds[index] != sessionId) {
        droppedSamples[index] = 0;
        droppedSessionIds[index] = sessionId;
        droppedSessionValid[index] = true;
    }
    droppedSamples[index] += be::get16(packet.bytes + capture_udp::kOffSampleCount) +
                             be::get32(packet.bytes + capture_udp::kOffDropped);
    if (droppedSamples[index] == 0) {
        droppedSessionValid[index] = false;
    }
}

bool send(HighSpeedUdpPacket& packet)
{
    if (!socketOpen || !socket.beginPacket(packet.targetIP, packet.targetPort)) {
        return false;
    }
    addPendingDrops(packet);
    const size_t written = socket.write(packet.bytes, packet.length);
    const bool completed = socket.endPacket() == 1;
    return written == packet.length && completed;
}

}  // namespace

void begin()
{
    socketOpen = socket.begin(0) == 1;
    if (!socketOpen) {
        DEVICE_LOG_ERROR("[HighSpeed] Cannot open the UDP socket");
    }
}

void rebind()
{
    socket.stop();
    begin();
}

void service(bool linkUp)
{
    HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
    HighSpeedUdpPacket packet;
    for (size_t i = 0; i < HS_NETWORK_DRAIN_BATCH; ++i) {
        if (!sampler.receivePacket(packet)) {
            break;
        }
        const UdpPacketType type = static_cast<UdpPacketType>(packet.bytes[capture_udp::kOffType]);
        if (linkUp && send(packet)) {
            SystemTask::recordUdpSent(type);
            continue;
        }
        SystemTask::recordUdpFailure(type, be::get16(packet.bytes + capture_udp::kOffSampleCount));
        recordDrop(packet);
        const uint32_t nowMs = millis();
        if (nowMs - lastFailureLogMs >= kFailureLogIntervalMs) {
            lastFailureLogMs = nowMs;
            DEVICE_LOGF_WARNING("[HighSpeed] UDP send failures=%lu\n", static_cast<unsigned long>(sendFailures));
        }
    }
}

}  // namespace high_speed_udp
