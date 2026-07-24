
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
#include <Wire.h>
#include <Adafruit_VL53L0X.h>
#include "Common.h"
#include "DebugInfo.h"

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

InfoSensor dataSensor;

#if SUPPORT_RTOS
static SemaphoreHandle_t sensorDataMutex = NULL;
#endif

static uint8_t sensorReadStep = 0; // 0..1 read schedule

void TaskSensor::setup(void){
    DEVICE_LOG_INFO("start TaskSensor::setup");
    dataSensor.distance_mm =0;
    dataSensor.valueDust =0;
    dataSensor.valueDust_PM2_5 =0;
    dataSensor.valueDust_PM10 =0;
    dataSensor.valueDust_PM1 =0;

    dataSensor.valueControl =0;
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
    if (!lox.begin()) {
        Serial.println("TaskSensor: Failed to find VL53L0X sensor!");
    }
    Serial1.begin(SENSOR_SERIAL_BAUD_RATE);   // GPIO1, GPIO3 (TX/RX pin on ESP-12E Development Board)
        //Configuro la porta Serial2 (tutti i parametri hanno anche un get per effettuare controlli)

#if SUPPORT_RTOS
    if (sensorDataMutex == NULL) {
        sensorDataMutex = xSemaphoreCreateMutex();
        if (sensorDataMutex == NULL) {
            Serial.println("TaskSensor: ERROR create sensorDataMutex");
        }
    }
#endif
    DEVICE_LOG_INFO("end TaskSensor::setup");
}

void TaskSensor::readSensor(void){
    dataSensor.valueControl =0;
}
void TaskSensor::readSensorDistance(void){
    uint16_t range = lox.readRangeSingleMillimeters();
    if (lox.timeoutOccurred()) {
        range = 0;
    }

    dataSensor.distance_mm = range;
    dataSensor.valueDust = 0;
    dataSensor.valueDust_PM2_5 = 0;
    dataSensor.valueDust_PM10 = 0;
    dataSensor.valueDust_PM1 = 0;
}

#if SUPPORT_RTOS
extern QueueHandle_t sensorDataQueue;
#endif

using SensorReadFn = void (*)();
static SensorReadFn readOps[2] = {
    TaskSensor::readSensor,
    TaskSensor::readSensorDistance
};


void updateMemoryStatus(void){
    MemoryData::GetInstance().sensorData_->distance_mm = dataSensor.distance_mm;
    MemoryData::GetInstance().sensorData_->valueDust = dataSensor.valueDust;
    MemoryData::GetInstance().sensorData_->valueDust_PM2_5 = dataSensor.valueDust_PM2_5;
    MemoryData::GetInstance().sensorData_->valueDust_PM10 = dataSensor.valueDust_PM10;
    MemoryData::GetInstance().sensorData_->valueDust_PM1 = dataSensor.valueDust_PM1;
    MemoryData::GetInstance().sensorData_->valueControl = dataSensor.valueControl;
}

void TaskSensor::taskRun(void * parameter) {
    //DEVICE_LOG_INFO("start TaskSensor::taskRun");
  
    #if SUPPORT_RTOS
        for(;;)
        {
            // Chu kỳ 1 giây / step: 0..3
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
                // Luôn gửi bản ghi hiện tại mỗi lúc sau khi cập nhật ô cùng
                xQueueSend(sensorDataQueue, &dataSensor, pdMS_TO_TICKS(SENSOR_QUEUE_SEND_DELAY_MS));
            }
            if (sensorDataMutex != NULL) {
                // có thể dùng mutex nếu cần đọc dataSensor ở nơi khác, có thể for dữ liệu trên queue
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
         // Chu kỳ 1 giây / step: 0..3
        if (sensorReadStep >= SENSOR_READ_STEP_COUNT) {
            sensorReadStep = 0;
        }
        readOps[sensorReadStep]();
        
        delay(SENSOR_TASK_INTERVAL_MS);
        sensorReadStep++;
    #endif

    
}
