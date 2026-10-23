#include "TaskSensor.h"

#include <DHT.h>
#include <math.h>

#include "DebugInfo.h"
#include "MemoryData.h"
#include "PlatformCompat.h"

#if SUPPORT_RTOS
extern QueueHandle_t sensorDataQueue;
#endif

namespace {
DHT dht(DHT_PIN, DHT_TYPE);
InfoSensor latestSensor = {};

#if SUPPORT_RTOS
SemaphoreHandle_t sensorMutex = nullptr;
#endif

uint32_t lastAdcReadMs = 0;
uint32_t lastDhtReadMs = 0;

#if SUPPORT_RTOS
TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif

void publishLatest() {
    latestSensor.sampleSequence++;
    MemoryData::GetInstance().sensorData_ = &latestSensor;

#if SUPPORT_RTOS
    if (sensorDataQueue != nullptr) {
        // Telemetry is stateful; losing an old reading is preferable to blocking
        // the sensor task and starving Wi-Fi/FreeRTOS.
        (void)xQueueOverwrite(sensorDataQueue, &latestSensor);
    }
#endif
}
} // namespace

void TaskSensor::setup() {
    latestSensor = {};
    dht.begin();

#if SUPPORT_RTOS
    if (sensorMutex == nullptr) {
        sensorMutex = xSemaphoreCreateMutex();
        if (sensorMutex == nullptr) {
            DEVICE_LOG_ERROR("[Sensor] Cannot create sensor mutex");
        }
    }
#endif

    MemoryData::GetInstance().sensorData_ = &latestSensor;
    DEVICE_LOG_INFO("[Sensor] DHT11 and ADC initialized");
}

void TaskSensor::sampleAdc() {
    uint32_t sum = 0;
    for (uint8_t i = 0; i < ADC_SAMPLE_COUNT; ++i) {
        sum += static_cast<uint16_t>(analogRead(A0));
    }
    latestSensor.valueAdc = static_cast<uint16_t>(sum / ADC_SAMPLE_COUNT);
}

void TaskSensor::sampleDht() {
    const float humidity = dht.readHumidity();
    const float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
        latestSensor.dhtValid = false;
        DEVICE_LOG_WARNING("[Sensor] DHT11 read failed; retaining last valid sample");
        return;
    }

    latestSensor.valueHumi = static_cast<int16_t>(humidity * 100.0f);
    latestSensor.valueTemp = static_cast<int16_t>(temperature * 100.0f);
    latestSensor.dhtValid = true;
}

bool TaskSensor::copyLatest(InfoSensor& destination) {
#if SUPPORT_RTOS
    if (sensorMutex != nullptr) {
        if (xSemaphoreTake(sensorMutex, delayTicks(10)) != pdTRUE) {
            return false;
        }
        destination = latestSensor;
        xSemaphoreGive(sensorMutex);
        return true;
    }
#endif
    destination = latestSensor;
    return true;
}

void TaskSensor::taskRun(void* parameter) {
    (void)parameter;

#if SUPPORT_RTOS
    for (;;) {
#else
    {
#endif
        const uint32_t now = millis();
        bool changed = false;

#if SUPPORT_RTOS
        const bool locked = sensorMutex == nullptr ||
            xSemaphoreTake(sensorMutex, delayTicks(10)) == pdTRUE;
        if (!locked) {
            vTaskDelay(delayTicks(SENSOR_TASK_POLL_MS));
            continue;
        }
#endif

        if (now - lastAdcReadMs >= ADC_READ_INTERVAL_MS || lastAdcReadMs == 0) {
            lastAdcReadMs = now;
            sampleAdc();
            changed = true;
        }
        if (now - lastDhtReadMs >= DHT_READ_INTERVAL_MS || lastDhtReadMs == 0) {
            lastDhtReadMs = now;
            sampleDht();
            changed = true;
        }
        if (changed) {
            publishLatest();
        }

#if SUPPORT_RTOS
        if (sensorMutex != nullptr) {
            xSemaphoreGive(sensorMutex);
        }
        vTaskDelay(delayTicks(SENSOR_TASK_POLL_MS));
#endif
    }
}
