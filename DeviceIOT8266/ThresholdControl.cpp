#include "ThresholdControl.h"

#include <Arduino.h>

#include "Common.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "OnTimer.h"
#include "PlatformCompat.h"
#include "define_All.h"

static_assert(THRESHOLD_EEPROM_SIZE == threshold::kRuleCount * on_timer::kStorageSize, "2 x 4-byte rules");

namespace {
// Written by TaskNetwork (MQTT callback), read by SystemTask (flush); aligned
// 32-bit and bool accesses are atomic on the lx106.
volatile uint32_t ruleValues[threshold::kRuleCount] = {};
volatile bool dirty = false;
// TaskNetwork only: set() and evaluate() run in loopNetWork().
threshold::EdgeTracker edges;
// Rising edges waiting for TaskDevice.
uint8_t pendingOn = 0;
uint8_t pendingOff = 0;

#if SUPPORT_RTOS
SemaphoreHandle_t pendingMutex = nullptr;

class PendingLock {
public:
    PendingLock()
        : locked_(pendingMutex != nullptr && xSemaphoreTake(pendingMutex, portMAX_DELAY) == pdTRUE) {}
    ~PendingLock() {
        if (locked_) xSemaphoreGive(pendingMutex);
    }
    bool locked() const { return locked_; }

private:
    bool locked_;
};
#else
// NON-OS core: the network loop and TaskDevice both run from loop().
class PendingLock {
public:
    bool locked() const { return true; }
};
#endif

// Sensor N = the N-th value of "va": humidity x100, temperature x100, ADC.
bool reading(const InfoSensor& sensors, uint8_t sensor, int32_t& value) {
    switch (sensor) {
        case 1: value = sensors.valueHumi; return sensors.dhtValid;
        case 2: value = sensors.valueTemp; return sensors.dhtValid;
        case 3: value = sensors.valueAdc; return true;
        default: return false;
    }
}
} // namespace

void ThresholdControl::setup() {
#if SUPPORT_RTOS
    if (pendingMutex == nullptr) pendingMutex = xSemaphoreCreateMutex();
    if (pendingMutex == nullptr) {
        DEVICE_LOG_ERROR("[Threshold] Cannot create mutex; threshold control disabled");
    }
#endif
    uint8_t bytes[THRESHOLD_EEPROM_SIZE];
    const bool read = Memory::GetInstance()->readBytes(THRESHOLD_EEPROM_ADDRESS, bytes, static_cast<int>(sizeof(bytes)));
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        uint32_t value = read ? on_timer::decode(bytes + i * on_timer::kStorageSize) : 0;
        // Blank (0xFFFFFFFF) or corrupt bytes: empty rule, rewritten only on a change.
        if (!threshold::isValid(value, THRESHOLD_SENSOR_COUNT, SCHEDULE_ALLOWED_PORT_MASK)) value = 0;
        ruleValues[i] = value;
        edges.reset(i);
    }
    dirty = false;
    DEVICE_LOG_INFO(String("[Threshold] Rules 0x") + String(ruleValues[0], HEX) + " 0x" +
                    String(ruleValues[1], HEX) + ", EEPROM " + THRESHOLD_EEPROM_ADDRESS + ".." +
                    (THRESHOLD_EEPROM_END - 1));
}

bool ThresholdControl::set(uint8_t id, uint32_t value) {
    if (id < 1 || id > threshold::kRuleCount ||
        !threshold::isValid(value, THRESHOLD_SENSOR_COUNT, SCHEDULE_ALLOWED_PORT_MASK)) {
        return false;
    }
    // A new rule acts on the next sample if its condition already holds.
    edges.reset(id - 1);
    if (ruleValues[id - 1] != value) {
        // Value before flag, so flush() never saves an older value and clears it.
        ruleValues[id - 1] = value;
        dirty = true;
    }
    return true;
}

uint32_t ThresholdControl::value(uint8_t id) {
    return id >= 1 && id <= threshold::kRuleCount ? ruleValues[id - 1] : 0;
}

void ThresholdControl::evaluate(const InfoSensor& sensors) {
    threshold::Rule rules[threshold::kRuleCount];
    bool readable[threshold::kRuleCount];
    int32_t readings[threshold::kRuleCount];
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        rules[i] = threshold::decode(ruleValues[i]);
        readable[i] = reading(sensors, rules[i].sensor, readings[i]);
    }
    const threshold::Actions actions = edges.update(rules, readable, readings);
    if (actions.onMask == 0 && actions.offMask == 0) {
        return;
    }
    {
        PendingLock lock;
        if (!lock.locked()) return;
        // The newest action of a port replaces an older one not yet applied.
        pendingOn = static_cast<uint8_t>((pendingOn & ~actions.offMask) | actions.onMask);
        pendingOff = static_cast<uint8_t>((pendingOff & ~actions.onMask) | actions.offMask);
    }
    DEVICE_LOG_INFO(String("[Threshold] on=0x") + String(actions.onMask, HEX) +
                    " off=0x" + String(actions.offMask, HEX));
}

bool ThresholdControl::takeActions(uint8_t& onMask, uint8_t& offMask) {
    PendingLock lock;
    if (!lock.locked()) {
        onMask = 0;
        offMask = 0;
        return false;
    }
    onMask = pendingOn;
    offMask = pendingOff;
    pendingOn = 0;
    pendingOff = 0;
    return onMask != 0 || offMask != 0;
}

void ThresholdControl::flush() {
    if (!dirty) return;
    dirty = false;
    uint8_t bytes[THRESHOLD_EEPROM_SIZE];
    for (uint8_t i = 0; i < threshold::kRuleCount; ++i) {
        on_timer::encode(ruleValues[i], bytes + i * on_timer::kStorageSize);
    }
    if (!Memory::GetInstance()->writeBytes(THRESHOLD_EEPROM_ADDRESS, bytes, static_cast<int>(sizeof(bytes)))) {
        dirty = true;
        DEVICE_LOG_ERROR("[Threshold] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG("[Threshold] Rules saved to EEPROM");
}
