// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "ScheduleEngine.h"

#include <string.h>

#include "Clock.h"
#include "DebugInfo.h"
#include "Memory.h"
#include "Sync.h"
#include "define_All.h"

#if defined(ESP32)
#include <esp_attr.h>
#endif

namespace {

using schedule::Entry;

constexpr size_t kCommandQueueDepth = 10;

static_assert(kCommandQueueDepth >= schedule::kMaxCommandsPerMinute, "command queue too small");
static_assert((AUTOMATION_PORT_MASK & 0xFF) != 0, "no schedulable port");

#define SCHEDULE_STRINGIFY_VALUE(x) #x
#define SCHEDULE_STRINGIFY(x) SCHEDULE_STRINGIFY_VALUE(x)
constexpr const char* kIdRangeMessage = "id must be 1-" SCHEDULE_STRINGIFY(SCHEDULE_MAX_COUNT);

// entries and dirty: edited by the network task, evaluated and saved by
// SystemTask. Hold entriesMutex.
platform_sync::Mutex entriesMutex;
Entry entries[SCHEDULE_MAX_COUNT] = {};
bool dirty = false;

// SystemTask -> TaskDevice.
platform_sync::Queue<DeviceCommand, kCommandQueueDepth> commandQueue;
// Set once by setup(), before any task runs.
bool ready = false;

// SystemTask only; -1 until the clock is valid.
int64_t lastEvaluatedMinute = -1;

// The last evaluated minute survives a software restart (watchdog, panic,
// restart command) in RTC memory, so a restart inside the minute a schedule
// ran does not run it again. After a power-on the RTC memory is invalid and
// the current minute is evaluated.
struct PersistedMinute {
    uint32_t magic;
    uint32_t low;
    uint32_t high;
    uint32_t check;
};
constexpr uint32_t kPersistedMagic = 0x53434D31;  // "SCM1"

uint32_t persistedCheck(const PersistedMinute& value)
{
    return value.magic ^ value.low ^ ~value.high ^ 0xA5A5A5A5UL;
}

#if defined(ESP32)
RTC_NOINIT_ATTR PersistedMinute rtcMinute;
#elif defined(ESP8266) && ESP8266_NONOS_CORE
// RTC user memory block (4 bytes each); blocks 0..31 hold the OTA (eboot) command.
constexpr uint32_t kRtcMinuteBlock = 96;
#endif

void savePersistedMinute(int64_t minute)
{
    PersistedMinute value = {kPersistedMagic, static_cast<uint32_t>(static_cast<uint64_t>(minute)),
                             static_cast<uint32_t>(static_cast<uint64_t>(minute) >> 32), 0};
    value.check = persistedCheck(value);
#if defined(ESP32)
    rtcMinute = value;
#elif defined(ESP8266) && ESP8266_NONOS_CORE
    (void)ESP.rtcUserMemoryWrite(kRtcMinuteBlock, reinterpret_cast<uint32_t*>(&value), sizeof(value));
#else
    (void)value;
#endif
}

// -1 when nothing valid was saved.
int64_t loadPersistedMinute()
{
    PersistedMinute value = {};
#if defined(ESP32)
    value = rtcMinute;
#elif defined(ESP8266) && ESP8266_NONOS_CORE
    if (!ESP.rtcUserMemoryRead(kRtcMinuteBlock, reinterpret_cast<uint32_t*>(&value), sizeof(value))) return -1;
#endif
    if (value.magic != kPersistedMagic || value.check != persistedCheck(value)) return -1;
    const int64_t minute = static_cast<int64_t>((static_cast<uint64_t>(value.high) << 32) | value.low);
    return minute >= 0 ? minute : -1;
}
platform_sync::AtomicU32 triggered;
platform_sync::AtomicU32 commandFailures;

struct Due {
    Entry entries[SCHEDULE_MAX_COUNT];
    uint8_t ids[SCHEDULE_MAX_COUNT];
    size_t count;
};

bool isValidId(uint8_t id)
{
    return id >= 1 && id <= SCHEDULE_MAX_COUNT;
}

int64_t localMinute(time_t epoch)
{
    return (static_cast<int64_t>(epoch) + SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS) / 60;
}

CommandResult conflict(uint8_t conflictId, uint8_t ports)
{
    return {CommandStatus::Conflict, conflictId, ports, "Schedule conflicts with existing schedule"};
}

CommandResult notReady()
{
    return CommandResult::make(CommandStatus::NotReady, "scheduler not ready");
}

const char* validationMessage(schedule::Validation validation)
{
    switch (validation) {
        case schedule::INVALID_TIME: return "hour must be 0-23 and minute 0-59";
        case schedule::INVALID_WEEKDAY: return "weekday must be 0-127";
        case schedule::INVALID_PORT_MASK: return "port_mask is empty or contains ports not allowed for schedules";
        case schedule::INVALID_DATE: return "once schedule (weekday 0) needs a valid year/month/day";
        default: return "invalid schedule";
    }
}

void logEntry(const char* event, uint8_t id, const Entry& entry)
{
    (void)event;  // Unused when INFO logging is compiled out.
    (void)id;
    (void)entry;
    DEVICE_LOGF_INFO("[Schedule] %s id=%u %02u:%02u wd=0x%02X mask=0x%02X state=0x%02X auto_off=%u day=%u\n", event,
                     id, entry.hour, entry.minute, entry.weekday, entry.portMask, entry.portState, entry.autoOff,
                     entry.day);
}

// Normalizes and validates a definition received from MQTT.
bool prepareEntry(const Entry& input, Entry& entry, CommandResult& error)
{
    entry = input;
    entry.flags = schedule::kFlagUsed | (input.flags & schedule::kFlagEnabled);
    entry.portState &= entry.portMask;
    if (!schedule::isOnce(entry)) entry.day = 0;

    const schedule::Validation validation = schedule::validate(entry, AUTOMATION_PORT_MASK);
    if (validation != schedule::VALID) {
        error = CommandResult::invalid(validationMessage(validation));
        return false;
    }
    const time_t now = time(nullptr);
    if (schedule::isOnce(entry) && device_clock::isValid(now) &&
        schedule::occurrenceMinute(entry, entry.day) <= localMinute(now)) {
        error = CommandResult::invalid("once schedule date/time is in the past");
        return false;
    }
    return true;
}

// Caller holds entriesMutex. Returns the conflicting id or 0.
uint8_t findConflict(const Entry& candidate, size_t ignoreIndex, uint8_t& ports)
{
    ports = 0;
    if (!schedule::isActive(candidate)) return 0;
    for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
        if (i == ignoreIndex || !schedule::isActive(entries[i])) continue;
        ports = schedule::conflictingPorts(candidate, entries[i]);
        if (ports != 0) return static_cast<uint8_t>(i + 1);
    }
    return 0;
}

// ONCE schedules whose moment passed before the evaluation window are marked
// done (RAM only) so they never run late.
void expireMissedOnce(int64_t lastMinute)
{
    uint8_t expired[SCHEDULE_MAX_COUNT];
    size_t count = 0;
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!lock.locked()) return;
        for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
            if (!schedule::missedOnce(entries[i], lastMinute)) continue;
            entries[i].flags |= schedule::kFlagDone;
            expired[count++] = static_cast<uint8_t>(i + 1);
        }
    }
    (void)expired;  // Only read when INFO logging is compiled in.
    for (size_t i = 0; i < count; ++i) {
        DEVICE_LOGF_INFO("[Schedule] Once schedule id=%u missed its time; marked done\n", expired[i]);
    }
}

bool collectDue(int64_t minute, Due& due)
{
    due.count = 0;
    platform_sync::ScopedLock lock(entriesMutex);
    if (!lock.locked()) return false;
    for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
        if (!schedule::shouldRun(entries[i], minute)) continue;
        due.entries[due.count] = entries[i];
        due.ids[due.count++] = static_cast<uint8_t>(i + 1);
    }
    return true;
}

DeviceCommand toDeviceCommand(const schedule::Command& command)
{
    DeviceCommand deviceCommand = {};
    deviceCommand.commandType = COMMAND_TYPE_INTERNAL_SCHEDULE;
    deviceCommand.commandValue = command.state;
    deviceCommand.reserved = COMMAND_RESERVED_CONTROL;
    deviceCommand.portMask = command.mask;
    deviceCommand.autoOffSeconds = command.autoOff;
    return deviceCommand;
}

// All commands of a minute or none, so a retry never applies half a minute.
bool queueCommands(const schedule::Command* commands, size_t count)
{
    if (count == 0) return true;
    if (kCommandQueueDepth - commandQueue.size() < count) return false;
    for (size_t i = 0; i < count; ++i) {
        if (!commandQueue.push(toDeviceCommand(commands[i]))) return false;
    }
    return true;
}

// Skips a schedule edited by the network task while its minute was evaluated.
void markExecuted(const Due& due, int64_t minute)
{
    platform_sync::ScopedLock lock(entriesMutex);
    if (!lock.locked()) return;
    for (size_t i = 0; i < due.count; ++i) {
        Entry& entry = entries[due.ids[i] - 1];
        if (!schedule::isActive(entry) || !schedule::sameDefinition(entry, due.entries[i])) continue;
        schedule::markRun(entry, minute);
    }
}

void logRun(const Due& due, const schedule::PortAction& action, const schedule::Command* commands, size_t count)
{
    for (size_t i = 0; i < due.count; ++i) logEntry("Run", due.ids[i], due.entries[i]);
    if (action.conflictMask != 0) {
        DEVICE_LOGF_WARNING("[Schedule] Conflicting ports skipped: mask=0x%02X\n", action.conflictMask);
    }
    (void)commands;  // Only read when DEBUG logging is compiled in.
    for (size_t i = 0; i < count; ++i) {
        DEVICE_LOGF_DEBUG("[Schedule] Command mask=0x%02X state=0x%02X auto_off=%u\n", commands[i].mask,
                          commands[i].state, commands[i].autoOff);
    }
}

// Returns false when the commands could not be queued; the minute is retried.
bool runMinute(int64_t minute)
{
    Due due;
    if (!collectDue(minute, due)) return false;
    if (due.count == 0) return true;

    const Entry* duePointers[SCHEDULE_MAX_COUNT];
    for (size_t i = 0; i < due.count; ++i) duePointers[i] = &due.entries[i];
    schedule::PortAction action;
    schedule::mergeDue(duePointers, due.count, action);

    schedule::Command commands[schedule::kMaxCommandsPerMinute];
    const size_t count = schedule::buildCommands(action, commands);
    if (!queueCommands(commands, count)) {
        commandFailures.fetchAdd(1);
        DEVICE_LOG_WARNING("[Schedule] Device command queue full; retrying");
        return false;
    }
    triggered.fetchAdd(static_cast<uint32_t>(due.count));
    markExecuted(due, minute);
    logRun(due, action, commands, count);
    return true;
}

// Reads and decodes the EEPROM region into loaded. false: region unreadable.
bool loadRegion(Entry* loaded, bool& rewrite)
{
    uint8_t region[schedule::kRegionSize];
    if (!Memory::GetInstance()->readBytes(SCHEDULE_EEPROM_ADDRESS, region, sizeof(region))) return false;
    const schedule::RegionLoad load = schedule::decodeRegion(region, AUTOMATION_PORT_MASK, loaded);
    if (!load.headerValid) DEVICE_LOG_WARNING("[Schedule] No valid schedule table in EEPROM; formatting region");
    for (size_t i = 0; i < schedule::kSlotCount; ++i) {
        if (load.slots[i] == schedule::SlotLoad::CrcError) {
            DEVICE_LOGF_WARNING("[Schedule] CRC error, dropping slot id=%u\n", static_cast<unsigned>(i + 1));
        } else if (load.slots[i] == schedule::SlotLoad::InvalidData) {
            DEVICE_LOGF_WARNING("[Schedule] Invalid data, dropping slot id=%u\n", static_cast<unsigned>(i + 1));
        }
    }
    rewrite = load.needsRewrite;
    return true;
}

}  // namespace

void ScheduleEngine::setup()
{
    if (!entriesMutex.create() || !commandQueue.create()) {
        DEVICE_LOG_ERROR("[Schedule] Cannot create mutex/queue; scheduler disabled");
        return;
    }
    Entry loaded[SCHEDULE_MAX_COUNT];
    bool rewrite = false;
    if (!loadRegion(loaded, rewrite)) {
        DEVICE_LOG_ERROR("[Schedule] EEPROM region out of range; scheduler disabled");
        return;
    }
    {
        platform_sync::ScopedLock lock(entriesMutex);
        memcpy(entries, loaded, sizeof(entries));
        dirty = rewrite;
    }
    lastEvaluatedMinute = -1;
    ready = true;
    DEVICE_LOGF_INFO("[Schedule] Loaded %u active schedule(s), EEPROM %d..%d\n", activeCount(),
                     SCHEDULE_EEPROM_ADDRESS, SCHEDULE_EEPROM_END - 1);
    if (rewrite && stage()) (void)Memory::GetInstance()->commitPending();
}

CommandResult ScheduleEngine::add(uint8_t id, const Entry& input)
{
    if (!isValidId(id)) return CommandResult::invalid(kIdRangeMessage);
    Entry entry;
    CommandResult error = CommandResult::ok();
    if (!prepareEntry(input, entry, error)) return error;

    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return notReady();
        Entry& slot = entries[id - 1];
        if (schedule::isUsed(slot)) {
            // QoS 1 redelivery of the same ADD must not fail or duplicate.
            if (schedule::sameDefinition(slot, entry) &&
                (slot.flags & schedule::kFlagEnabled) == (entry.flags & schedule::kFlagEnabled)) {
                return CommandResult::make(CommandStatus::Ok, "Schedule already saved");
            }
            return CommandResult::make(CommandStatus::IdExists, "id already used; use SCHEDULE_UPDATE");
        }
        uint8_t ports = 0;
        const uint8_t conflictId = findConflict(entry, id - 1, ports);
        if (conflictId != 0) return conflict(conflictId, ports);
        slot = entry;
        dirty = true;
    }
    logEntry("Added", id, entry);
    return CommandResult::make(CommandStatus::Ok, "Schedule saved successfully");
}

CommandResult ScheduleEngine::update(uint8_t id, const Entry& input)
{
    if (!isValidId(id)) return CommandResult::invalid(kIdRangeMessage);
    Entry entry;
    CommandResult error = CommandResult::ok();
    if (!prepareEntry(input, entry, error)) return error;

    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return notReady();
        Entry& slot = entries[id - 1];
        if (!schedule::isUsed(slot)) return CommandResult::make(CommandStatus::NotFound, "Schedule not found");
        if (schedule::sameDefinition(slot, entry) && slot.flags == entry.flags) {
            return CommandResult::make(CommandStatus::Ok, "Schedule unchanged");
        }
        schedule::keepLastRunDay(slot, entry);
        uint8_t ports = 0;
        const uint8_t conflictId = findConflict(entry, id - 1, ports);
        if (conflictId != 0) return conflict(conflictId, ports);
        slot = entry;
        dirty = true;
    }
    logEntry("Updated", id, entry);
    return CommandResult::make(CommandStatus::Ok, "Schedule updated successfully");
}

CommandResult ScheduleEngine::remove(uint8_t id)
{
    if (!isValidId(id)) return CommandResult::invalid(kIdRangeMessage);
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return notReady();
        if (!schedule::isUsed(entries[id - 1])) {
            return CommandResult::make(CommandStatus::Ok, "Schedule already deleted");
        }
        entries[id - 1] = {};
        dirty = true;
    }
    DEVICE_LOGF_INFO("[Schedule] Deleted id=%u\n", id);
    return CommandResult::make(CommandStatus::Ok, "Schedule deleted");
}

CommandResult ScheduleEngine::setEnabled(uint8_t id, bool enabled)
{
    if (!isValidId(id)) return CommandResult::invalid(kIdRangeMessage);
    bool changed = false;
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return notReady();
        Entry& slot = entries[id - 1];
        if (!schedule::isUsed(slot)) return CommandResult::make(CommandStatus::NotFound, "Schedule not found");

        if (!enabled) {
            if ((slot.flags & schedule::kFlagEnabled) != 0) {
                slot.flags &= static_cast<uint8_t>(~schedule::kFlagEnabled);
                dirty = true;
                changed = true;
            }
        } else {
            if ((slot.flags & schedule::kFlagDone) != 0) {
                return CommandResult::invalid("once schedule already completed; send SCHEDULE_UPDATE with a new date");
            }
            if ((slot.flags & schedule::kFlagEnabled) == 0) {
                Entry candidate = slot;
                candidate.flags |= schedule::kFlagEnabled;
                uint8_t ports = 0;
                const uint8_t conflictId = findConflict(candidate, id - 1, ports);
                if (conflictId != 0) return conflict(conflictId, ports);
                slot = candidate;
                dirty = true;
                changed = true;
            }
        }
    }
    if (changed) DEVICE_LOGF_INFO("[Schedule] %s id=%u\n", enabled ? "Enabled" : "Disabled", id);
    return CommandResult::make(CommandStatus::Ok, enabled ? "Schedule enabled" : "Schedule disabled");
}

CommandResult ScheduleEngine::clear()
{
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return notReady();
        memset(entries, 0, sizeof(entries));
        dirty = true;
    }
    DEVICE_LOG_INFO("[Schedule] Cleared all schedules");
    return CommandResult::make(CommandStatus::Ok, "All schedules cleared");
}

void ScheduleEngine::process(time_t epoch)
{
    // Without a valid RTC/NTP time nothing runs; millis() is never used.
    if (!ready || !device_clock::isValid(epoch)) return;

    const int64_t now = localMinute(epoch);
    if (lastEvaluatedMinute < 0) lastEvaluatedMinute = loadPersistedMinute();
    const schedule::CatchUp window = schedule::catchUpWindow(lastEvaluatedMinute, now, SCHEDULE_CATCHUP_MINUTES);
    if (window.skippedMinutes > 0) {
        DEVICE_LOGF_WARNING("[Schedule] Scheduler delayed %ld min; older minutes skipped\n",
                            static_cast<long>(now - lastEvaluatedMinute));
    }
    lastEvaluatedMinute = window.lastEvaluatedMinute;

    expireMissedOnce(lastEvaluatedMinute);
    while (lastEvaluatedMinute < now) {
        if (!runMinute(lastEvaluatedMinute + 1)) break;
        ++lastEvaluatedMinute;
    }
    savePersistedMinute(lastEvaluatedMinute);
}

bool ScheduleEngine::stage()
{
    Entry snapshot[SCHEDULE_MAX_COUNT];
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked() || !dirty) return false;
        memcpy(snapshot, entries, sizeof(snapshot));
        dirty = false;
    }
    uint8_t region[schedule::kRegionSize];
    schedule::encodeRegion(snapshot, region);
    if (!Memory::GetInstance()->stageBytes(SCHEDULE_EEPROM_ADDRESS, region, sizeof(region))) {
        DEVICE_LOG_ERROR("[Schedule] EEPROM region unavailable; schedule table not saved");
        return false;
    }
    DEVICE_LOG_DEBUG("[Schedule] Schedule table staged for EEPROM");
    return true;
}

bool ScheduleEngine::receiveDeviceCommand(DeviceCommand& command)
{
    return ready && commandQueue.pop(command);
}

void ScheduleEngine::addSettings(JsonArray settings)
{
    Entry snapshot[SCHEDULE_MAX_COUNT];
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return;
        memcpy(snapshot, entries, sizeof(snapshot));
    }
    uint8_t order[SCHEDULE_MAX_COUNT];
    const size_t count = schedule::activeByTime(snapshot, SCHEDULE_MAX_COUNT, order);
    for (size_t i = 0; i < count; ++i) {
        char text[24];
        schedule::formatSetting(snapshot[order[i]], text, sizeof(text));
        settings.add(static_cast<char*>(text));  // char* is copied by ArduinoJson.
    }
}

uint8_t ScheduleEngine::activeCount()
{
    platform_sync::ScopedLock lock(entriesMutex);
    if (!ready || !lock.locked()) return 0;
    uint8_t count = 0;
    for (const Entry& entry : entries) count += schedule::isActive(entry) ? 1 : 0;
    return count;
}

uint32_t ScheduleEngine::triggeredCount()
{
    return triggered.load();
}

uint32_t ScheduleEngine::commandFailureCount()
{
    return commandFailures.load();
}

// Compact rows and paging keep the reply below MQTT_PAYLOAD_SIZE.
String ScheduleEngine::listJson(uint8_t firstId)
{
    if (firstId < 1) firstId = 1;
    Entry snapshot[SCHEDULE_MAX_COUNT];
    {
        platform_sync::ScopedLock lock(entriesMutex);
        if (!ready || !lock.locked()) return String();
        memcpy(snapshot, entries, sizeof(snapshot));
    }

    JsonDocument document;
    document["rc"] = COMMAND_TYPE_SCHEDULE_LIST;
    document["rs"] = toWire(CommandStatus::Ok);
    document["mx"] = SCHEDULE_MAX_COUNT;
    document["cv"] = device_clock::isValidNow() ? 1 : 0;
    document["nx"] = 0;
    // Rows: id,ho,mi,we,po,pos,au,en,dn,date (dn = once schedule done).
    JsonArray items = document["it"].to<JsonArray>();
    uint8_t rows = 0;
    for (size_t i = firstId - 1; i < SCHEDULE_MAX_COUNT; ++i) {
        const Entry& entry = snapshot[i];
        if (!schedule::isUsed(entry)) continue;
        if (rows == kListPageSize) {
            document["nx"] = i + 1;
            break;
        }
        ++rows;
        // ONCE: run date. WEEKLY: last run date ("" = never).
        char date[11] = "";
        if (entry.day != 0) {
            int32_t year;
            uint32_t month;
            uint32_t dayOfMonth;
            schedule::civilFromDays(entry.day, year, month, dayOfMonth);
            snprintf(date, sizeof(date), "%04ld-%02lu-%02lu", static_cast<long>(year),
                     static_cast<unsigned long>(month), static_cast<unsigned long>(dayOfMonth));
        }
        JsonArray row = items.add<JsonArray>();
        row.add(i + 1);
        row.add(entry.hour);
        row.add(entry.minute);
        row.add(entry.weekday);
        row.add(entry.portMask);
        row.add(entry.portState);
        row.add(entry.autoOff);
        row.add((entry.flags & schedule::kFlagEnabled) != 0 ? 1 : 0);
        row.add((entry.flags & schedule::kFlagDone) != 0 ? 1 : 0);
        row.add(static_cast<char*>(date));  // char* is copied by ArduinoJson.
    }
    if (document.overflowed()) return String();
    String payload;
    serializeJson(document, payload);
    return payload;
}
