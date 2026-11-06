// Host unit tests for ScheduleCore.h and the logic of OnTimer.h / Countdown.h / ThresholdControl.h (no Arduino needed).
//   g++ -std=c++17 -Wall -Wextra -I.. schedule_core_test.cpp -o schedule_core_test && ./schedule_core_test
// Arduino IDE does not compile this folder (only the sketch root and src/).

#include <cstdio>
#include <cstring>

#include "../ScheduleCore.h"
#include "../OnTimer.h"
#include "../Countdown.h"
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
    on_timer::encode(86400, bytes);
    CHECK(bytes[0] == 0x80 && bytes[1] == 0x51 && bytes[2] == 0x01 && bytes[3] == 0x00);
    CHECK(on_timer::decode(bytes) == 86400);
    const uint8_t blank[4] = {0xFF, 0xFF, 0xFF, 0xFF};
    CHECK(!on_timer::isValid(on_timer::decode(blank)));
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
    if (failures == 0) std::printf("All schedule core tests passed\n");
    return failures == 0 ? 0 : 1;
}
