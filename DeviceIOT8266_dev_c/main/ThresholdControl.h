#pragma once

// Sensor threshold control, independent of schedules. Up to kRuleCount rules;
// each is one uint32 "value" on the wire and in EEPROM:
//
//   bits [31:24] sensor: position in the "va" list (1..), 0 = empty rule
//   bits [23:16] flags:  [3:0] ports, [4] 1 = switch on / 0 = switch off,
//                        [5] 0 = when sensor >= threshold, 1 = when sensor <= threshold
//   bits [15:0]  threshold: int16, same unit as "va"
//
// Example: 0x02110BB8 = (2 << 24) | (0x11 << 16) | 3000
//          -> temperature (sensor 2) >= 30.00 C switches port bit0 on.
// EEPROM: THRESHOLD_EEPROM_ADDRESS, little-endian (low byte first, ByteCodec.h),
// rule 1 then rule 2.
//
// A rule acts once each time its condition goes from false to true; two
// opposite rules (e.g. >= 3000 on, <= 2800 off) give a threshold with
// hysteresis.
//
// Copied unchanged (logic) from DeviceIOT8266; independent of the platform.

#include <stdint.h>

namespace threshold {

constexpr uint8_t kRuleCount = 2;
constexpr uint8_t kSensorShift = 24;
constexpr uint8_t kFlagsShift = 16;
constexpr uint32_t kThresholdMask = 0xFFFF;
constexpr uint8_t kPortBits = 0x0F;
constexpr uint8_t kActionOn = 0x10;
constexpr uint8_t kBelow = 0x20;
constexpr uint8_t kFlagBits = kPortBits | kActionOn | kBelow;

struct Rule {
    uint8_t sensor;  // 1.., 0 = empty
    uint8_t flags;   // ports | kActionOn | kBelow
    int16_t threshold;
};

inline Rule decode(uint32_t value)
{
    Rule rule;
    rule.sensor = static_cast<uint8_t>(value >> kSensorShift);
    rule.flags = static_cast<uint8_t>(value >> kFlagsShift);
    rule.threshold = static_cast<int16_t>(static_cast<uint16_t>(value & kThresholdMask));
    return rule;
}

inline uint32_t encode(const Rule& rule)
{
    return (static_cast<uint32_t>(rule.sensor) << kSensorShift) |
           (static_cast<uint32_t>(rule.flags) << kFlagsShift) | static_cast<uint16_t>(rule.threshold);
}

// 0 (empty) is valid. sensorCount: sensors in "va"; allowedPorts: output bits.
inline bool isValid(uint32_t value, uint8_t sensorCount, uint8_t allowedPorts)
{
    if (value == 0) return true;
    const Rule rule = decode(value);
    const uint8_t portBits = rule.flags & kPortBits;
    return rule.sensor >= 1 && rule.sensor <= sensorCount && (rule.flags & ~kFlagBits) == 0 && portBits != 0 &&
           (portBits & ~allowedPorts) == 0;
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
    void reset(uint8_t index)
    {
        met_[index] = false;
    }

    // readable[i] false (rule empty or sensor not read): the rule is skipped
    // and keeps its state. A port asked both on and off is left unchanged.
    Actions update(const Rule* rules, const bool* readable, const int32_t* readings)
    {
        Actions actions = {0, 0};
        for (uint8_t i = 0; i < kRuleCount; ++i) {
            if (!readable[i] || rules[i].sensor == 0) continue;
            const bool met = conditionMet(rules[i], readings[i]);
            if (met && !met_[i]) {
                const uint8_t portBits = rules[i].flags & kPortBits;
                if ((rules[i].flags & kActionOn) != 0) {
                    actions.onMask |= portBits;
                } else {
                    actions.offMask |= portBits;
                }
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

}  // namespace threshold

struct InfoSensor;

// Persistent rules. The network task calls set() (RAM only), TaskSensor
// evaluate() on each new sample, TaskDevice takeActions(), and Automation
// stage(), which writes EEPROM only after a change.
class ThresholdControl {
public:
    static void setup();
    // id 1..threshold::kRuleCount; value 0 deletes. false: invalid.
    static bool set(uint8_t id, uint32_t value);
    static uint32_t value(uint8_t id);
    static void evaluate(const InfoSensor& sensors);
    // Ports to switch; false when nothing is pending.
    static bool takeActions(uint8_t& onMask, uint8_t& offMask);
    // Automation: copies a changed value into the EEPROM RAM copy (committed
    // by Automation). true when something was staged.
    static bool stage();
};
