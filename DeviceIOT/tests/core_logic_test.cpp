// Host unit tests of the pure firmware logic (no Arduino needed): ScheduleCore.h,
// PortArbiter.h, OnTimer.h, Countdown.h, ThresholdControl.h, ByteCodec.h, AirQuality.h.
// Run from the repository root: make test
// Arduino IDE does not compile this folder (only the sketch root and src/).
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <cstdio>
#include <cstring>

#include "../AirQuality.h"
#include "../ByteCodec.h"
#include "../Countdown.h"
#include "../OnTimer.h"
#include "../PortArbiter.h"
#include "../ScheduleCore.h"
#include "../ThresholdControl.h"

using namespace schedule;

static int failures = 0;
#define CHECK(cond) do { if (!(cond)) { std::printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond); ++failures; } } while (0)

static Entry weekly(uint8_t h, uint8_t m, uint8_t wd, uint8_t mask, uint8_t state, uint16_t autoOff = 0)
{
    Entry e = {};
    e.hour = h; e.minute = m; e.weekday = wd; e.portMask = mask; e.portState = state;
    e.autoOff = autoOff; e.flags = kFlagUsed | kFlagEnabled;
    return e;
}

static const uint16_t kWed_2026_11_04 = static_cast<uint16_t>(daysFromCivil(2026, 11, 4));
static const uint8_t kMonToFri = 0x1F;
static const uint8_t kWeekend = 0x60;

static void testCalendar()
{
    CHECK(daysFromCivil(1970, 1, 1) == 0);
    CHECK(weekdayBit(0) == 0x08);                               // 1970-01-01 Thursday
    CHECK(weekdayBit(kWed_2026_11_04) == 0x04);                 // Wednesday = bit2
    CHECK(weekdayBit(static_cast<uint16_t>(daysFromCivil(2026, 11, 8))) == 0x40);  // Sunday = bit6
    int32_t y; uint32_t mo, d;
    civilFromDays(daysFromCivil(2028, 2, 29), y, mo, d);
    CHECK(y == 2028 && mo == 2 && d == 29);
    CHECK(isValidDate(2028, 2, 29));
    CHECK(!isValidDate(2026, 2, 29));
    CHECK(!isValidDate(2026, 4, 31));
}

// Test 1: 07:00 Monday-Friday runs on the right days only.
static void testWeekdayMatch()
{
    const Entry e = weekly(7, 0, kMonToFri, 0x01, 0x01);
    CHECK(occursOnDay(e, kWed_2026_11_04));
    CHECK(!occursOnDay(e, static_cast<uint16_t>(daysFromCivil(2026, 11, 7))));  // Saturday
    Entry once = e;
    once.weekday = kWeekdayOnce;
    once.day = kWed_2026_11_04;
    CHECK(occursOnDay(once, kWed_2026_11_04));
    CHECK(!occursOnDay(once, kWed_2026_11_04 + 7));
}

// Spec §2 / test 11: the 6-byte record layout and CRC.
static void testEncoding()
{
    Entry e = weekly(7, 30, kMonToFri, 0x03, 0x01, 600);
    e.day = 12345;
    uint8_t record[kRecordSize];
    uint8_t meta[kMetaSize];
    encode(e, record, meta);
    const uint8_t expected[kRecordSize] = {7, 30, 0x1F, 0x01, 600 & 0xFF, 600 >> 8};
    CHECK(std::memcmp(record, expected, kRecordSize) == 0);

    Entry decoded = {};
    CHECK(decode(record, meta, decoded));
    CHECK(sameDefinition(decoded, e) && decoded.flags == e.flags && decoded.day == 12345);

    record[3] ^= 0x02;  // Corrupted byte is detected.
    CHECK(!decode(record, meta, decoded));

    uint8_t emptyRecord[kRecordSize] = {};
    uint8_t emptyMeta[kMetaSize] = {};
    CHECK(decode(emptyRecord, emptyMeta, decoded) && !isUsed(decoded));  // Fresh zeroed EEPROM.
}

static void testValidation()
{
    CHECK(validate(weekly(7, 0, kMonToFri, 0x01, 0x01), 0x03) == VALID);
    CHECK(validate(weekly(24, 0, kMonToFri, 0x01, 0x01), 0x03) == INVALID_TIME);
    CHECK(validate(weekly(7, 60, kMonToFri, 0x01, 0x01), 0x03) == INVALID_TIME);
    CHECK(validate(weekly(7, 0, 0x80, 0x01, 0x01), 0x03) == INVALID_WEEKDAY);
    CHECK(validate(weekly(7, 0, kMonToFri, 0x04, 0x04), 0x03) == INVALID_PORT_MASK);
    CHECK(validate(weekly(7, 0, kMonToFri, 0x00, 0x00), 0x03) == INVALID_PORT_MASK);
    CHECK(validate(weekly(7, 0, kWeekdayOnce, 0x01, 0x01), 0x03) == INVALID_DATE);
}

// Test 5 and spec §5 table.
static void testConflicts()
{
    const Entry a = weekly(7, 30, kMonToFri, 0x01, 0x01);   // Port 1 ON
    const Entry b = weekly(7, 30, kMonToFri, 0x01, 0x00);   // Port 1 OFF
    const Entry c = weekly(7, 30, kMonToFri, 0x02, 0x02);   // Port 2 ON
    CHECK(conflictingPorts(a, b) == 0x01);
    CHECK(conflictingPorts(a, c) == 0);
    CHECK(conflictingPorts(a, weekly(7, 31, kMonToFri, 0x01, 0x00)) == 0);  // Other minute
    CHECK(conflictingPorts(a, weekly(7, 30, kWeekend, 0x01, 0x00)) == 0);   // No common day
    CHECK(conflictingPorts(a, weekly(7, 30, 0x01, 0x01, 0x01)) == 0);       // Same state merges
    CHECK(conflictingPorts(a, weekly(7, 30, 0x01, 0x01, 0x01, 600)) == 0x01);  // Different auto OFF

    Entry onceWed = a;
    onceWed.weekday = kWeekdayOnce;
    onceWed.day = kWed_2026_11_04;
    onceWed.portState = 0;
    CHECK(conflictingPorts(onceWed, a) == 0x01);
    CHECK(conflictingPorts(onceWed, weekly(7, 30, kWeekend, 0x01, 0x01)) == 0);

    // Runtime merge: A and B cancel each other on port 1, C still runs.
    const Entry* due[] = {&a, &b, &c};
    PortAction action;
    mergeDue(due, 3, action);
    CHECK(action.conflictMask == 0x01);
    CHECK(action.onMask == 0x02);
    CHECK(action.offMask == 0x00);
}

// Tests 2, 3, 4, 6, 7, 8, 9, 15.
static void testPortController()
{
    PortController pc;
    const int64_t t0 = 1'800'000'000;
    uint8_t ports = 0x02;  // Port 2 ON before the schedule.

    // Test 2 + 15: schedule mask 0x01 turns port 1 ON and leaves port 2 alone.
    ports = pc.applySchedule(ports, 0x01, 0x01, 600, t0);
    CHECK(ports == 0x03);

    // Test 3: auto OFF after 600 s.
    uint8_t off = 0;
    ports = pc.processAutoOff(ports, t0 + 599, off);
    CHECK(ports == 0x03 && off == 0);
    ports = pc.processAutoOff(ports, t0 + 600, off);
    CHECK(ports == 0x02 && off == 0x01);

    // Test 4: auto OFF = 0 never switches off.
    ports = pc.applySchedule(ports, 0x01, 0x01, 0, t0);
    ports = pc.processAutoOff(ports, t0 + 100000, off);
    CHECK(ports == 0x03 && off == 0);

    // Tests 6 + 7: direct OFF at 07:05 wins; the 07:10 auto OFF is ignored.
    PortController pc2;
    uint8_t p = pc2.applySchedule(0, 0x01, 0x01, 600, t0);
    uint8_t cancelled = 0;
    p = pc2.applyDirect(p, 0x01, 0x00, cancelled);
    CHECK(p == 0x00 && cancelled == 0x01);
    p = pc2.processAutoOff(p, t0 + 600, off);
    CHECK(p == 0x00 && off == 0);

    // Test 8: direct ON while a schedule auto OFF is pending stays ON.
    PortController pc3;
    p = pc3.applySchedule(0, 0x01, 0x01, 600, t0);
    p = pc3.applyDirect(p, 0x01, 0x01, cancelled);
    p = pc3.processAutoOff(p, t0 + 3600, off);
    CHECK(p == 0x01 && off == 0);
    CHECK(pc3.port(0).manualOverride);

    // Test 9: the next schedule event takes control back.
    p = pc3.applySchedule(p, 0x01, 0x00, 0, t0 + 7200);
    CHECK(p == 0x00 && !pc3.port(0).manualOverride);

    // A newer schedule ON without auto OFF cancels the older auto OFF.
    PortController pc4;
    p = pc4.applySchedule(0, 0x01, 0x01, 600, t0);
    p = pc4.applySchedule(p, 0x01, 0x01, 0, t0 + 300);
    p = pc4.processAutoOff(p, t0 + 600, off);
    CHECK(p == 0x01 && off == 0);

    // No valid clock: no deadline is armed.
    PortController pc5;
    p = pc5.applySchedule(0, 0x01, 0x01, 600, 0);
    CHECK(pc5.port(0).autoOffDeadline == 0);
}

// Execution history is never written to EEPROM (no flash wear per run).
static void testConfigurationOnly()
{
    Entry ranWeekly = weekly(7, 30, kMonToFri, 0x01, 0x01);
    ranWeekly.day = kWed_2026_11_04;
    const Entry storedWeekly = configurationOnly(ranWeekly);
    CHECK(storedWeekly.day == 0 && sameDefinition(storedWeekly, ranWeekly));

    Entry doneOnce = weekly(7, 30, kWeekdayOnce, 0x01, 0x01);
    doneOnce.day = kWed_2026_11_04;
    doneOnce.flags |= kFlagDone;
    const Entry storedOnce = configurationOnly(doneOnce);
    CHECK(storedOnce.day == kWed_2026_11_04);  // The run date is configuration.
    CHECK((storedOnce.flags & kFlagDone) == 0 && isActive(storedOnce));

    // Running a schedule leaves the stored bytes unchanged, so commit() is a no-op.
    uint8_t recordBefore[kRecordSize], metaBefore[kMetaSize];
    uint8_t recordAfter[kRecordSize], metaAfter[kMetaSize];
    const Entry fresh = weekly(7, 30, kMonToFri, 0x01, 0x01);
    encode(configurationOnly(fresh), recordBefore, metaBefore);
    encode(configurationOnly(ranWeekly), recordAfter, metaAfter);
    CHECK(std::memcmp(recordBefore, recordAfter, kRecordSize) == 0);
    CHECK(std::memcmp(metaBefore, metaAfter, kMetaSize) == 0);
}

// STATUS "set": 6-byte record as text, active schedules only, ordered by time.
static void testSettings()
{
    char text[24];
    formatSetting(weekly(8, 20, 0x01, 0x04, 0x04, 5), text, sizeof(text));
    CHECK(std::strcmp(text, "8,20,1,4,5") == 0);  // 08:20 Monday, port 3 ON, off after 5 s.
    formatSetting(weekly(23, 59, kWeekdayAll, 0x03, 0x03, 65535), text, sizeof(text));
    CHECK(std::strcmp(text, "23,59,127,3,65535") == 0);

    Entry table[5] = {};
    table[0] = weekly(18, 0, kMonToFri, 0x01, 0x00);
    table[1] = weekly(7, 30, kMonToFri, 0x01, 0x01);
    table[2] = weekly(6, 0, kMonToFri, 0x01, 0x01);
    table[2].flags = kFlagUsed;                       // Disabled: not reported.
    // table[3] stays unused.
    table[4] = weekly(7, 30, kWeekend, 0x02, 0x02);   // Same time as slot 1: slot order.
    uint8_t order[5];
    const size_t count = activeByTime(table, 5, order);
    CHECK(count == 3);
    CHECK(order[0] == 1 && order[1] == 4 && order[2] == 0);
}

// Test 10: QoS 1 redelivery of the same ADD is recognized.
static void testIdempotentDefinition()
{
    const Entry a = weekly(7, 30, kMonToFri, 0x03, 0x01, 600);
    Entry ran = a;
    ran.day = kWed_2026_11_04;  // Weekly bookkeeping does not change the definition.
    CHECK(sameDefinition(a, ran));
    CHECK(!sameDefinition(a, weekly(7, 30, kMonToFri, 0x03, 0x01, 601)));
}

// On-timer: a port on for the configured seconds is switched off, whatever
// switched it on; 0 disables it.
static void testOnTimer()
{
    uint8_t bytes[4];
    le32::encode(86400, bytes);
    CHECK(bytes[0] == 0x80 && bytes[1] == 0x51 && bytes[2] == 0x01 && bytes[3] == 0x00);
    CHECK(le32::decode(bytes) == 86400);
    const uint8_t blank[4] = {0xFF, 0xFF, 0xFF, 0xFF};
    CHECK(!on_timer::isValid(le32::decode(blank)));
    CHECK(on_timer::isValid(0) && on_timer::isValid(1) && !on_timer::isValid(86401));

    on_timer::Tracker t;
    CHECK(t.update(0x01, 5, 1000) == 0);       // Port 1 switched on at 1 s.
    CHECK(t.update(0x03, 5, 3000) == 0);       // Port 2 on at 3 s.
    CHECK(t.update(0x03, 5, 5999) == 0);
    CHECK(t.update(0x03, 5, 6000) == 0x01);    // 5 s after port 1.
    CHECK(t.update(0x02, 5, 7999) == 0);
    CHECK(t.update(0x02, 5, 8000) == 0x02);

    on_timer::Tracker off;
    CHECK(off.update(0x01, 0, 0) == 0);
    CHECK(off.update(0x01, 0, 100000000) == 0);  // 0 = no timer.
    CHECK(off.update(0x01, 1, 100000000) == 0x01);  // Enabling applies to a port already on.

    on_timer::Tracker again;
    CHECK(again.update(0x01, 10, 0) == 0);
    CHECK(again.update(0x00, 10, 4000) == 0);   // Switched off: the count restarts.
    CHECK(again.update(0x01, 10, 5000) == 0);
    CHECK(again.update(0x01, 10, 14999) == 0);
    CHECK(again.update(0x01, 10, 15000) == 0x01);

    on_timer::Tracker wrap;
    CHECK(wrap.update(0x01, 86400, 0xFFFFFC18u) == 0);  // millis() wraps 1 s later.
    CHECK(wrap.update(0x01, 86400, 86398999u) == 0);
    CHECK(wrap.update(0x01, 86400, 86399000u) == 0x01);
}

// Countdown: switches the ports on once after the time; cancel and restart.
static void testCountdown()
{
    CHECK(countdown::isValid(86400) && !countdown::isValid(86401));

    countdown::Timer t;
    CHECK(t.poll(0) == 0 && t.remaining(0) == 0);
    t.start(5, 0x02, 1000);
    CHECK(t.armed() && t.mask() == 0x02);
    CHECK(t.remaining(1000) == 5);
    CHECK(t.remaining(1001) == 5);           // Rounded up.
    CHECK(t.remaining(5001) == 1);
    CHECK(t.poll(5999) == 0);
    CHECK(t.poll(6000) == 0x02);             // 5 s after start.
    CHECK(!t.armed() && t.poll(7000) == 0);  // Only once.
    CHECK(t.remaining(7000) == 0 && t.mask() == 0);

    t.start(10, 0x01, 0);
    t.start(3, 0x01, 4000);                  // A new value restarts the count.
    CHECK(t.poll(6999) == 0 && t.poll(7000) == 0x01);

    t.start(10, 0x01, 0);
    t.cancel();
    CHECK(t.poll(20000) == 0 && t.remaining(20000) == 0);

    t.start(0, 0x01, 0);                     // 0 s or no port never arms.
    CHECK(!t.armed());
    t.start(5, 0x00, 0);
    CHECK(!t.armed());

    t.start(86400, 0x01, 0xFFFFFC18u);       // millis() wraps 1 s later.
    CHECK(t.poll(86398999u) == 0);
    CHECK(t.poll(86399000u) == 0x01);
}

// Threshold rules: 4-byte packing, validation, rising edges only.
static void testThreshold()
{
    using namespace threshold;
    // Temperature (sensor 2) >= 30.00 C -> port 1 on.
    const Rule hot = {2, static_cast<uint8_t>(0x01 | kActionOn), 3000};
    const uint32_t hotValue = encode(hot);
    CHECK(hotValue == ((2u << 24) | (0x11u << 16) | 3000u));
    const Rule back = decode(hotValue);
    CHECK(back.sensor == 2 && back.flags == 0x11 && back.threshold == 3000);
    // Negative threshold round trip (-5.00 C), <= and off.
    const Rule cold = {2, static_cast<uint8_t>(0x01 | kBelow), -500};
    CHECK(decode(encode(cold)).threshold == -500);
    CHECK(encode(cold) < 0x80000000u);  // Fits a signed 32-bit JSON number.

    CHECK(isValid(0, 3, 0x01));
    CHECK(isValid(hotValue, 3, 0x01));
    CHECK(!isValid(encode(Rule{4, 0x11, 1}), 3, 0x01));   // Sensor 4 on a 3-sensor board.
    CHECK(!isValid(encode(Rule{0, 0x11, 1}), 3, 0x01));   // No sensor but not empty.
    CHECK(!isValid(encode(Rule{2, 0x12, 1}), 3, 0x01));   // Port 2 not allowed.
    CHECK(!isValid(encode(Rule{2, 0x10, 1}), 3, 0x01));   // No port.
    CHECK(!isValid(encode(Rule{2, 0x41, 1}), 3, 0x01));   // Unknown flag bit.
    CHECK(!isValid(0xFFFFFFFFu, 6, 0x03));                // Blank EEPROM.

    // Hysteresis pair: >= 30.00 on, <= 28.00 off.
    Rule rules[kRuleCount] = {hot, {2, 0x01 | kBelow, 2800}};
    const bool readable[kRuleCount] = {true, true};
    EdgeTracker edges;
    int32_t r1[kRuleCount] = {2900, 2900};
    Actions a = edges.update(rules, readable, r1);
    CHECK(a.onMask == 0 && a.offMask == 0);
    int32_t r2[kRuleCount] = {3000, 3000};
    a = edges.update(rules, readable, r2);
    CHECK(a.onMask == 0x01 && a.offMask == 0);
    a = edges.update(rules, readable, r2);                 // Still hot: nothing again.
    CHECK(a.onMask == 0 && a.offMask == 0);
    int32_t r3[kRuleCount] = {2800, 2800};
    a = edges.update(rules, readable, r3);
    CHECK(a.onMask == 0 && a.offMask == 0x01);
    // Unreadable sensor: skipped, state kept (no new edge when it comes back).
    const bool unreadable[kRuleCount] = {false, false};
    int32_t r4[kRuleCount] = {3500, 3500};
    a = edges.update(rules, unreadable, r4);
    CHECK(a.onMask == 0 && a.offMask == 0);
    // Reset (rule saved again): acts at once if the condition holds.
    edges.reset(1);
    a = edges.update(rules, readable, r3);
    CHECK(a.offMask == 0x01);
    // Both rules true on the same port: left unchanged.
    Rule clash[kRuleCount] = {{1, 0x01 | kActionOn, 0}, {3, 0x01, 0}};
    EdgeTracker fresh;
    int32_t r5[kRuleCount] = {10, 10};
    a = fresh.update(clash, readable, r5);
    CHECK(a.onMask == 0 && a.offMask == 0);
}


// Little-endian EEPROM values and the big-endian UDP header fields.
static void testByteCodec()
{
    uint8_t bytes[8];
    le32::encode(0x02110BB8u, bytes);
    CHECK(bytes[0] == 0xB8 && bytes[1] == 0x0B && bytes[2] == 0x11 && bytes[3] == 0x02);
    CHECK(le32::decode(bytes) == 0x02110BB8u);

    be::put16(bytes, 0x1234);
    CHECK(bytes[0] == 0x12 && bytes[1] == 0x34 && be::get16(bytes) == 0x1234);
    be::put32(bytes, 0xA1B2C3D4u);
    CHECK(bytes[0] == 0xA1 && bytes[3] == 0xD4 && be::get32(bytes) == 0xA1B2C3D4u);
    be::put64(bytes, 0x0102030405060708ull);
    CHECK(bytes[0] == 0x01 && bytes[7] == 0x08 && be::get(bytes, 8) == 0x0102030405060708ull);
}

// Minute bookkeeping of ScheduleEngine::process(): catch-up, run once, missed ONCE.
static void testEvaluation()
{
    const int64_t day = kWed_2026_11_04;
    const int64_t at0730 = day * kMinutesPerDay + 7 * 60 + 30;
    CHECK(occurrenceMinute(weekly(7, 30, kMonToFri, 0x01, 0x01), day) == at0730);

    // First valid clock, normal step, long delay, clock moved back.
    CatchUp c = catchUpWindow(-1, at0730, 5);
    CHECK(c.lastEvaluatedMinute == at0730 - 1 && c.skippedMinutes == 0);
    c = catchUpWindow(at0730 - 3, at0730, 5);
    CHECK(c.lastEvaluatedMinute == at0730 - 3 && c.skippedMinutes == 0);
    c = catchUpWindow(at0730 - 5, at0730, 5);
    CHECK(c.lastEvaluatedMinute == at0730 - 5 && c.skippedMinutes == 0);
    c = catchUpWindow(at0730 - 60, at0730, 5);
    CHECK(c.lastEvaluatedMinute == at0730 - 5 && c.skippedMinutes == 55);
    c = catchUpWindow(at0730 + 10, at0730, 5);
    CHECK(c.lastEvaluatedMinute == at0730 - 1 && c.skippedMinutes == 0);
    // Restart inside an evaluated minute (minute restored from RTC memory):
    // that minute is not evaluated again.
    c = catchUpWindow(at0730, at0730, 5);
    CHECK(c.lastEvaluatedMinute == at0730 && c.skippedMinutes == 0);

    // Weekly: due at its minute on its days, once per day.
    Entry w = weekly(7, 30, kMonToFri, 0x01, 0x01);
    CHECK(shouldRun(w, at0730));
    CHECK(!shouldRun(w, at0730 + 1));
    CHECK(!shouldRun(w, at0730 + 3 * kMinutesPerDay));  // Saturday.
    markRun(w, at0730);
    CHECK(w.day == kWed_2026_11_04 && !shouldRun(w, at0730));
    CHECK(shouldRun(w, at0730 + kMinutesPerDay));  // Thursday.
    Entry disabled = weekly(7, 30, kMonToFri, 0x01, 0x01);
    disabled.flags = kFlagUsed;
    CHECK(!shouldRun(disabled, at0730));

    // Once: runs on its date, then is done; a missed one expires.
    Entry once = weekly(7, 30, kWeekdayOnce, 0x01, 0x01);
    once.day = kWed_2026_11_04;
    CHECK(shouldRun(once, at0730) && !shouldRun(once, at0730 + 7 * kMinutesPerDay));
    CHECK(!missedOnce(once, at0730 - 1) && missedOnce(once, at0730));
    markRun(once, at0730);
    CHECK((once.flags & kFlagDone) != 0 && !shouldRun(once, at0730) && !missedOnce(once, at0730));

    // Update: the last-run day survives an edit that keeps the time of day.
    Entry previous = weekly(7, 30, kMonToFri, 0x01, 0x01);
    previous.day = kWed_2026_11_04;
    Entry edited = weekly(7, 30, kMonToFri, 0x03, 0x03);
    keepLastRunDay(previous, edited);
    CHECK(edited.day == kWed_2026_11_04);
    Entry moved = weekly(8, 0, kMonToFri, 0x01, 0x01);
    keepLastRunDay(previous, moved);
    CHECK(moved.day == 0);
}

// Merged action -> device commands: one OFF, one ON per auto OFF value.
static void testBuildCommands()
{
    PortAction action = {};
    Command commands[kMaxCommandsPerMinute];
    CHECK(buildCommands(action, commands) == 0);

    action.offMask = 0x04;
    action.onMask = 0x0B;  // Ports 0, 1, 3.
    action.autoOff[0] = 600;
    action.autoOff[1] = 0;
    action.autoOff[3] = 600;
    const size_t count = buildCommands(action, commands);
    CHECK(count == 3);
    CHECK(commands[0].mask == 0x04 && commands[0].state == 0 && commands[0].autoOff == 0);
    CHECK(commands[1].mask == 0x09 && commands[1].state == 0x09 && commands[1].autoOff == 600);
    CHECK(commands[2].mask == 0x02 && commands[2].state == 0x02 && commands[2].autoOff == 0);

    // Worst case: every port on with its own auto OFF still fits the bound.
    PortAction all = {};
    all.onMask = 0xFF;
    for (uint8_t port = 0; port < ports::kCount; ++port) all.autoOff[port] = static_cast<uint16_t>(port + 1);
    CHECK(buildCommands(all, commands) == ports::kCount);

    // From due entries: two schedules on different ports in the same minute.
    const Entry a = weekly(7, 30, kMonToFri, 0x01, 0x01, 300);
    const Entry b = weekly(7, 30, kMonToFri, 0x02, 0x00);
    const Entry* due[] = {&a, &b};
    mergeDue(due, 2, action);
    CHECK(buildCommands(action, commands) == 2);
    CHECK(commands[0].mask == 0x02 && commands[0].state == 0);
    CHECK(commands[1].mask == 0x01 && commands[1].autoOff == 300);
}

// EEPROM region image: header, slot layout, CRC and validation on load.
static void testRegion()
{
    Entry table[kSlotCount] = {};
    table[0] = weekly(7, 30, kMonToFri, 0x01, 0x01, 600);
    table[0].day = kWed_2026_11_04;  // Weekly last-run day: RAM only.
    table[4] = weekly(18, 0, kWeekdayOnce, 0x01, 0x00);
    table[4].day = kWed_2026_11_04;
    uint8_t region[kRegionSize];
    encodeRegion(table, region);
    CHECK(region[0] == 'S' && region[1] == 'C' && region[2] == SCHEDULE_EEPROM_VERSION &&
          region[3] == SCHEDULE_MAX_COUNT);
    CHECK(recordOffset(0) == 4 && metaOffset(0) == 4 + SCHEDULE_MAX_COUNT * kRecordSize);
    CHECK(region[recordOffset(0)] == 7 && region[recordOffset(0) + 1] == 30);
    CHECK(region[recordOffset(1)] == 0 && region[metaOffset(1) + 4] == 0);  // Empty slot is zeros.

    Entry loaded[kSlotCount];
    RegionLoad load = decodeRegion(region, 0x03, loaded);
    CHECK(load.headerValid && !load.needsRewrite);
    CHECK(load.slots[0] == SlotLoad::Loaded && load.slots[4] == SlotLoad::Loaded);
    CHECK(load.slots[1] == SlotLoad::Empty);
    CHECK(sameDefinition(loaded[0], table[0]) && loaded[0].day == 0);
    CHECK(loaded[4].day == kWed_2026_11_04);

    uint8_t corrupt[kRegionSize];
    std::memcpy(corrupt, region, sizeof(corrupt));
    corrupt[recordOffset(4)] ^= 0x01;  // CRC mismatch.
    load = decodeRegion(corrupt, 0x03, loaded);
    CHECK(load.needsRewrite && load.slots[4] == SlotLoad::CrcError && !isUsed(loaded[4]));
    CHECK(load.slots[0] == SlotLoad::Loaded);

    load = decodeRegion(region, 0x02, loaded);  // Port bit0 no longer allowed.
    CHECK(load.needsRewrite && load.slots[0] == SlotLoad::InvalidData && !isUsed(loaded[0]));

    uint8_t blank[kRegionSize];
    std::memset(blank, 0xFF, sizeof(blank));
    load = decodeRegion(blank, 0x03, loaded);
    CHECK(!load.headerValid && load.needsRewrite && !isUsed(loaded[0]));
}

// Output priority of TaskDevice (PortArbiter.h header comment).
static void testPortArbiter()
{
    using namespace port_arbiter;
    const int64_t t0 = 1800000000;
    Report report;

    // Ports that do not exist never switch.
    Arbiter arbiter(0x03, 0x01);
    const DirectCommand allOn = {0, 0xFF};  // Legacy com:1 without mask.
    Inputs in;
    in.directs = &allOn;
    in.directCount = 1;
    in.nowEpoch = t0;
    CHECK(arbiter.step(0x00, in, report) == 0x03);

    // A direct command in the same cycle wins over a schedule event.
    Arbiter a2(0x03, 0x01);
    const ScheduleEvent on = {0x01, 0x01, 600};
    const DirectCommand off = {0x01, 0x00};
    Inputs both;
    both.schedules = &on;
    both.scheduleCount = 1;
    both.directs = &off;
    both.directCount = 1;
    both.nowEpoch = t0;
    CHECK(a2.step(0x00, both, report) == 0x00 && report.autoOffCancelled == 0x01);

    // Schedule ON with auto OFF, then the auto OFF fires.
    Arbiter a3(0x03, 0x01);
    Inputs sched;
    sched.schedules = &on;
    sched.scheduleCount = 1;
    sched.nowEpoch = t0;
    uint8_t port = a3.step(0x00, sched, report);
    CHECK(port == 0x01);
    Inputs later;
    later.nowEpoch = t0 + 600;
    port = a3.step(port, later, report);
    CHECK(port == 0x00 && report.autoOffSwitched == 0x01);

    // Commands are applied in arrival order: the last one wins.
    Arbiter a4(0x03, 0x01);
    const DirectCommand sequence[] = {{0x03, 0x03}, {0x02, 0x00}};
    Inputs seq;
    seq.directs = sequence;
    seq.directCount = 2;
    CHECK(a4.step(0x00, seq, report) == 0x01);

    // Button toggles its port; threshold and countdown follow.
    Arbiter a5(0x03, 0x01);
    Inputs button;
    button.buttonToggle = true;
    CHECK(a5.step(0x00, button, report) == 0x01);
    CHECK(a5.step(0x01, button, report) == 0x00);
    Inputs thresholds;
    thresholds.thresholdOn = 0x02;
    thresholds.thresholdOff = 0x01;
    CHECK(a5.step(0x01, thresholds, report) == 0x02);
    Inputs countdown;
    countdown.countdownOn = 0x01;
    countdown.thresholdOff = 0x01;  // Countdown runs after the threshold: it wins.
    CHECK(a5.step(0x00, countdown, report) == 0x01);

    // The on-timer runs last: a port on for too long goes off whatever switched it on.
    Arbiter a6(0x03, 0x01);
    Inputs timer;
    timer.onTimerSeconds = 5;
    timer.nowMs = 1000;
    CHECK(a6.step(0x01, timer, report) == 0x01);
    timer.nowMs = 6000;
    CHECK(a6.step(0x01, timer, report) == 0x00 && report.onTimerExpired == 0x01);
}

// PM2.5 -> US EPA AQI (2024 breakpoints).
static void testAirQuality()
{
    using air_quality::pm25ToAqi;
    CHECK(pm25ToAqi(0) == 0);
    CHECK(pm25ToAqi(9) == 50);
    CHECK(pm25ToAqi(10) == 53);
    CHECK(pm25ToAqi(35) == 99);
    CHECK(pm25ToAqi(55) == 149);
    CHECK(pm25ToAqi(100) == 182);
    CHECK(pm25ToAqi(225) == 300);
    CHECK(pm25ToAqi(325) == 499);
    CHECK(pm25ToAqi(326) == 500);
    CHECK(pm25ToAqi(1000) == 500);
}

int main()
{
    testCalendar();
    testWeekdayMatch();
    testEncoding();
    testValidation();
    testConflicts();
    testPortController();
    testIdempotentDefinition();
    testConfigurationOnly();
    testSettings();
    testOnTimer();
    testCountdown();
    testThreshold();
    testByteCodec();
    testEvaluation();
    testBuildCommands();
    testRegion();
    testPortArbiter();
    testAirQuality();
    if (failures == 0) std::printf("All core logic tests passed\n");
    return failures == 0 ? 0 : 1;
}
