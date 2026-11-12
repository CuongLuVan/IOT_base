#include "TaskSensor.h"

#include "DebugInfo.h"
#include "DhtSensor.h"
#include "Platform.h"
#include "Sync.h"
#include "TaskWatchdog.h"
#include "ThresholdControl.h"
#include "define_All.h"
#include "driver/adc.h"

namespace {

// TaskSensor only.
DhtSensor dht;
InfoSensor working = {};
uint32_t lastAdcReadMs = 0;
uint32_t lastDhtReadMs = 0;
bool firstPass = true;
bool dhtFailureReported = false;
bool adcReady = false;

// Published copy: written by TaskSensor, read by copyLatest() in other tasks.
InfoSensor published = {};
bool hasSample = false;

// A0 / TOUT with the SDK ADC driver.
void beginAdc()
{
    adc_config_t config = {};
    config.mode = ADC_READ_TOUT_MODE;
    config.clk_div = 8;
    adcReady = adc_init(&config) == ESP_OK;
    if (!adcReady) DEVICE_LOG_ERROR("[Sensor] ADC driver initialization failed; A0 disabled");
}

uint16_t readA0()
{
    uint16_t raw = 0;
    return adcReady && adc_read(&raw) == ESP_OK ? raw : 0;
}

void sampleAdc()
{
    uint32_t sum = 0;
    for (uint8_t i = 0; i < ADC_SAMPLE_COUNT; ++i) sum += readA0();
    working.valueAdc = static_cast<uint16_t>(sum / ADC_SAMPLE_COUNT);
}

void sampleDht()
{
    float humidity = 0;
    float temperature = 0;
    if (!dht.read(humidity, temperature)) {
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
    dht.begin(DHT_PIN);
    beginAdc();
    DEVICE_LOG_INFO("[Sensor] DHT11 and ADC initialized");
}

void TaskSensor::taskRun(void* parameter)
{
    (void)parameter;
    task_watchdog::add(task_watchdog::Slot::Sensor);
    for (;;) {
        service();
        task_watchdog::reset(task_watchdog::Slot::Sensor);
        vTaskDelay(platform_sync::timeoutTicks(SENSOR_TASK_POLL_MS));
    }
}

void TaskSensor::service()
{
    const uint32_t now = millis();
    bool changed = false;
    if (firstPass || now - lastAdcReadMs >= ADC_READ_INTERVAL_MS) {
        lastAdcReadMs = now;
        sampleAdc();
        changed = true;
    }
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
