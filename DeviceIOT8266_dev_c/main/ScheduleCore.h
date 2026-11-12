#pragma once

// Pure schedule logic (no Arduino/EEPROM access) so it can be unit tested on a
// host compiler: tests/core_logic_test.cpp. ScheduleEngine.cpp adds the
// locking, the EEPROM I/O and the device command queue.
//
// EEPROM region (eeprom_layout.h): 4-byte header, then SCHEDULE_MAX_COUNT
// records, then SCHEDULE_MAX_COUNT metadata blocks. Slot i is:
//   record: [hour][minute][weekday][port_state][auto_off lo][auto_off hi]
//   meta:   [flags][port_mask][day lo][day hi][crc8 of record + meta 0..3]
// weekday bit0 = Monday ... bit6 = Sunday; weekday == 0 means ONCE.
// "day" is a day number (days since 1970-01-01, local date):
//   ONCE   -> the date the schedule runs on (stored).
//   WEEKLY -> the last local date it ran, RAM only (stored as 0).
// Execution history (WEEKLY day, kFlagDone) is never written to EEPROM, so
// running schedules does not wear the flash; see configurationOnly().
//
// Copied unchanged (logic) from DeviceIOT8266; independent of the platform.

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#include "PortBits.h"
#include "eeprom_layout.h"

namespace schedule {

constexpr size_t kRecordSize = 6;
constexpr size_t kMetaSize = 5;

constexpr uint8_t kFlagUsed = 0x01;
constexpr uint8_t kFlagEnabled = 0x02;
constexpr uint8_t kFlagDone = 0x04;   // ONCE executed or expired; RAM only.
constexpr uint8_t kFlagMask = kFlagUsed | kFlagEnabled | kFlagDone;

constexpr uint8_t kWeekdayOnce = 0x00;
constexpr uint8_t kWeekdayAll = 0x7F;

struct Entry {
    uint8_t hour;
    uint8_t minute;
    uint8_t weekday;
    uint8_t portState;
    uint16_t autoOff;   // Seconds, 0 = no auto OFF.
    uint8_t flags;
    uint8_t portMask;
    uint16_t day;
};

enum Validation : uint8_t {
    VALID = 0,
    INVALID_TIME,
    INVALID_WEEKDAY,
    INVALID_PORT_MASK,
    INVALID_DATE
};

inline bool isUsed(const Entry& e) { return (e.flags & kFlagUsed) != 0; }
inline bool isOnce(const Entry& e) { return e.weekday == kWeekdayOnce; }
inline bool isActive(const Entry& e)
{
    return (e.flags & (kFlagUsed | kFlagEnabled | kFlagDone)) == (kFlagUsed | kFlagEnabled);
}

// CRC-8/ATM (poly 0x07, init 0x00): an all-zero slot is a valid empty slot.
inline uint8_t crc8(const uint8_t* data, size_t length)
{
    uint8_t crc = 0;
    for (size_t i = 0; i < length; ++i) {
        crc ^= data[i];
        for (uint8_t bit = 0; bit < 8; ++bit) {
            crc = (crc & 0x80) ? static_cast<uint8_t>((crc << 1) ^ 0x07)
                               : static_cast<uint8_t>(crc << 1);
        }
    }
    return crc;
}

inline void encode(const Entry& e, uint8_t record[kRecordSize], uint8_t meta[kMetaSize])
{
    record[0] = e.hour;
    record[1] = e.minute;
    record[2] = e.weekday;
    record[3] = e.portState;
    record[4] = static_cast<uint8_t>(e.autoOff & 0xFF);
    record[5] = static_cast<uint8_t>(e.autoOff >> 8);
    meta[0] = e.flags;
    meta[1] = e.portMask;
    meta[2] = static_cast<uint8_t>(e.day & 0xFF);
    meta[3] = static_cast<uint8_t>(e.day >> 8);

    uint8_t crcInput[kRecordSize + kMetaSize - 1];
    for (size_t i = 0; i < kRecordSize; ++i) crcInput[i] = record[i];
    for (size_t i = 0; i < kMetaSize - 1; ++i) crcInput[kRecordSize + i] = meta[i];
    meta[4] = crc8(crcInput, sizeof(crcInput));
}

// Returns false when the CRC does not match (corrupted slot).
inline bool decode(const uint8_t record[kRecordSize], const uint8_t meta[kMetaSize], Entry& e)
{
    uint8_t crcInput[kRecordSize + kMetaSize - 1];
    for (size_t i = 0; i < kRecordSize; ++i) crcInput[i] = record[i];
    for (size_t i = 0; i < kMetaSize - 1; ++i) crcInput[kRecordSize + i] = meta[i];
    if (crc8(crcInput, sizeof(crcInput)) != meta[4]) return false;

    e.hour = record[0];
    e.minute = record[1];
    e.weekday = record[2];
    e.portState = record[3];
    e.autoOff = static_cast<uint16_t>(record[4] | (record[5] << 8));
    e.flags = meta[0];
    e.portMask = meta[1];
    e.day = static_cast<uint16_t>(meta[2] | (meta[3] << 8));
    return true;
}

// The part of an entry that is stored: execution history is dropped.
inline Entry configurationOnly(const Entry& e)
{
    Entry stored = e;
    stored.flags &= static_cast<uint8_t>(~kFlagDone);
    if (!isOnce(stored)) stored.day = 0;
    return stored;
}

// Howard Hinnant's days_from_civil / civil_from_days.
inline int32_t daysFromCivil(int32_t year, uint32_t month, uint32_t dayOfMonth)
{
    year -= month <= 2 ? 1 : 0;
    const int32_t era = (year >= 0 ? year : year - 399) / 400;
    const uint32_t yoe = static_cast<uint32_t>(year - era * 400);
    const uint32_t doy = (153 * (month > 2 ? month - 3 : month + 9) + 2) / 5 + dayOfMonth - 1;
    const uint32_t doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    return era * 146097 + static_cast<int32_t>(doe) - 719468;
}

inline void civilFromDays(int32_t days, int32_t& year, uint32_t& month, uint32_t& dayOfMonth)
{
    days += 719468;
    const int32_t era = (days >= 0 ? days : days - 146096) / 146097;
    const uint32_t doe = static_cast<uint32_t>(days - era * 146097);
    const uint32_t yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    const uint32_t doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    const uint32_t mp = (5 * doy + 2) / 153;
    dayOfMonth = doy - (153 * mp + 2) / 5 + 1;
    month = mp < 10 ? mp + 3 : mp - 9;
    year = static_cast<int32_t>(yoe) + era * 400 + (month <= 2 ? 1 : 0);
}

inline bool isValidDate(int32_t year, uint32_t month, uint32_t dayOfMonth)
{
    if (year < 2024 || year > 2149 || month < 1 || month > 12 || dayOfMonth < 1) return false;
    static const uint8_t kDaysInMonth[12] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    const bool leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    const uint32_t maxDay = kDaysInMonth[month - 1] + ((month == 2 && leap) ? 1 : 0);
    return dayOfMonth <= maxDay;
}

// 1970-01-01 was a Thursday; result uses the spec bits (bit0 = Monday).
inline uint8_t weekdayBit(int32_t dayNumber)
{
    const int32_t mondayIndex = ((dayNumber % 7) + 7 + 3) % 7;
    return static_cast<uint8_t>(1u << mondayIndex);
}

inline Validation validate(const Entry& e, uint8_t allowedPortMask)
{
    if (e.hour > 23 || e.minute > 59) return INVALID_TIME;
    if ((e.weekday & 0x80) != 0) return INVALID_WEEKDAY;
    if (e.portMask == 0 || (e.portMask & ~allowedPortMask) != 0) return INVALID_PORT_MASK;
    if (isOnce(e) && e.day == 0) return INVALID_DATE;
    return VALID;
}

inline bool occursOnDay(const Entry& e, uint16_t dayNumber)
{
    if (isOnce(e)) return e.day == dayNumber;
    return (e.weekday & weekdayBit(dayNumber)) != 0;
}


constexpr int64_t kMinutesPerDay = 1440;

// Minutes since local midnight.
inline int minuteOfDay(const Entry& e)
{
    return e.hour * 60 + e.minute;
}

// Local minute number (minutes since 1970-01-01 00:00 local time) of the
// entry's time of day on day.
inline int64_t occurrenceMinute(const Entry& e, int64_t day)
{
    return day * kMinutesPerDay + minuteOfDay(e);
}

inline bool daysOverlap(const Entry& a, const Entry& b)
{
    if (isOnce(a) && isOnce(b)) return a.day == b.day;
    if (isOnce(a)) return (b.weekday & weekdayBit(a.day)) != 0;
    if (isOnce(b)) return (a.weekday & weekdayBit(b.day)) != 0;
    return (a.weekday & b.weekday) != 0;
}

// Ports both schedules drive to a different result at the same moment: a
// different ON/OFF state, or ON with a different auto OFF time (spec §5).
inline uint8_t conflictingPorts(const Entry& a, const Entry& b)
{
    if (minuteOfDay(a) != minuteOfDay(b) || !daysOverlap(a, b)) return 0;
    const uint8_t shared = a.portMask & b.portMask;
    uint8_t conflict = (a.portState ^ b.portState) & shared;
    if (a.autoOff != b.autoOff) conflict |= a.portState & b.portState & shared;
    return conflict;
}

// Fields that define what a schedule does; flags/day bookkeeping excluded.
inline bool sameDefinition(const Entry& a, const Entry& b)
{
    return a.hour == b.hour && a.minute == b.minute && a.weekday == b.weekday && a.portState == b.portState &&
           a.autoOff == b.autoOff && a.portMask == b.portMask && (!isOnce(a) || a.day == b.day);
}

// STATUS "set" item: the 6-byte record as text,
// "hour,minute,weekday,port_state,auto_off" (e.g. "8,20,1,4,5"). size >= 24.
inline void formatSetting(const Entry& e, char* out, size_t size)
{
    snprintf(out, size, "%u,%u,%u,%u,%u", e.hour, e.minute, e.weekday, e.portState, e.autoOff);
}

// Indexes of the active entries ordered by time of day (then by slot).
// Returns how many were written to order.
inline size_t activeByTime(const Entry* entries, size_t count, uint8_t* order)
{
    size_t used = 0;
    for (size_t i = 0; i < count; ++i) {
        if (!isActive(entries[i])) continue;
        const int key = minuteOfDay(entries[i]);
        size_t position = used++;
        while (position > 0 && minuteOfDay(entries[order[position - 1]]) > key) {
            order[position] = order[position - 1];
            --position;
        }
        order[position] = static_cast<uint8_t>(i);
    }
    return used;
}

// ---------------------------------------------------------------------------
// Evaluation. A "minute" is a local minute number (occurrenceMinute()).
// ---------------------------------------------------------------------------

// True when the entry is due in minute and has not run in it yet.
inline bool shouldRun(const Entry& e, int64_t minute)
{
    if (!isActive(e) || minute < 0) return false;
    const uint16_t day = static_cast<uint16_t>(minute / kMinutesPerDay);
    if (minuteOfDay(e) != static_cast<int>(minute % kMinutesPerDay) || !occursOnDay(e, day)) return false;
    // Weekly: already ran today (e.g. reboot inside the same minute).
    return isOnce(e) || e.day != day;
}

// Records a run in RAM: ONCE is done, WEEKLY remembers the day.
inline void markRun(Entry& e, int64_t minute)
{
    if (isOnce(e)) {
        e.flags |= kFlagDone;
    } else {
        e.day = static_cast<uint16_t>(minute / kMinutesPerDay);
    }
}

// An active ONCE entry whose moment is at or before lastMinute: it was missed
// (device off or clock not valid) and must not run late.
inline bool missedOnce(const Entry& e, int64_t lastMinute)
{
    return isActive(e) && isOnce(e) && occurrenceMinute(e, e.day) <= lastMinute;
}

// An update keeps the weekly last-run day while the time of day is unchanged,
// so an edit does not make a schedule that already ran today run again.
inline void keepLastRunDay(const Entry& previous, Entry& updated)
{
    if (!isOnce(updated) && !isOnce(previous) && minuteOfDay(previous) == minuteOfDay(updated)) {
        updated.day = previous.day;
    }
}

// Which minutes the next process() call evaluates: lastEvaluatedMinute + 1 .. now.
struct CatchUp {
    int64_t lastEvaluatedMinute;
    int64_t skippedMinutes;  // Minutes dropped because the scheduler was late.
};

// lastEvaluatedMinute < 0: first valid clock after boot. A clock that moved
// back also restarts at the current minute (weekly last-run days prevent a
// second run). A delay longer than maxCatchupMinutes skips the older minutes.
inline CatchUp catchUpWindow(int64_t lastEvaluatedMinute, int64_t nowMinute, int64_t maxCatchupMinutes)
{
    if (lastEvaluatedMinute < 0 || nowMinute < lastEvaluatedMinute) return {nowMinute - 1, 0};
    if (nowMinute - lastEvaluatedMinute > maxCatchupMinutes) {
        return {nowMinute - maxCatchupMinutes, nowMinute - lastEvaluatedMinute - maxCatchupMinutes};
    }
    return {lastEvaluatedMinute, 0};
}

// Merges the schedules due in one minute. Ports with conflicting requests are
// removed from every command (spec §5) and reported in conflictMask.
struct PortAction {
    uint8_t onMask;
    uint8_t offMask;
    uint16_t autoOff[ports::kCount];
    uint8_t conflictMask;
};

inline void mergeDue(const Entry* const* due, size_t count, PortAction& action)
{
    action = {};
    uint8_t seen = 0;
    for (size_t i = 0; i < count; ++i) {
        const Entry& e = *due[i];
        ports::forEach(e.portMask, [&](uint8_t port, uint8_t bit) {
            const bool on = (e.portState & bit) != 0;
            const uint16_t autoOff = on ? e.autoOff : 0;
            if ((seen & bit) == 0) {
                seen |= bit;
                if (on) {
                    action.onMask |= bit;
                } else {
                    action.offMask |= bit;
                }
                action.autoOff[port] = autoOff;
            } else if (((action.onMask & bit) != 0) != on || action.autoOff[port] != autoOff) {
                action.conflictMask |= bit;
            }
        });
    }
    action.onMask &= static_cast<uint8_t>(~action.conflictMask);
    action.offMask &= static_cast<uint8_t>(~action.conflictMask);
}

// A device command produced by due schedules: set the ports of mask to state;
// the ports switched on get an auto OFF after autoOff seconds (0 = none).
struct Command {
    uint8_t mask;
    uint8_t state;
    uint16_t autoOff;
};

// At most one OFF command plus one ON command per distinct auto OFF value.
constexpr size_t kMaxCommandsPerMinute = ports::kCount + 1;

// Splits a merged action into commands; ON ports sharing an auto OFF value
// share a command. Returns the number written to commands.
inline size_t buildCommands(const PortAction& action, Command* commands)
{
    size_t count = 0;
    if (action.offMask != 0) commands[count++] = {action.offMask, 0, 0};
    uint8_t remaining = action.onMask;
    while (remaining != 0) {
        uint8_t first = 0;
        while ((remaining & ports::bitOf(first)) == 0) ++first;
        const uint16_t autoOff = action.autoOff[first];
        uint8_t group = 0;
        ports::forEach(remaining, [&](uint8_t port, uint8_t bit) {
            if (action.autoOff[port] == autoOff) group |= bit;
        });
        commands[count++] = {group, group, autoOff};
        remaining &= static_cast<uint8_t>(~group);
    }
    return count;
}

// ---------------------------------------------------------------------------
// EEPROM region SCHEDULE_EEPROM_ADDRESS..SCHEDULE_EEPROM_END as a byte image.
// ---------------------------------------------------------------------------

constexpr uint8_t kRegionMagic0 = 'S';
constexpr uint8_t kRegionMagic1 = 'C';
constexpr size_t kSlotCount = SCHEDULE_MAX_COUNT;
constexpr size_t kRegionSize = SCHEDULE_EEPROM_END - SCHEDULE_EEPROM_ADDRESS;

static_assert(SCHEDULE_RECORD_SIZE == kRecordSize, "6-byte record size changed");
static_assert(SCHEDULE_META_SIZE == kMetaSize, "metadata size changed");
static_assert(SCHEDULE_MAX_COUNT <= 255, "schedule ids are one byte");

inline size_t recordOffset(size_t slot)
{
    return (SCHEDULE_RECORDS_ADDRESS - SCHEDULE_EEPROM_ADDRESS) + slot * kRecordSize;
}

inline size_t metaOffset(size_t slot)
{
    return (SCHEDULE_META_ADDRESS - SCHEDULE_EEPROM_ADDRESS) + slot * kMetaSize;
}

// region: kRegionSize bytes. Unused slots are written as zeros.
inline void encodeRegion(const Entry* source, uint8_t* region)
{
    region[0] = kRegionMagic0;
    region[1] = kRegionMagic1;
    region[2] = SCHEDULE_EEPROM_VERSION;
    region[3] = SCHEDULE_MAX_COUNT;
    for (size_t i = 0; i < kSlotCount; ++i) {
        uint8_t* record = region + recordOffset(i);
        uint8_t* meta = region + metaOffset(i);
        if (isUsed(source[i])) {
            encode(configurationOnly(source[i]), record, meta);
        } else {
            memset(record, 0, kRecordSize);
            memset(meta, 0, kMetaSize);
        }
    }
}

enum class SlotLoad : uint8_t {
    Empty,
    Loaded,
    CrcError,     // Dropped.
    InvalidData,  // Dropped: unknown flags or a definition validate() rejects.
};

struct RegionLoad {
    bool headerValid;   // false: blank or foreign data, every slot empty.
    bool needsRewrite;  // The stored image differs from what was loaded.
    SlotLoad slots[kSlotCount];
};

// Decodes a region image into loaded (kSlotCount entries, configuration only).
inline RegionLoad decodeRegion(const uint8_t* region, uint8_t allowedPortMask, Entry* loaded)
{
    RegionLoad result = {};
    for (size_t i = 0; i < kSlotCount; ++i) {
        loaded[i] = {};
        result.slots[i] = SlotLoad::Empty;
    }
    result.headerValid = region[0] == kRegionMagic0 && region[1] == kRegionMagic1 &&
                         region[2] == SCHEDULE_EEPROM_VERSION && region[3] == SCHEDULE_MAX_COUNT;
    if (!result.headerValid) {
        result.needsRewrite = true;
        return result;
    }
    for (size_t i = 0; i < kSlotCount; ++i) {
        Entry entry;
        if (!decode(region + recordOffset(i), region + metaOffset(i), entry)) {
            result.slots[i] = SlotLoad::CrcError;
            result.needsRewrite = true;
            continue;
        }
        if (!isUsed(entry)) continue;
        if ((entry.flags & ~kFlagMask) != 0 || validate(entry, allowedPortMask) != VALID) {
            result.slots[i] = SlotLoad::InvalidData;
            result.needsRewrite = true;
            continue;
        }
        loaded[i] = configurationOnly(entry);
        result.slots[i] = SlotLoad::Loaded;
    }
    return result;
}

// Per-port ownership (spec §6). A direct command (MQTT/HTTP com:1, button)
// cancels the auto OFF of the schedule that last switched the port; the next
// schedule event on that port takes control back. Methods return the new
// port byte. Times are epoch seconds; now = 0 means "clock invalid".
class PortController {
public:
    struct PortState {
        bool manualOverride;
        uint32_t scheduleGeneration;
        uint32_t autoOffGeneration;
        int64_t autoOffDeadline;  // 0 = none.
    };

    // Returns the ports whose pending auto OFF was cancelled in cancelled.
    uint8_t applyDirect(uint8_t current, uint8_t mask, uint8_t state, uint8_t& cancelled)
    {
        cancelled = 0;
        ports::forEach(mask, [&](uint8_t port, uint8_t bit) {
            PortState& p = ports_[port];
            if (p.autoOffDeadline != 0) cancelled |= bit;
            p.manualOverride = true;
            p.scheduleGeneration++;  // Invalidates the pending auto OFF.
            p.autoOffDeadline = 0;
        });
        return static_cast<uint8_t>((current & ~mask) | (state & mask));
    }

    uint8_t applySchedule(uint8_t current, uint8_t mask, uint8_t state, uint16_t autoOff, int64_t now)
    {
        ports::forEach(mask, [&](uint8_t port, uint8_t bit) {
            PortState& p = ports_[port];
            p.manualOverride = false;  // A new schedule event restores automatic control.
            p.scheduleGeneration++;
            if ((state & bit) != 0 && autoOff > 0 && now > 0) {
                p.autoOffDeadline = now + autoOff;
                p.autoOffGeneration = p.scheduleGeneration;
            } else {
                p.autoOffDeadline = 0;
            }
        });
        return static_cast<uint8_t>((current & ~mask) | (state & mask));
    }

    // Returns the ports switched off in switchedOff.
    uint8_t processAutoOff(uint8_t current, int64_t now, uint8_t& switchedOff)
    {
        switchedOff = 0;
        if (now <= 0) return current;
        for (uint8_t port = 0; port < ports::kCount; ++port) {
            PortState& p = ports_[port];
            if (p.autoOffDeadline == 0 || now < p.autoOffDeadline) continue;
            p.autoOffDeadline = 0;
            // A stale timer (port taken over since) does nothing.
            if (p.manualOverride || p.autoOffGeneration != p.scheduleGeneration) continue;
            switchedOff |= ports::bitOf(port);
        }
        return static_cast<uint8_t>(current & ~switchedOff);
    }

    const PortState& port(uint8_t index) const
    {
        return ports_[index];
    }

private:
    PortState ports_[ports::kCount] = {};
};

}  // namespace schedule
