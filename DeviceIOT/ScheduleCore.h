#pragma once

// Pure schedule logic (no Arduino/EEPROM dependency) so it can be unit tested
// on a host compiler: tests/schedule_core_test.cpp.
//
// EEPROM slot = 6-byte record (spec_v1 §2, format unchanged) + 5-byte metadata.
//   record: [hour][minute][weekday][port_state][auto_off lo][auto_off hi]
//   meta:   [flags][port_mask][day lo][day hi][crc8 of record + meta 0..3]
// weekday bit0 = Monday ... bit6 = Sunday; weekday == 0 means ONCE.
// "day" is a day number (days since 1970-01-01, local date):
//   ONCE   -> the date the schedule runs on (stored).
//   WEEKLY -> the last local date it ran, RAM only (stored as 0).
// Execution history (WEEKLY day, kFlagDone) is never written to EEPROM, so
// running schedules does not wear the flash; see configurationOnly().

#include <stddef.h>
#include <stdint.h>
#include <stdio.h>

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
    if (a.hour != b.hour || a.minute != b.minute || !daysOverlap(a, b)) return 0;
    const uint8_t shared = a.portMask & b.portMask;
    uint8_t conflict = (a.portState ^ b.portState) & shared;
    if (a.autoOff != b.autoOff) conflict |= a.portState & b.portState & shared;
    return conflict;
}

// Fields that define what a schedule does; flags/day bookkeeping excluded.
inline bool sameDefinition(const Entry& a, const Entry& b)
{
    return a.hour == b.hour && a.minute == b.minute && a.weekday == b.weekday &&
           a.portState == b.portState && a.autoOff == b.autoOff &&
           a.portMask == b.portMask && (!isOnce(a) || a.day == b.day);
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
        const int key = entries[i].hour * 60 + entries[i].minute;
        size_t position = used++;
        while (position > 0 &&
               entries[order[position - 1]].hour * 60 + entries[order[position - 1]].minute > key) {
            order[position] = order[position - 1];
            --position;
        }
        order[position] = static_cast<uint8_t>(i);
    }
    return used;
}

// Merges the schedules due in one minute. Ports with conflicting requests are
// removed from every command (spec §5) and reported in conflictMask.
struct PortAction {
    uint8_t onMask;
    uint8_t offMask;
    uint16_t autoOff[8];
    uint8_t conflictMask;
};

inline void mergeDue(const Entry* const* due, size_t count, PortAction& action)
{
    action = {};
    uint8_t seen = 0;
    for (size_t i = 0; i < count; ++i) {
        const Entry& e = *due[i];
        for (uint8_t port = 0; port < 8; ++port) {
            const uint8_t bit = static_cast<uint8_t>(1u << port);
            if ((e.portMask & bit) == 0) continue;
            const bool on = (e.portState & bit) != 0;
            const uint16_t autoOff = on ? e.autoOff : 0;
            if ((seen & bit) == 0) {
                seen |= bit;
                if (on) action.onMask |= bit; else action.offMask |= bit;
                action.autoOff[port] = autoOff;
            } else if (((action.onMask & bit) != 0) != on || action.autoOff[port] != autoOff) {
                action.conflictMask |= bit;
            }
        }
    }
    action.onMask &= ~action.conflictMask;
    action.offMask &= ~action.conflictMask;
}

// Per-port ownership (spec §6). A direct command (MQTT/HTTP com:1, button)
// cancels the auto OFF of the schedule that last switched the port; the next
// schedule event on that port takes control back. Methods return the new
// 8-bit port state. Times are epoch seconds; now = 0 means "clock invalid".
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
        for (uint8_t port = 0; port < 8; ++port) {
            const uint8_t bit = static_cast<uint8_t>(1u << port);
            if ((mask & bit) == 0) continue;
            PortState& p = ports_[port];
            if (p.autoOffDeadline != 0) cancelled |= bit;
            p.manualOverride = true;
            p.scheduleGeneration++;  // Invalidates the pending auto OFF.
            p.autoOffDeadline = 0;
        }
        return static_cast<uint8_t>((current & ~mask) | (state & mask));
    }

    uint8_t applySchedule(uint8_t current, uint8_t mask, uint8_t state, uint16_t autoOff, int64_t now)
    {
        for (uint8_t port = 0; port < 8; ++port) {
            const uint8_t bit = static_cast<uint8_t>(1u << port);
            if ((mask & bit) == 0) continue;
            PortState& p = ports_[port];
            p.manualOverride = false;  // A new schedule event restores automatic control.
            p.scheduleGeneration++;
            if ((state & bit) != 0 && autoOff > 0 && now > 0) {
                p.autoOffDeadline = now + autoOff;
                p.autoOffGeneration = p.scheduleGeneration;
            } else {
                p.autoOffDeadline = 0;
            }
        }
        return static_cast<uint8_t>((current & ~mask) | (state & mask));
    }

    // Returns the ports switched off in switchedOff.
    uint8_t processAutoOff(uint8_t current, int64_t now, uint8_t& switchedOff)
    {
        switchedOff = 0;
        if (now <= 0) return current;
        for (uint8_t port = 0; port < 8; ++port) {
            PortState& p = ports_[port];
            if (p.autoOffDeadline == 0 || now < p.autoOffDeadline) continue;
            p.autoOffDeadline = 0;
            // A stale timer (port taken over since) does nothing.
            if (p.manualOverride || p.autoOffGeneration != p.scheduleGeneration) continue;
            switchedOff |= static_cast<uint8_t>(1u << port);
        }
        return static_cast<uint8_t>(current & ~switchedOff);
    }

    const PortState& port(uint8_t index) const { return ports_[index]; }


private:
    PortState ports_[8] = {};
};

} // namespace schedule
