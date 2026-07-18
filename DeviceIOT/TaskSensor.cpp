
#include "TaskSensor.h"
#include "MemoryData.h"

#if SUPPORT_RTOS
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"
#endif

#include "driver/uart.h"
#include "esp_log.h"
#include "driver/gpio.h"
#include "sdkconfig.h"
#include "esp_intr_alloc.h"
#include "soc/uart_reg.h"
#include "soc/uart_struct.h"
#include "esp_task_wdt.h"
#include "define_All.h"
#include <DHT.h>
#include "PMS.h"
#include "Common.h"
#include "DebugInfo.h"
#include <Wire.h>
#include <math.h>

DHT dht(DHT_PIN, DHT_TYPE);
PMS pms(Serial);
PMS::DATA data;

InfoSensor dataSensor;

#if SUPPORT_RTOS
static SemaphoreHandle_t sensorDataMutex = NULL;
#endif

static uint8_t sensorReadStep = 0;
static bool mpuInitialized = false;
static float mpuRoll = 0.0f;
static float mpuPitch = 0.0f;
static float mpuYawRate = 0.0f;
static uint32_t lastMpuMicros = 0;

static bool initMPU6050(void) {
    Wire.begin(MPU6050_I2C_SDA_PIN, MPU6050_I2C_SCL_PIN);
    Wire.setClock(400000L);

    Wire.beginTransmission(0x68);
    Wire.write(0x6B);
    Wire.write(0x00);
    if (Wire.endTransmission() != 0) {
        return false;
    }

    Wire.beginTransmission(0x68);
    Wire.write(0x1A);
    Wire.write(0x00);
    if (Wire.endTransmission() != 0) {
        return false;
    }

    Wire.beginTransmission(0x68);
    Wire.write(0x1B);
    Wire.write(0x00);
    if (Wire.endTransmission() != 0) {
        return false;
    }

    Wire.beginTransmission(0x68);
    Wire.write(0x1C);
    Wire.write(0x00);
    if (Wire.endTransmission() != 0) {
        return false;
    }

    lastMpuMicros = micros();
    mpuInitialized = true;
    return true;
}

static void readMPU6050(void) {
    if (!mpuInitialized) {
        mpuInitialized = initMPU6050();
    }

    if (!mpuInitialized) {
        return;
    }

    Wire.beginTransmission(0x68);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    Wire.requestFrom(0x68, 14, true);

    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();
    int16_t gx = (Wire.read() << 8) | Wire.read();
    int16_t gy = (Wire.read() << 8) | Wire.read();
    int16_t gz = (Wire.read() << 8) | Wire.read();

    float accelX = ax / 16384.0f;
    float accelY = ay / 16384.0f;
    float accelZ = az / 16384.0f;
    float gyroX = gx / 131.0f;
    float gyroY = gy / 131.0f;
    float gyroZ = gz / 131.0f;

    uint32_t nowMicros = micros();
    float dt = (nowMicros - lastMpuMicros) / 1000000.0f;
    if (dt <= 0.0f || dt > 0.05f) {
        dt = 0.01f;
    }
    lastMpuMicros = nowMicros;

    float accelRoll = atan2f(accelY, accelZ) * 180.0f / PI;
    float accelPitch = atan2f(-accelX, sqrtf(accelY * accelY + accelZ * accelZ)) * 180.0f / PI;

    mpuRoll = 0.95f * (mpuRoll + gyroX * dt) + 0.05f * accelRoll;
    mpuPitch = 0.95f * (mpuPitch + gyroY * dt) + 0.05f * accelPitch;
    mpuYawRate = gyroZ;

    dataSensor.rollAngle = mpuRoll;
    dataSensor.pitchAngle = mpuPitch;
    dataSensor.yawRate = mpuYawRate;
}

bool TaskSensor::initMPU6050(void) {
    return ::initMPU6050();
}

void TaskSensor::setup(void) {
    DEVICE_LOG_INFO("start TaskSensor::setup");
    dataSensor.valueHumi = 0;
    dataSensor.valueTemp = 0;
    dataSensor.valueDust = 0;
    dataSensor.valueDust_PM2_5 = 0;
    dataSensor.valueDust_PM10 = 0;
    dataSensor.valueDust_PM1 = 0;
    dataSensor.valueControl = 0;
    dataSensor.rollAngle = 0.0f;
    dataSensor.pitchAngle = 0.0f;
    dataSensor.yawRate = 0.0f;

    dht.begin();
    Serial1.begin(SENSOR_SERIAL_BAUD_RATE);

#if SUPPORT_RTOS
    if (sensorDataMutex == NULL) {
        sensorDataMutex = xSemaphoreCreateMutex();
        if (sensorDataMutex == NULL) {
            Serial.println("TaskSensor: ERROR create sensorDataMutex");
        }
    }
#endif

    initMPU6050();
    DEVICE_LOG_INFO("end TaskSensor::setup");
}

void TaskSensor::readSensor(void) {
    readMPU6050();
    dataSensor.valueControl = 1;
}

int checkDataNumber = 0;
void TaskSensor::readSensorDust(void) {
    if (pms.read(data)) {
        dataSensor.valueDust_PM2_5 = data.PM_AE_UG_2_5;
        dataSensor.valueDust_PM1 = data.PM_AE_UG_1_0;
        dataSensor.valueDust_PM10 = data.PM_AE_UG_10_0;
        checkDataNumber = checkDataNumber / 50;
        switch (dataSensor.valueDust_PM2_5) {
            case 0: { dataSensor.valueDust = dataSensor.valueDust_PM2_5 * 12 / 50; break; }
            case 1: { dataSensor.valueDust = dataSensor.valueDust_PM2_5 * 35 / 100; break; }
            case 2: { dataSensor.valueDust = dataSensor.valueDust_PM2_5 * 56 / 150; break; }
            case 3: { dataSensor.valueDust = dataSensor.valueDust_PM2_5 * 150 / 200; break; }
            default: {
                dataSensor.valueDust = dataSensor.valueDust_PM2_5 * 200 / 250;
                break;
            }
        }
    }
}

void TaskSensor::readSensorTemp(void) {
    dataSensor.valueTemp = (int)dht.readTemperature() * 100;
}

void TaskSensor::readSensorHumi(void) {
    dataSensor.valueHumi = (int)dht.readHumidity() * 100;
}

#if SUPPORT_RTOS
extern QueueHandle_t sensorDataQueue;
#endif

using SensorReadFn = void (*)();
static SensorReadFn readOps[4] = {
    TaskSensor::readSensor,
    TaskSensor::readSensorDust,
    TaskSensor::readSensorTemp,
    TaskSensor::readSensorHumi
};

void updateMemoryStatus(void) {
    MemoryData::GetInstance().sensorData_->valueHumi = dataSensor.valueHumi;
    MemoryData::GetInstance().sensorData_->valueTemp = dataSensor.valueTemp;
    MemoryData::GetInstance().sensorData_->valueDust = dataSensor.valueDust;
    MemoryData::GetInstance().sensorData_->valueDust_PM2_5 = dataSensor.valueDust_PM2_5;
    MemoryData::GetInstance().sensorData_->valueDust_PM10 = dataSensor.valueDust_PM10;
    MemoryData::GetInstance().sensorData_->valueDust_PM1 = dataSensor.valueDust_PM1;
    MemoryData::GetInstance().sensorData_->valueControl = dataSensor.valueControl;
    MemoryData::GetInstance().sensorData_->rollAngle = dataSensor.rollAngle;
    MemoryData::GetInstance().sensorData_->pitchAngle = dataSensor.pitchAngle;
    MemoryData::GetInstance().sensorData_->yawRate = dataSensor.yawRate;
}

void TaskSensor::taskRun(void * parameter) {
#if SUPPORT_RTOS
    for (;;) {
        if (sensorReadStep >= SENSOR_READ_STEP_COUNT) {
            sensorReadStep = 0;
        }
        if (sensorDataMutex != NULL) {
            if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
                readOps[sensorReadStep]();
                xSemaphoreGive(sensorDataMutex);
            }
        } else {
            readOps[sensorReadStep]();
        }

        if (sensorDataQueue != NULL) {
            xQueueSend(sensorDataQueue, &dataSensor, pdMS_TO_TICKS(SENSOR_QUEUE_SEND_DELAY_MS));
        }
        if (sensorDataMutex != NULL) {
            if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(SENSOR_MUTEX_WAIT_MS)) == pdTRUE) {
                MemoryData::GetInstance().sensorData_ = &dataSensor;
                xSemaphoreGive(sensorDataMutex);
            }
        } else {
            MemoryData::GetInstance().sensorData_ = &dataSensor;
        }
        vTaskDelay(SENSOR_TASK_INTERVAL_MS / portTICK_PERIOD_MS);
        sensorReadStep++;
    }
#else
    updateMemoryStatus();
    if (sensorReadStep >= 4) {
        sensorReadStep = 0;
    }
    readOps[sensorReadStep]();
    delay(SENSOR_TASK_INTERVAL_MS);
    sensorReadStep++;
#endif
}
