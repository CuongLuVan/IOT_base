#ifndef THRESHOLD_CONTROL_H
#define THRESHOLD_CONTROL_H

#include <stdint.h>

// Điều khiển theo ngưỡng sensor, độc lập với lịch. Tối đa 2 cài đặt, mỗi cái
// 4 byte (uint32 little-endian trong EEPROM, gửi gộp thành một số "value"):
//   byte 1 (bit 31..24): thứ tự sensor trong chuỗi "va" (1..), 0 = trống
//   byte 2 (bit 23..16): bit0-3 cổng, bit4 1 = bật / 0 = tắt,
//                        bit5 0 = khi sensor >= ngưỡng, 1 = khi sensor <= ngưỡng
//   byte 3-4 (bit 15..0): ngưỡng int16, cùng đơn vị với "va"
// Hành động chạy một lần mỗi khi điều kiện chuyển từ sai sang đúng; hai cài
// đặt ngược nhau (vd >= 3000 bật, <= 2800 tắt) tạo ngưỡng có trễ.
namespace threshold {

constexpr uint8_t kRuleCount = 2;
constexpr uint8_t kPortBits = 0x0F;
constexpr uint8_t kActionOn = 0x10;
constexpr uint8_t kBelow = 0x20;
constexpr uint8_t kFlagBits = kPortBits | kActionOn | kBelow;

struct Rule {
    uint8_t sensor;     // 1.., 0 = empty
    uint8_t flags;      // ports | kActionOn | kBelow
    int16_t threshold;
};

inline Rule decode(uint32_t value)
{
    Rule rule;
    rule.sensor = static_cast<uint8_t>(value >> 24);
    rule.flags = static_cast<uint8_t>(value >> 16);
    rule.threshold = static_cast<int16_t>(static_cast<uint16_t>(value));
    return rule;
}

inline uint32_t encode(const Rule& rule)
{
    return (static_cast<uint32_t>(rule.sensor) << 24) | (static_cast<uint32_t>(rule.flags) << 16) |
           static_cast<uint16_t>(rule.threshold);
}

// 0 (empty) is valid. sensorCount: sensors in "va"; allowedPorts: output bits.
inline bool isValid(uint32_t value, uint8_t sensorCount, uint8_t allowedPorts)
{
    if (value == 0) return true;
    const Rule rule = decode(value);
    const uint8_t ports = rule.flags & kPortBits;
    return rule.sensor >= 1 && rule.sensor <= sensorCount && (rule.flags & ~kFlagBits) == 0 &&
           ports != 0 && (ports & ~allowedPorts) == 0;
}

inline bool conditionMet(const Rule& rule, int32_t reading)
{
    return (rule.flags & kBelow) != 0 ? reading <= rule.threshold : reading >= rule.threshold;
}

struct Actions {
    uint8_t onMask;
    uint8_t offMask;
};

// Remembers each rule's condition and reports rising edges only.
class EdgeTracker {
public:
    void reset(uint8_t index) { met_[index] = false; }

    // readable[i] false (rule empty or sensor not read): the rule is skipped
    // and keeps its state. A port asked both on and off is left unchanged.
    Actions update(const Rule* rules, const bool* readable, const int32_t* readings)
    {
        Actions actions = {0, 0};
        for (uint8_t i = 0; i < kRuleCount; ++i) {
            if (!readable[i] || rules[i].sensor == 0) continue;
            const bool met = conditionMet(rules[i], readings[i]);
            if (met && !met_[i]) {
                const uint8_t ports = rules[i].flags & kPortBits;
                if ((rules[i].flags & kActionOn) != 0) actions.onMask |= ports;
                else actions.offMask |= ports;
            }
            met_[i] = met;
        }
        const uint8_t conflict = actions.onMask & actions.offMask;
        actions.onMask &= static_cast<uint8_t>(~conflict);
        actions.offMask &= static_cast<uint8_t>(~conflict);
        return actions;
    }

private:
    bool met_[kRuleCount] = {};
};

} // namespace threshold

struct InfoSensor;

// Persistent rules. The MQTT callback calls set() (RAM only), the network
// task evaluate() on each new sensor sample, TaskDevice takeActions(), and
// SystemTask flush(), which writes EEPROM only after a change.
class ThresholdControl {
public:
    static void setup();
    // id 1..threshold::kRuleCount; value 0 deletes. false: invalid.
    static bool set(uint8_t id, uint32_t value);
    static uint32_t value(uint8_t id);
    static void evaluate(const InfoSensor& sensors);
    // Ports to switch; false when nothing is pending.
    static bool takeActions(uint8_t& onMask, uint8_t& offMask);
    static void flush();
};

#endif
