#include "ScheduleEngine.h"

#include <string.h>

#include <ArduinoJson.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "PlatformCompat.h"
#include "define_All.h"

namespace {

using schedule::Entry;
using Status = ScheduleEngine::Status;
using Result = ScheduleEngine::Result;

constexpr time_t kMinimumValidEpoch = 1704067200;
constexpr uint8_t kMagic0 = 'S';
constexpr uint8_t kMagic1 = 'C';
constexpr size_t kRegionSize = SCHEDULE_EEPROM_END - SCHEDULE_EEPROM_ADDRESS;
using schedule::kMinutesPerDay;
// One minute produces at most one OFF command plus one ON command per
// distinct auto OFF value, i.e. 9 commands for 8 ports.
constexpr size_t kMaxCommandsPerMinute = 9;
constexpr size_t kCommandQueueDepth = 10;

static_assert(SCHEDULE_RECORD_SIZE == schedule::kRecordSize, "6-byte record size changed");
static_assert(SCHEDULE_META_SIZE == schedule::kMetaSize, "metadata size changed");
static_assert(kCommandQueueDepth >= kMaxCommandsPerMinute, "command queue too small");
static_assert((SCHEDULE_ALLOWED_PORT_MASK & 0xFF) != 0, "no schedulable port");

#define SCHEDULE_STRINGIFY_VALUE(x) #x
#define SCHEDULE_STRINGIFY(x) SCHEDULE_STRINGIFY_VALUE(x)
constexpr const char* kIdRangeMessage = "id must be 1-" SCHEDULE_STRINGIFY(SCHEDULE_MAX_COUNT);

Entry entries[SCHEDULE_MAX_COUNT] = {};
bool dirty = false;
// Only SystemTask touches this; -1 until the clock is valid.
int64_t lastEvaluatedMinute = -1;
// Written only by SystemTask; 32-bit reads are atomic on the lx106.
volatile uint32_t triggered = 0;
volatile uint32_t commandFailures = 0;

#if SUPPORT_RTOS
SemaphoreHandle_t entriesMutex = nullptr;
QueueHandle_t commandQueue = nullptr;

bool createPlatformObjects()
{
    if (entriesMutex == nullptr) entriesMutex = xSemaphoreCreateMutex();
    if (commandQueue == nullptr) {
        commandQueue = xQueueCreate(kCommandQueueDepth, sizeof(DeviceCommand));
    }
    return entriesMutex != nullptr && commandQueue != nullptr;
}

bool platformReady()
{
    return entriesMutex != nullptr && commandQueue != nullptr;
}

size_t commandSpace()
{
    return commandQueue == nullptr ? 0 : uxQueueSpacesAvailable(commandQueue);
}

void pushCommand(const DeviceCommand& command)
{
    xQueueSend(commandQueue, &command, 0);
}

bool popCommand(DeviceCommand& command)
{
    return commandQueue != nullptr && xQueueReceive(commandQueue, &command, 0) == pdTRUE;
}

class EntriesLock {
public:
    EntriesLock()
        : locked_(entriesMutex != nullptr &&
                  xSemaphoreTake(entriesMutex, portMAX_DELAY) == pdTRUE) {}
    ~EntriesLock()
    {
        if (locked_) xSemaphoreGive(entriesMutex);
    }
    bool locked() const { return locked_; }

private:
    bool locked_;
};
#else
// NON-OS core: the MQTT callback, SystemTask and TaskDevice all run from
// loop(), so the table needs no lock and the command queue is a ring buffer.
DeviceCommand commandRing[kCommandQueueDepth];
size_t commandHead = 0;
size_t commandCount = 0;
bool initialized = false;

bool createPlatformObjects()
{
    initialized = true;
    return true;
}

bool platformReady()
{
    return initialized;
}

size_t commandSpace()
{
    return kCommandQueueDepth - commandCount;
}

void pushCommand(const DeviceCommand& command)
{
    if (commandCount == kCommandQueueDepth) return;
    commandRing[(commandHead + commandCount) % kCommandQueueDepth] = command;
    ++commandCount;
}

bool popCommand(DeviceCommand& command)
{
    if (commandCount == 0) return false;
    command = commandRing[commandHead];
    commandHead = (commandHead + 1) % kCommandQueueDepth;
    --commandCount;
    return true;
}

class EntriesLock {
public:
    EntriesLock() {}  // User-provided: used only for scope, like the RTOS lock.
    bool locked() const { return initialized; }
};
#endif

Result makeResult(Status status, const char* message, uint8_t conflictId = 0,
                  uint8_t conflictPorts = 0)
{
    return Result{status, conflictId, conflictPorts, message};
}

bool isValidId(uint8_t id)
{
    return id >= 1 && id <= SCHEDULE_MAX_COUNT;
}

bool clockValid(time_t epoch)
{
    return epoch >= kMinimumValidEpoch;
}

int64_t localMinute(time_t epoch)
{
    return (static_cast<int64_t>(epoch) + SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS) / 60;
}

int64_t occurrenceMinute(const Entry& entry, int64_t day)
{
    return day * kMinutesPerDay + entry.hour * 60 + entry.minute;
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

String describe(uint8_t id, const Entry& entry)
{
    char text[96];
    snprintf(text, sizeof(text), "id=%u %02u:%02u wd=0x%02X mask=0x%02X state=0x%02X auto_off=%u flags=0x%02X day=%u",
             id, entry.hour, entry.minute, entry.weekday, entry.portMask,
             entry.portState, entry.autoOff, entry.flags, entry.day);
    return String(text);
}

// Normalizes and validates a definition received from MQTT.
bool prepareEntry(const Entry& input, Entry& entry, Result& error)
{
    entry = input;
    entry.flags = schedule::kFlagUsed | (input.flags & schedule::kFlagEnabled);
    entry.portState &= entry.portMask;
    if (!schedule::isOnce(entry)) entry.day = 0;

    const schedule::Validation validation =
        schedule::validate(entry, SCHEDULE_ALLOWED_PORT_MASK);
    if (validation != schedule::VALID) {
        error = makeResult(ScheduleEngine::STATUS_INVALID, validationMessage(validation));
        return false;
    }
    const time_t now = time(nullptr);
    if (schedule::isOnce(entry) && clockValid(now) &&
        occurrenceMinute(entry, entry.day) <= localMinute(now)) {
        error = makeResult(ScheduleEngine::STATUS_INVALID, "once schedule date/time is in the past");
        return false;
    }
    return true;
}

// Caller holds the lock. Returns the conflicting id or 0.
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

void encodeRegion(const Entry* source, uint8_t* region)
{
    region[0] = kMagic0;
    region[1] = kMagic1;
    region[2] = SCHEDULE_EEPROM_VERSION;
    region[3] = SCHEDULE_MAX_COUNT;
    for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
        uint8_t* record = region + SCHEDULE_EEPROM_HEADER_SIZE + i * SCHEDULE_RECORD_SIZE;
        uint8_t* meta = region + (SCHEDULE_META_ADDRESS - SCHEDULE_EEPROM_ADDRESS) +
                        i * SCHEDULE_META_SIZE;
        if (schedule::isUsed(source[i])) {
            schedule::encode(schedule::configurationOnly(source[i]), record, meta);
        } else {
            memset(record, 0, SCHEDULE_RECORD_SIZE);
            memset(meta, 0, SCHEDULE_META_SIZE);
        }
    }
}

DeviceCommand makeCommand(uint8_t mask, uint8_t state, uint16_t autoOff)
{
    DeviceCommand command = {};
    command.commandType = COMMAND_TYPE_SCHEDULE_CONTROL;
    command.commandValue = state;
    command.reserved = COMMAND_RESERVED_CONTROL;
    command.portMask = mask;
    command.autoOffSeconds = autoOff;
    return command;
}

size_t buildCommands(const schedule::PortAction& action, DeviceCommand* commands)
{
    size_t count = 0;
    if (action.offMask != 0) commands[count++] = makeCommand(action.offMask, 0, 0);
    uint8_t remaining = action.onMask;
    while (remaining != 0) {
        uint8_t first = 0;
        while ((remaining & (1u << first)) == 0) ++first;
        const uint16_t autoOff = action.autoOff[first];
        uint8_t group = 0;
        for (uint8_t port = first; port < 8; ++port) {
            const uint8_t bit = static_cast<uint8_t>(1u << port);
            if ((remaining & bit) != 0 && action.autoOff[port] == autoOff) group |= bit;
        }
        commands[count++] = makeCommand(group, group, autoOff);
        remaining &= ~group;
    }
    return count;
}

// ONCE schedules whose moment passed before the evaluation window (device off
// or clock not yet valid) are marked done so they never run late.
void expireMissedOnce(int64_t lastMinute)
{
    uint8_t expired[SCHEDULE_MAX_COUNT];
    size_t count = 0;
    {
        EntriesLock lock;
        if (!lock.locked()) return;
        for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
            Entry& entry = entries[i];
            if (schedule::isActive(entry) && schedule::isOnce(entry) &&
                occurrenceMinute(entry, entry.day) <= lastMinute) {
                entry.flags |= schedule::kFlagDone;  // RAM only, no EEPROM write.
                expired[count++] = static_cast<uint8_t>(i + 1);
            }
        }
    }
    for (size_t i = 0; i < count; ++i) {
        DEVICE_LOG_INFO("[Schedule] Once schedule id=" + String(expired[i]) +
                        " missed its time; marked done");
    }
}

// Returns false when the commands could not be queued; the minute is retried.
bool runMinute(int64_t minute)
{
    const int64_t day = minute / kMinutesPerDay;
    const int minuteOfDay = static_cast<int>(minute % kMinutesPerDay);
    const uint8_t hour = static_cast<uint8_t>(minuteOfDay / 60);
    const uint8_t minuteOfHour = static_cast<uint8_t>(minuteOfDay % 60);

    Entry due[SCHEDULE_MAX_COUNT];
    uint8_t dueIds[SCHEDULE_MAX_COUNT];
    size_t dueCount = 0;
    {
        EntriesLock lock;
        if (!lock.locked()) return false;
        for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
            const Entry& entry = entries[i];
            if (!schedule::isActive(entry) || entry.hour != hour ||
                entry.minute != minuteOfHour ||
                !schedule::occursOnDay(entry, static_cast<uint16_t>(day))) {
                continue;
            }
            // Weekly: already ran today (e.g. reboot inside the same minute).
            if (!schedule::isOnce(entry) && entry.day == static_cast<uint16_t>(day)) continue;
            due[dueCount] = entry;
            dueIds[dueCount++] = static_cast<uint8_t>(i + 1);
        }
    }
    if (dueCount == 0) return true;

    const Entry* duePointers[SCHEDULE_MAX_COUNT];
    for (size_t i = 0; i < dueCount; ++i) duePointers[i] = &due[i];
    schedule::PortAction action;
    schedule::mergeDue(duePointers, dueCount, action);

    DeviceCommand commands[kMaxCommandsPerMinute];
    const size_t commandsNeeded = buildCommands(action, commands);
    if (commandsNeeded > 0 && commandSpace() < commandsNeeded) {
        ++commandFailures;
        DEVICE_LOG_WARNING("[Schedule] Device command queue full; retrying");
        return false;
    }
    for (size_t i = 0; i < commandsNeeded; ++i) {
        pushCommand(commands[i]);
    }
    triggered += dueCount;

    {
        EntriesLock lock;
        for (size_t i = 0; i < dueCount && lock.locked(); ++i) {
            Entry& entry = entries[dueIds[i] - 1];
            // Skip a schedule edited by MQTT while this minute was evaluated.
            if (!schedule::isActive(entry) || !schedule::sameDefinition(entry, due[i])) continue;
            // Execution history stays in RAM: no EEPROM write per run.
            if (schedule::isOnce(entry)) entry.flags |= schedule::kFlagDone;
            else entry.day = static_cast<uint16_t>(day);
        }
    }

    for (size_t i = 0; i < dueCount; ++i) {
        DEVICE_LOG_INFO("[Schedule] Run " + describe(dueIds[i], due[i]));
    }
    if (action.conflictMask != 0) {
        DEVICE_LOG_INFO("[Schedule] Conflicting ports skipped: mask=0x" +
                        String(action.conflictMask, HEX));
    }
    for (size_t i = 0; i < commandsNeeded; ++i) {
        DEVICE_LOG_INFO("[Schedule] Command mask=0x" + String(commands[i].portMask, HEX) +
                        " state=0x" + String(commands[i].commandValue, HEX) +
                        " auto_off=" + String(commands[i].autoOffSeconds));
    }
    return true;
}

} // namespace

void ScheduleEngine::setup()
{
    if (!createPlatformObjects()) {
        DEVICE_LOG_ERROR("[Schedule] Cannot create mutex/queue; scheduler disabled");
        return;
    }

    uint8_t region[kRegionSize];
    if (!Memory::GetInstance()->readBytes(SCHEDULE_EEPROM_ADDRESS, region, kRegionSize)) {
        DEVICE_LOG_ERROR("[Schedule] EEPROM region out of range; scheduler disabled");
        return;
    }

    Entry loaded[SCHEDULE_MAX_COUNT] = {};
    bool rewrite = false;
    if (region[0] != kMagic0 || region[1] != kMagic1 ||
        region[2] != SCHEDULE_EEPROM_VERSION || region[3] != SCHEDULE_MAX_COUNT) {
        DEVICE_LOG_INFO("[Schedule] No valid schedule table in EEPROM; formatting region");
        rewrite = true;
    } else {
        for (size_t i = 0; i < SCHEDULE_MAX_COUNT; ++i) {
            const uint8_t* record = region + SCHEDULE_EEPROM_HEADER_SIZE + i * SCHEDULE_RECORD_SIZE;
            const uint8_t* meta = region + (SCHEDULE_META_ADDRESS - SCHEDULE_EEPROM_ADDRESS) +
                                  i * SCHEDULE_META_SIZE;
            Entry entry;
            if (!schedule::decode(record, meta, entry)) {
                DEVICE_LOG_WARNING("[Schedule] CRC error, dropping slot id=" + String(static_cast<unsigned>(i + 1)));
                rewrite = true;
                continue;
            }
            if (!schedule::isUsed(entry)) continue;
            if ((entry.flags & ~schedule::kFlagMask) != 0 ||
                schedule::validate(entry, SCHEDULE_ALLOWED_PORT_MASK) != schedule::VALID) {
                DEVICE_LOG_WARNING("[Schedule] Invalid data, dropping " + describe(static_cast<uint8_t>(i + 1), entry));
                rewrite = true;
                continue;
            }
            loaded[i] = schedule::configurationOnly(entry);
        }
    }

    {
        EntriesLock lock;
        memcpy(entries, loaded, sizeof(entries));
        dirty = rewrite;
    }
    lastEvaluatedMinute = -1;
    DEVICE_LOG_INFO("[Schedule] Loaded " + String(activeCount()) + " active schedule(s), EEPROM " +
                    String(SCHEDULE_EEPROM_ADDRESS) + ".." + String(SCHEDULE_EEPROM_END - 1));
    if (rewrite) flush();
}

Result ScheduleEngine::add(uint8_t id, const Entry& input)
{
    if (!isValidId(id)) return makeResult(STATUS_INVALID, kIdRangeMessage);
    Entry entry;
    Result error;
    if (!prepareEntry(input, entry, error)) return error;

    EntriesLock lock;
    if (!lock.locked()) return makeResult(STATUS_NOT_READY, "scheduler not ready");
    Entry& slot = entries[id - 1];
    if (schedule::isUsed(slot)) {
        // QoS 1 redelivery of the same ADD must not fail or duplicate.
        if (schedule::sameDefinition(slot, entry) &&
            (slot.flags & schedule::kFlagEnabled) == (entry.flags & schedule::kFlagEnabled)) {
            return makeResult(STATUS_SUCCESS, "Schedule already saved");
        }
        return makeResult(STATUS_ID_EXISTS, "id already used; use SCHEDULE_UPDATE");
    }
    uint8_t ports = 0;
    const uint8_t conflictId = findConflict(entry, id - 1, ports);
    if (conflictId != 0) {
        return makeResult(STATUS_CONFLICT, "Schedule conflicts with existing schedule", conflictId, ports);
    }
    slot = entry;
    dirty = true;
    DEVICE_LOG_INFO("[Schedule] Added " + describe(id, entry));
    return makeResult(STATUS_SUCCESS, "Schedule saved successfully");
}

Result ScheduleEngine::update(uint8_t id, const Entry& input)
{
    if (!isValidId(id)) return makeResult(STATUS_INVALID, kIdRangeMessage);
    Entry entry;
    Result error;
    if (!prepareEntry(input, entry, error)) return error;

    EntriesLock lock;
    if (!lock.locked()) return makeResult(STATUS_NOT_READY, "scheduler not ready");
    Entry& slot = entries[id - 1];
    if (!schedule::isUsed(slot)) return makeResult(STATUS_NOT_FOUND, "Schedule not found");
    if (schedule::sameDefinition(slot, entry) && slot.flags == entry.flags) {
        return makeResult(STATUS_SUCCESS, "Schedule unchanged");
    }
    // Keep the weekly last-run day while the time of day is unchanged, so an
    // edit does not make an already executed schedule run again today.
    if (!schedule::isOnce(entry) && !schedule::isOnce(slot) &&
        slot.hour == entry.hour && slot.minute == entry.minute) {
        entry.day = slot.day;
    }
    uint8_t ports = 0;
    const uint8_t conflictId = findConflict(entry, id - 1, ports);
    if (conflictId != 0) {
        return makeResult(STATUS_CONFLICT, "Schedule conflicts with existing schedule", conflictId, ports);
    }
    slot = entry;
    dirty = true;
    DEVICE_LOG_INFO("[Schedule] Updated " + describe(id, entry));
    return makeResult(STATUS_SUCCESS, "Schedule updated successfully");
}

Result ScheduleEngine::remove(uint8_t id)
{
    if (!isValidId(id)) return makeResult(STATUS_INVALID, kIdRangeMessage);
    EntriesLock lock;
    if (!lock.locked()) return makeResult(STATUS_NOT_READY, "scheduler not ready");
    if (!schedule::isUsed(entries[id - 1])) return makeResult(STATUS_SUCCESS, "Schedule already deleted");
    entries[id - 1] = {};
    dirty = true;
    DEVICE_LOG_INFO("[Schedule] Deleted id=" + String(id));
    return makeResult(STATUS_SUCCESS, "Schedule deleted");
}

Result ScheduleEngine::setEnabled(uint8_t id, bool enabled)
{
    if (!isValidId(id)) return makeResult(STATUS_INVALID, kIdRangeMessage);
    EntriesLock lock;
    if (!lock.locked()) return makeResult(STATUS_NOT_READY, "scheduler not ready");
    Entry& slot = entries[id - 1];
    if (!schedule::isUsed(slot)) return makeResult(STATUS_NOT_FOUND, "Schedule not found");

    if (!enabled) {
        if ((slot.flags & schedule::kFlagEnabled) != 0) {
            slot.flags &= ~schedule::kFlagEnabled;
            dirty = true;
            DEVICE_LOG_INFO("[Schedule] Disabled id=" + String(id));
        }
        return makeResult(STATUS_SUCCESS, "Schedule disabled");
    }
    if ((slot.flags & schedule::kFlagDone) != 0) {
        return makeResult(STATUS_INVALID, "once schedule already completed; send SCHEDULE_UPDATE with a new date");
    }
    if ((slot.flags & schedule::kFlagEnabled) != 0) return makeResult(STATUS_SUCCESS, "Schedule enabled");

    Entry candidate = slot;
    candidate.flags |= schedule::kFlagEnabled;
    uint8_t ports = 0;
    const uint8_t conflictId = findConflict(candidate, id - 1, ports);
    if (conflictId != 0) {
        return makeResult(STATUS_CONFLICT, "Schedule conflicts with existing schedule", conflictId, ports);
    }
    slot = candidate;
    dirty = true;
    DEVICE_LOG_INFO("[Schedule] Enabled id=" + String(id));
    return makeResult(STATUS_SUCCESS, "Schedule enabled");
}

Result ScheduleEngine::clear()
{
    EntriesLock lock;
    if (!lock.locked()) return makeResult(STATUS_NOT_READY, "scheduler not ready");
    memset(entries, 0, sizeof(entries));
    dirty = true;
    DEVICE_LOG_INFO("[Schedule] Cleared all schedules");
    return makeResult(STATUS_SUCCESS, "All schedules cleared");
}

void ScheduleEngine::process(time_t epoch)
{
    // Without a valid RTC/NTP time nothing runs; millis() is never used.
    if (!clockValid(epoch) || !platformReady()) return;

    const int64_t now = localMinute(epoch);
    if (lastEvaluatedMinute < 0 || now < lastEvaluatedMinute) {
        // First valid time after boot, or the clock moved back: evaluate the
        // current minute only. Weekly last-run days prevent a second run.
        lastEvaluatedMinute = now - 1;
    } else if (now - lastEvaluatedMinute > SCHEDULE_CATCHUP_MINUTES) {
        DEVICE_LOG_INFO("[Schedule] Scheduler delayed " + String(static_cast<long>(now - lastEvaluatedMinute)) +
                        " min; older minutes skipped");
        lastEvaluatedMinute = now - SCHEDULE_CATCHUP_MINUTES;
    }

    expireMissedOnce(lastEvaluatedMinute);
    while (lastEvaluatedMinute < now) {
        if (!runMinute(lastEvaluatedMinute + 1)) break;
        ++lastEvaluatedMinute;
    }
}

void ScheduleEngine::flush()
{
    Entry snapshot[SCHEDULE_MAX_COUNT];
    {
        EntriesLock lock;
        if (!lock.locked() || !dirty) return;
        memcpy(snapshot, entries, sizeof(snapshot));
        dirty = false;
    }
    uint8_t region[kRegionSize];
    encodeRegion(snapshot, region);
    if (!Memory::GetInstance()->writeBytes(SCHEDULE_EEPROM_ADDRESS, region, kRegionSize)) {
        EntriesLock lock;
        dirty = true;
        DEVICE_LOG_ERROR("[Schedule] EEPROM commit failed; will retry");
        return;
    }
    DEVICE_LOG_DEBUG("[Schedule] Schedule table saved to EEPROM");
}

bool ScheduleEngine::receiveDeviceCommand(DeviceCommand& command)
{
    return popCommand(command);
}

void ScheduleEngine::addSettings(JsonArray settings)
{
    Entry snapshot[SCHEDULE_MAX_COUNT];
    {
        EntriesLock lock;
        if (!lock.locked()) return;
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
    uint8_t count = 0;
    EntriesLock lock;
    if (!lock.locked()) return 0;
    for (const Entry& entry : entries) count += schedule::isActive(entry) ? 1 : 0;
    return count;
}

uint32_t ScheduleEngine::triggeredCount()
{
    return triggered;
}

uint32_t ScheduleEngine::commandFailureCount()
{
    return commandFailures;
}

// Compact rows and paging keep the reply below MQTT_PAYLOAD_SIZE.
String ScheduleEngine::listJson(uint8_t firstId)
{
    if (firstId < 1) firstId = 1;
    Entry snapshot[SCHEDULE_MAX_COUNT];
    {
        EntriesLock lock;
        if (!lock.locked()) return String();
        memcpy(snapshot, entries, sizeof(snapshot));
    }

    DynamicJsonDocument document(3072);
    // Rows: id,ho,mi,we,po,pos,au,en,dn,date (dn = once schedule done).
    document["rc"] = COMMAND_TYPE_SCHEDULE_LIST;
    document["rs"] = 0;  // Every reply carries "rs" (0 = success).
    document["mx"] = SCHEDULE_MAX_COUNT;
    document["cv"] = clockValid(time(nullptr)) ? 1 : 0;
    document["nx"] = 0;
    JsonArray items = document.createNestedArray("it");
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
        JsonArray row = items.createNestedArray();
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

const char* ScheduleEngine::statusName(Status status)
{
    switch (status) {
        case STATUS_SUCCESS: return "SUCCESS";
        case STATUS_CONFLICT: return "CONFLICT";
        case STATUS_INVALID: return "INVALID";
        case STATUS_NOT_FOUND: return "NOT_FOUND";
        case STATUS_ID_EXISTS: return "ID_EXISTS";
        case STATUS_NOT_READY: return "NOT_READY";
        default: return "ERROR";
    }
}
