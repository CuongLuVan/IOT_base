
#include "TaskSensor.h"
#include "MemoryData.h"
#include "define_All.h"
#include "HighSpeedSampler.h"

#if SUPPORT_RTOS
  #include "freertos/FreeRTOS.h"
  #include "freertos/task.h"
  #include "freertos/queue.h"
#endif

// =====================================================================
// Platform-specific sensor includes
// =====================================================================
#if PLATFORM_ESP32
  #include "driver/uart.h"
  #include "esp_log.h"
  #include "driver/gpio.h"
  #include "sdkconfig.h"
  #include "esp_intr_alloc.h"
  #include "soc/uart_reg.h"
  #include "soc/uart_struct.h"
  #include "esp_task_wdt.h"
#elif PLATFORM_ESP8266
  // ESP8266 does not have these ESP-IDF drivers;
  // standard Arduino functions are used instead.
#endif

#include <DHT.h>
#include "PMS.h"
#include "Common.h"
#include "DebugInfo.h"

DHT dht (DHT_PIN, DHT_TYPE); //Initialize DHT sensor.
PMS pms(Serial);
PMS::DATA data;

InfoSensor dataSensor;

#if SUPPORT_RTOS
static SemaphoreHandle_t sensorDataMutex = NULL;
#endif

static uint8_t sensorReadStep = 0; // 0..3 read schedule

void TaskSensor::setup(void){
    DEVICE_LOG_INFO("start TaskSensor::setup");
    dataSensor.valueHumi =0;
    dataSensor.valueTemp =0;
    dataSensor.valueDust =0;
    dataSensor.valueDust_PM2_5 =0;
    dataSensor.valueDust_PM10 =0;
    dataSensor.valueDust_PM1 =0;

    dataSensor.valueControl =0;
    if (!HighSpeedSampler::GetInstance().setup()) {
        DEVICE_LOG_INFO("[TaskSensor] High-speed sampler initialization failed");
    }
    dht.begin();

#if PLATFORM_ESP32
    Serial1.begin(SENSOR_SERIAL_BAUD_RATE);   // GPIO1, GPIO3 (TX/RX pin on ESP-12E Development Board)
#elif PLATFORM_ESP8266
    // ESP8266 Serial1 TX only (GPIO2). For PMS sensor, use SoftwareSerial or
    // share Serial. Using Serial for PMS on ESP8266.
    // Serial1 is TX-only on ESP8266, skip begin for RX sensor use.
#endif

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
int checkDataNumber = 0;
void TaskSensor::readSensorDust(void){

    if (pms.read(data))
    {
      dataSensor.valueDust_PM2_5 = data.PM_AE_UG_2_5;
      dataSensor.valueDust_PM1 = data.PM_AE_UG_1_0;
      dataSensor.valueDust_PM10 = data.PM_AE_UG_10_0;
      checkDataNumber = checkDataNumber/50;
      switch(dataSensor.valueDust_PM2_5){
        case 0:{ dataSensor.valueDust = dataSensor.valueDust_PM2_5*12/50;  break;}
        case 1:{ dataSensor.valueDust = dataSensor.valueDust_PM2_5*35/100;  break;}
        case 2:{ dataSensor.valueDust = dataSensor.valueDust_PM2_5*56/150;  break;}
        case 3:{ dataSensor.valueDust = dataSensor.valueDust_PM2_5*150/200; break;}
        default :{
            dataSensor.valueDust = dataSensor.valueDust_PM2_5*200/250;
            break;
        }        
      }
      
     /*
      Serial1.print("PM 1.0 (ug/m3): ");
      Serial1.println(data.PM_AE_UG_1_0);
      
      Serial1.print("PM 2.5 (ug/m3): ");
      Serial1.println(data.PM_AE_UG_2_5);
      Serial1.print("PM 10.0 (ug/m3): ");
      Serial1.println(data.PM_AE_UG_10_0);
      Serial1.println();*/
    }

}
void TaskSensor::readSensorTemp(void){
    dataSensor.valueTemp =(int) dht.readTemperature()*100;
}
void TaskSensor::readSensorHumi(void){
    dataSensor.valueHumi =(int) dht.readHumidity()*100;
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


void updateMemoryStatus(void){
    MemoryData::GetInstance().sensorData_->valueHumi = dataSensor.valueHumi;
    MemoryData::GetInstance().sensorData_->valueTemp = dataSensor.valueTemp;
    MemoryData::GetInstance().sensorData_->valueDust = dataSensor.valueDust;
    MemoryData::GetInstance().sensorData_->valueDust_PM2_5 = dataSensor.valueDust_PM2_5;
    MemoryData::GetInstance().sensorData_->valueDust_PM10 = dataSensor.valueDust_PM10;
    MemoryData::GetInstance().sensorData_->valueDust_PM1 = dataSensor.valueDust_PM1;
    MemoryData::GetInstance().sensorData_->valueControl = dataSensor.valueControl;
}

void TaskSensor::taskRun(void * parameter) {
#if SUPPORT_RTOS
    TickType_t lastSlowRead = xTaskGetTickCount();
    TickType_t lastIdleYield = lastSlowRead;
    for (;;) {
        HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
        if (sampler.processSensorTask()) {
            const TickType_t now = xTaskGetTickCount();
            if (now - lastIdleYield >= pdMS_TO_TICKS(1000)) {
                lastIdleYield = now;
                vTaskDelay(1);
            }
            continue;
        }

        const TickType_t now = xTaskGetTickCount();
        if (now - lastSlowRead >= pdMS_TO_TICKS(SENSOR_TASK_INTERVAL_MS)) {
            if (sensorReadStep >= SENSOR_READ_STEP_COUNT) {
                sensorReadStep = 0;
            }
            if (sensorDataMutex != NULL) {
                if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(SENSOR_MUTEX_WAIT_MS)) == pdTRUE) {
                    readOps[sensorReadStep]();
                    MemoryData::GetInstance().sensorData_ = &dataSensor;
                    xSemaphoreGive(sensorDataMutex);
                }
            } else {
                readOps[sensorReadStep]();
                MemoryData::GetInstance().sensorData_ = &dataSensor;
            }

            if (sensorDataQueue != NULL) {
                xQueueSend(sensorDataQueue, &dataSensor, 0);
            }
            ++sensorReadStep;
            lastSlowRead = now;
        }

        vTaskDelay(1);
    }
#else
    HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
    if (!sampler.processSensorTask()) {
        if (sensorReadStep >= SENSOR_READ_STEP_COUNT) {
            sensorReadStep = 0;
        }
        readOps[sensorReadStep]();
        updateMemoryStatus();
        ++sensorReadStep;
        delay(SENSOR_TASK_INTERVAL_MS);
    }
#endif
}
