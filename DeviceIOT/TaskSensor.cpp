
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

#define DHTPIN 7 // what digital 
#define DHTTYPE DHT11  //DHT 11


DHT dht (DHTPIN, DHTTYPE); //Initialize DHT sensor.
PMS pms(Serial);
PMS::DATA data;

InfoSensor dataSensor;

#if SUPPORT_RTOS
static SemaphoreHandle_t sensorDataMutex = NULL;
#endif

static const uint32_t SENSOR_TASK_INTERVAL_MS = 1000; // Adjustable interval (ms)
static uint8_t sensorReadStep = 0; // 0..3 read schedule

void TaskSensor::setup(void){
    dataSensor.valueHumi =0;
    dataSensor.valueTemp =0;
    dataSensor.valueDust =0;
    dataSensor.valueDust_PM2_5 =0;
    dataSensor.valueDust_PM10 =0;
    dataSensor.valueDust_PM1 =0;

    dataSensor.valueControl =0;
    dht.begin();
    Serial1.begin(9600);   // GPIO1, GPIO3 (TX/RX pin on ESP-12E Development Board)
        //Configuro la porta Serial2 (tutti i parametri hanno anche un get per effettuare controlli)

#if SUPPORT_RTOS
    if (sensorDataMutex == NULL) {
        sensorDataMutex = xSemaphoreCreateMutex();
        if (sensorDataMutex == NULL) {
            Serial.println("TaskSensor: ERROR create sensorDataMutex");
        }
    }
#endif
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

void TaskSensor::taskRun(void * parameter) {
    using SensorReadFn = void (*)();
    static SensorReadFn readOps[4] = {
        TaskSensor::readSensor,
        TaskSensor::readSensorDust,
        TaskSensor::readSensorTemp,
        TaskSensor::readSensorHumi
    };

    for(;;)
    {
        // Chu kỳ 1 giây / step: 0..3
        if (sensorReadStep >= 4) {
            sensorReadStep = 0;
        }

#if SUPPORT_RTOS
        if (sensorDataMutex != NULL) {
            if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
                readOps[sensorReadStep]();
                xSemaphoreGive(sensorDataMutex);
            }
        } else {
            readOps[sensorReadStep]();
        }
#else
        readOps[sensorReadStep]();
#endif

#if SUPPORT_RTOS
        if (sensorDataQueue != NULL) {
            // Luôn gửi bản ghi hiện tại mỗi lúc sau khi cập nhật ô cùng
            xQueueSend(sensorDataQueue, &dataSensor, pdMS_TO_TICKS(100));
        }
        if (sensorDataMutex != NULL) {
            // có thể dùng mutex nếu cần đọc dataSensor ở nơi khác, có thể for dữ liệu trên queue
            if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(10)) == pdTRUE) {
                MemoryData::GetInstance().sensorData_ = &dataSensor;
                xSemaphoreGive(sensorDataMutex);
            }
        } else {
            MemoryData::GetInstance().sensorData_ = &dataSensor;
        }
        vTaskDelay(SENSOR_TASK_INTERVAL_MS / portTICK_PERIOD_MS);
#else
        MemoryData::GetInstance().sensorData_ = &dataSensor;
        delay(SENSOR_TASK_INTERVAL_MS);
#endif

        sensorReadStep++;
    }
}
