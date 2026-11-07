// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "ThresholdControl.h"

#include <Arduino.h>

#include "ByteCodec.h"
#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "Sync.h"
#include "define_All.h"

static_assert(THRESHOLD_EEPROM_SIZE == threshold::kRuleCount * le32::kSize, "2 x 4-byte rules");

namespace {
// Written by the network task (set), read by TaskSensor (evaluate) and
// SystemTask (stage).
platform_sync::AtomicU32 ruleValues[threshold::kRuleCount];
platform_sync::DirtyFlag dirty;

// edges and the pending actions: set() in the network task, evaluate() in
// TaskSensor, takeActions() in TaskDevice.
platform_sync::Mutex stateMutex;
threshold::EdgeTracker edges;
uint8_t pendingOn = 0;
uint8_t pendingOff = 0;
}  // namespace

void ThresholdControl::setup()
{
    if (!stateMutex.create()) {
        DEVICE_LOG_ERROR("[Threshold] Cannot create mutex; threshold control disabled");
    }
    uint8_t bytes[THRESHOLD_EEPROM_SIZE];
    const bool read = Memory::GetInstance()->readBytes(THRESHOLD_EEPROM_ADDRESS, bytes, sizeof(bytes));
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        uint32_t value = read ? le32::decode(bytes + i * le32::kSize) : 0;
        // Blank (0xFFFFFFFF) or corrupt bytes: empty rule, rewritten only on a change.
        if (!threshold::isValid(value, THRESHOLD_SENSOR_COUNT, AUTOMATION_PORT_MASK)) value = 0;
        ruleValues[i].store(value);
        edges.reset(i);
    }
    (void)dirty.takeIfSet();
    DEVICE_LOGF_INFO("[Threshold] Rules 0x%08lX 0x%08lX, EEPROM %d..%d\n",
                     static_cast<unsigned long>(ruleValues[0].load()),
                     static_cast<unsigned long>(ruleValues[1].load()), THRESHOLD_EEPROM_ADDRESS,
                     THRESHOLD_EEPROM_END - 1);
}

bool ThresholdControl::set(uint8_t id, uint32_t value)
{
    if (id < 1 || id > threshold::kRuleCount ||
        !threshold::isValid(value, THRESHOLD_SENSOR_COUNT, AUTOMATION_PORT_MASK)) {
        return false;
    }
    uint32_t previous = 0;
    {
        // Rule and edge state change together, so evaluate() never applies
        // the old rule to the reset edge state.
        platform_sync::ScopedLock lock(stateMutex);
        if (!lock.locked()) return false;
        previous = ruleValues[id - 1].exchange(value);
        // A new rule acts on the next sample if its condition already holds.
        edges.reset(id - 1);
    }
    // Value before flag, so stage() never saves an older value and clears it.
    if (previous != value) dirty.set();
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
    threshold::Actions actions;
    {
        platform_sync::ScopedLock lock(stateMutex);
        if (!lock.locked()) return;
        for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
            rules[i] = threshold::decode(ruleValues[i].load());
            readable[i] = sensorReading(sensors, rules[i].sensor, readings[i]);
        }
        actions = edges.update(rules, readable, readings);
        // The newest action of a port replaces an older one not yet applied.
        pendingOn = static_cast<uint8_t>((pendingOn & ~actions.offMask) | actions.onMask);
        pendingOff = static_cast<uint8_t>((pendingOff & ~actions.onMask) | actions.offMask);
    }
    if (actions.onMask == 0 && actions.offMask == 0) return;
    DEVICE_LOGF_INFO("[Threshold] on=0x%02X off=0x%02X\n", actions.onMask, actions.offMask);
}

bool ThresholdControl::takeActions(uint8_t& onMask, uint8_t& offMask)
{
    onMask = 0;
    offMask = 0;
    platform_sync::ScopedLock lock(stateMutex);
    if (!lock.locked()) return false;
    onMask = pendingOn;
    offMask = pendingOff;
    pendingOn = 0;
    pendingOff = 0;
    return onMask != 0 || offMask != 0;
}

bool ThresholdControl::stage()
{
    if (!dirty.takeIfSet()) return false;
    uint8_t bytes[THRESHOLD_EEPROM_SIZE];
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        le32::encode(ruleValues[i].load(), bytes + i * le32::kSize);
    }
    if (!Memory::GetInstance()->stageBytes(THRESHOLD_EEPROM_ADDRESS, bytes, sizeof(bytes))) {
        DEVICE_LOG_ERROR("[Threshold] EEPROM region unavailable; rules not saved");
        return false;
    }
    DEVICE_LOG_DEBUG("[Threshold] Rules staged for EEPROM");
    return true;
}
