#pragma once

// High-speed capture types shared by HighSpeedSampler (producer), TaskNetwork
// (UDP sender) and SystemTask (counters), without pulling in the sampler.
//
// UDP datagram = 28-byte header + payload of consecutive samples, every
// multi-byte number big-endian (docs/HighSpeedAcquisition.md):
//   offset size field
//        0    2 magic 'H' 'S'
//        2    1 version (1)
//        3    1 type (UdpPacketType)
//        4    4 session id
//        8    4 sequence, per type
//       12    8 timestamp of the first sample, us since boot
//       20    2 sample count
//       22    2 payload bytes
//       24    4 samples dropped since the previous datagram of this type
//       28    N payload

#include <stddef.h>
#include <stdint.h>

enum UdpPacketType : uint8_t {
    UDP_PACKET_ADC = 0x01,  // 2 bytes per sample: ADC raw value.
    UDP_PACKET_IMU = 0x02,  // 14 bytes per sample: ICM-42688 temperature, accel xyz, gyro xyz (int16).
    UDP_PACKET_ADS = 0x03,  // 2 bytes per sample: ADS8866 raw value.
};

// Number of UdpPacketType values; per-type counters are indexed by captureIndex().
constexpr size_t kCaptureTypeCount = 3;

// 0..kCaptureTypeCount-1, or -1 for an unknown type.
inline int captureIndex(uint8_t type)
{
    return type >= UDP_PACKET_ADC && type <= UDP_PACKET_ADS ? type - UDP_PACKET_ADC : -1;
}

namespace capture_udp {

enum HeaderOffset : size_t {
    kOffMagic = 0,
    kOffVersion = 2,
    kOffType = 3,
    kOffSession = 4,
    kOffSequence = 8,
    kOffFirstSampleUs = 12,
    kOffSampleCount = 20,
    kOffPayloadBytes = 22,
    kOffDropped = 24,
    kHeaderSize = 28,
};

constexpr uint8_t kMagic0 = 'H';
constexpr uint8_t kMagic1 = 'S';
constexpr uint8_t kVersion = 1;

}  // namespace capture_udp
