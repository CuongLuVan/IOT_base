#include "ThresholdControl.h"

#include <Arduino.h>
#include <atomic>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "OnTimer.h"
#include "define_All.h"

static_assert(THRESHOLD_EEPROM_SIZE == threshold::kRuleCount * on_timer::kStorageSize, "2 x 4-byte rules");

namespace {
// Written by the network task (MQTT callback), read by SystemTask (flush).
std::atomic<uint32_t> ruleValues[threshold::kRuleCount];
std::atomic<bool> dirty{false};
// Network task only: set() and evaluate() run in TaskNetwork.
threshold::EdgeTracker edges;
// Rising edges waiting for TaskDevice.
std::atomic<uint8_t> pendingOn{0};
std::atomic<uint8_t> pendingOff{0};

// Sensor N = the N-th value of "va" (Common.cpp getInfoDevice).
bool reading(const InfoSensor& sensors, uint8_t sensor, int32_t& value)
{
    switch (sensor) {
        case 1: value = sensors.valueHumi; return true;
        case 2: value = sensors.valueTemp; return true;
        case 3: value = sensors.valueDust; return true;
        case 4: value = sensors.valueDust_PM2_5; return true;
        case 5: value = sensors.valueDust_PM10; return true;
        case 6: value = sensors.valueDust_PM1; return true;
        default: return false;
    }
}
} // namespace

void ThresholdControl::setup()
{
    uint8_t bytes[THRESHOLD_EEPROM_SIZE];
    const bool read = Memory::GetInstance()->readBytes(THRESHOLD_EEPROM_ADDRESS, bytes, sizeof(bytes));
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        uint32_t value = read ? on_timer::decode(bytes + i * on_timer::kStorageSize) : 0;
        // Blank (0xFFFFFFFF) or corrupt bytes: empty rule, rewritten only on a change.
        if (!threshold::isValid(value, THRESHOLD_SENSOR_COUNT, SCHEDULE_ALLOWED_PORT_MASK)) value = 0;
        ruleValues[i].store(value);
        edges.reset(i);
    }
    dirty.store(false);
    DEVICE_LOG_INFO("[Threshold] Rules 0x" + String(ruleValues[0].load(), HEX) + " 0x" +
                    String(ruleValues[1].load(), HEX) + ", EEPROM " + String(THRESHOLD_EEPROM_ADDRESS) +
                    ".." + String(THRESHOLD_EEPROM_END - 1));
}

bool ThresholdControl::set(uint8_t id, uint32_t value)
{
    if (id < 1 || id > threshold::kRuleCount ||
        !threshold::isValid(value, THRESHOLD_SENSOR_COUNT, SCHEDULE_ALLOWED_PORT_MASK)) {
        return false;
    }
    // A new rule acts on the next sample if its condition already holds.
    edges.reset(id - 1);
    if (ruleValues[id - 1].exchange(value) != value) dirty.store(true);
    return true;
}

uint32_t ThresholdControl::value(uint8_t id)
{
    return id >= 1 && id <= threshold::kRuleCount ? ruleValues[id - 1].load() : 0;
}

void ThresholdControl::evaluate(const InfoSensor& sensors)
{
    threshold::Rule rules[threshold::kRuleCount];
    bool readable[threshold::kRuleCount];
    int32_t readings[threshold::kRuleCount];
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        rules[i] = threshold::decode(ruleValues[i].load());
        readable[i] = reading(sensors, rules[i].sensor, readings[i]);
    }
    const threshold::Actions actions = edges.update(rules, readable, readings);
    if (actions.onMask == 0 && actions.offMask == 0) return;
    // The newest action of a port replaces an older one not yet applied.
    pendingOff.fetch_and(static_cast<uint8_t>(~actions.onMask));
    pendingOn.fetch_and(static_cast<uint8_t>(~actions.offMask));
    pendingOn.fetch_or(actions.onMask);
    pendingOff.fetch_or(actions.offMask);
    DEVICE_LOG_INFO("[Threshold] on=0x" + String(actions.onMask, HEX) + " off=0x" + String(actions.offMask, HEX));
}

bool ThresholdControl::takeActions(uint8_t& onMask, uint8_t& offMask)
{
    offMask = pendingOff.exchange(0);
    onMask = pendingOn.exchange(0);
    return onMask != 0 || offMask != 0;
}

void ThresholdControl::flush()
{
    if (!dirty.exchange(false)) return;
    uint8_t bytes[THRESHOLD_EEPROM_SIZE];
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        on_timer::encode(ruleValues[i].load(), bytes + i * on_timer::kStorageSize);
    }
    if (!Memory::GetInstance()->writeBytes(THRESHOLD_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        dirty.store(true);
        DEVICE_LOG_INFO("[Threshold] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG("[Threshold] Rules saved to EEPROM");
}
