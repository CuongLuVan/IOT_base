#include "TaskSensor.h"

#include <DHT.h>
#include <math.h>

#include "DebugInfo.h"
#include "Sync.h"
#include "TaskWatchdog.h"
#include "ThresholdControl.h"
#include "define_All.h"

#if SUPPORT_RTOS
// esp8266RTOS has no analogRead(): A0 is read with the SDK ADC driver.
#include <driver/adc.h>
#endif

namespace {

// TaskSensor only.
DHT dht(DHT_PIN, DHT_TYPE);
InfoSensor working = {};
uint32_t lastAdcReadMs = 0;
uint32_t lastDhtReadMs = 0;
bool firstPass = true;
bool dhtFailureReported = false;

// Published copy: written by TaskSensor, read by copyLatest() in other tasks.
InfoSensor published = {};
bool hasSample = false;

#if SUPPORT_RTOS
bool adcReady = false;

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
#else
void beginAdc() {}

uint16_t readA0()
{
    return static_cast<uint16_t>(analogRead(A0));
}
#endif

void sampleAdc()
{
    uint32_t sum = 0;
    for (uint8_t i = 0; i < ADC_SAMPLE_COUNT; ++i) sum += readA0();
    working.valueAdc = static_cast<uint16_t>(sum / ADC_SAMPLE_COUNT);
}

void sampleDht()
{
#if SUPPORT_RTOS
    // The DHT library holds DATA low with delay(20) = vTaskDelay(2) at the
    // 100 Hz tick of this core: 10..20 ms depending on the tick phase, while
    // the DHT11 needs at least 18 ms. Starting right after a tick makes the
    // pulse almost exactly 20 ms.
    vTaskDelay(1);
#endif
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
    dht.begin();
    beginAdc();
    DEVICE_LOG_INFO("[Sensor] DHT11 and ADC initialized");
}

void TaskSensor::taskRun(void* parameter)
{
    (void)parameter;
#if SUPPORT_RTOS
    task_watchdog::add(task_watchdog::Slot::Sensor);
    for (;;) {
        service();
        task_watchdog::reset(task_watchdog::Slot::Sensor);
        vTaskDelay(platform_sync::timeoutTicks(SENSOR_TASK_POLL_MS));
    }
#endif
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
