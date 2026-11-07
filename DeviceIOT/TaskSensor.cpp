#include "TaskSensor.h"

#include <DHT.h>
#include <PMS.h>
#include <math.h>

#include "AirQuality.h"
#include "DebugInfo.h"
#include "HighSpeedSampler.h"
#include "Sync.h"
#include "TaskWatchdog.h"
#include "ThresholdControl.h"
#include "define_All.h"

// Once per build: see the DHT_PIN comment in board_pins.h.
#if (DHT_PIN == 0 || DHT_PIN == 2 || DHT_PIN == 5 || DHT_PIN == 12 || DHT_PIN == 15) && \
    !defined(DHT_PIN_STRAPPING_ACKNOWLEDGED)
#warning "DHT_PIN is an ESP32 strapping pin: the DHT pull-up can prevent boot (see board_pins.h)."
#endif

namespace {

// The PMS sends a frame about every second in active mode.
constexpr uint32_t kPmsStaleAfterMs = 10000;
// While a high-speed capture runs the task never blocks; it still sleeps one
// tick and feeds the task watchdog this often.
constexpr uint32_t kCaptureYieldIntervalMs = 1000;

// TaskSensor only.
DHT dht(DHT_PIN, DHT_TYPE);
PMS pms(PMS_SERIAL);
InfoSensor working = {};
uint32_t lastDhtReadMs = 0;
uint32_t lastPmsFrameMs = 0;
bool firstPass = true;
bool dhtFailureReported = false;
bool captureRunning = false;

// Published copy: written by TaskSensor, read by copyLatest() in other tasks.
InfoSensor published = {};
bool hasSample = false;

void sampleDht()
{
    const float humidity = dht.readHumidity();
    const float temperature = dht.readTemperature();
    if (isnan(humidity) || isnan(temperature)) {
        if (!dhtFailureReported) DEVICE_LOG_WARNING("[Sensor] DHT11 read failed; values marked invalid");
        dhtFailureReported = true;
        working.dhtValid = false;
        return;
    }
    working.valueHumi = static_cast<int16_t>(humidity * 100.0f);
    working.valueTemp = static_cast<int16_t>(temperature * 100.0f);
    working.dhtValid = true;
    dhtFailureReported = false;
}

// PMS::read() consumes one byte per call: drain everything received.
// Returns true when the dust values changed state.
bool pollPms(uint32_t nowMs)
{
    PMS::DATA data;
    bool frame = false;
    while (PMS_SERIAL.available() > 0) {
        if (pms.read(data)) frame = true;
    }
    if (frame) {
        working.valueDust_PM1 = data.PM_AE_UG_1_0;
        working.valueDust_PM2_5 = data.PM_AE_UG_2_5;
        working.valueDust_PM10 = data.PM_AE_UG_10_0;
        working.valueDust = air_quality::pm25ToAqi(data.PM_AE_UG_2_5);
        if (!working.pmsValid) DEVICE_LOG_INFO("[Sensor] PMS dust sensor online");
        working.pmsValid = true;
        lastPmsFrameMs = nowMs;
        return true;
    }
    if (working.pmsValid && nowMs - lastPmsFrameMs >= kPmsStaleAfterMs) {
        DEVICE_LOG_WARNING("[Sensor] No PMS frame; dust values marked invalid");
        working.pmsValid = false;
        return true;
    }
    return false;
}

void publishSample()
{
    working.sampleSequence++;
    {
        platform_sync::CriticalSection section;
        published = working;
        hasSample = true;
    }
    ThresholdControl::evaluate(working);
}

}  // namespace

void TaskSensor::setup()
{
    working = {};
    firstPass = true;
    if (!HighSpeedSampler::GetInstance().setup()) {
        DEVICE_LOG_ERROR("[Sensor] High-speed sampler initialization failed; capture disabled");
    }
    dht.begin();
    PMS_SERIAL.begin(SENSOR_SERIAL_BAUD_RATE, SERIAL_8N1, PMS_RX_PIN, PMS_TX_PIN);
    DEVICE_LOG_INFO("[Sensor] DHT11 and PMS initialized");
}

void TaskSensor::taskRun(void* parameter)
{
    (void)parameter;
    task_watchdog::add(task_watchdog::Slot::Sensor);
    uint32_t lastYieldMs = millis();
    for (;;) {
        service();
        const uint32_t now = millis();
        if (!captureRunning) {
            task_watchdog::reset(task_watchdog::Slot::Sensor);
            vTaskDelay(platform_sync::timeoutTicks(SENSOR_TASK_POLL_MS));
        } else if (now - lastYieldMs >= kCaptureYieldIntervalMs) {
            lastYieldMs = now;
            task_watchdog::reset(task_watchdog::Slot::Sensor);
            vTaskDelay(1);
        }
    }
}

void TaskSensor::service()
{
    const bool wasCapturing = captureRunning;
    captureRunning = HighSpeedSampler::GetInstance().processSensorTask();
    if (captureRunning) return;
    if (wasCapturing) {
        // The UART buffer overflowed during the capture: drop the partial
        // frames, and read the DHT now so the threshold rules see fresh values.
        while (PMS_SERIAL.available() > 0) (void)PMS_SERIAL.read();
        firstPass = true;
    }

    const uint32_t now = millis();
    bool changed = pollPms(now);
    if (firstPass || now - lastDhtReadMs >= DHT_READ_INTERVAL_MS) {
        lastDhtReadMs = now;
        sampleDht();
        changed = true;
    }
    firstPass = false;
    if (changed) publishSample();
}

bool TaskSensor::copyLatest(InfoSensor& destination)
{
    platform_sync::CriticalSection section;
    if (!hasSample) return false;
    destination = published;
    return true;
}
