
#include "TaskSensor.h"
#include "MemoryData.h"
#include <Wire.h>
#include <math.h>

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

#define MPU6050_ADDR 0x68
#define MPU6050_PWR_MGMT_1 0x6B
#define MPU6050_ACCEL_XOUT_H 0x3B

DHT dht (DHT_PIN, DHT_TYPE); //Initialize DHT sensor.
PMS pms(Serial);
PMS::DATA data;

InfoSensor dataSensor;
static bool mpuReady = false;
static float mpuRollAngle = 0.0f;
static float mpuPitchAngle = 0.0f;
static float mpuYawRate = 0.0f;

static void writeMpuRegister(uint8_t reg, uint8_t value)
{
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(reg);
    Wire.write(value);
    Wire.endTransmission(true);
}

static void initMpu6050(void)
{
    Wire.begin(MPU6050_SDA_PIN, MPU6050_SCL_PIN);
    Wire.setClock(400000L);
    writeMpuRegister(MPU6050_PWR_MGMT_1, 0x00);
    writeMpuRegister(0x1C, 0x00);
    writeMpuRegister(0x1B, 0x00);
    mpuReady = true;
}

static void readSensorMpu6050(void)
{
    if (!mpuReady) {
        return;
    }

    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(MPU6050_ACCEL_XOUT_H);
    Wire.endTransmission(false);
    Wire.requestFrom(MPU6050_ADDR, 14, true);

    int16_t ax = (Wire.read() << 8) | Wire.read();
    int16_t ay = (Wire.read() << 8) | Wire.read();
    int16_t az = (Wire.read() << 8) | Wire.read();
    int16_t gx = (Wire.read() << 8) | Wire.read();
    int16_t gy = (Wire.read() << 8) | Wire.read();
    int16_t gz = (Wire.read() << 8) | Wire.read();

    float axf = ax / 16384.0f;
    float ayf = ay / 16384.0f;
    float azf = az / 16384.0f;

    float accelRoll = atan2f(ayf, azf) * 180.0f / PI;
    float accelPitch = atan2f(-axf, sqrtf((ayf * ayf) + (azf * azf))) * 180.0f / PI;
    float gyroRoll = gx / 131.0f;
    float gyroPitch = gy / 131.0f;
    float gyroYaw = gz / 131.0f;

    mpuRollAngle = 0.98f * (mpuRollAngle + gyroRoll * 0.02f) + 0.02f * accelRoll;
    mpuPitchAngle = 0.98f * (mpuPitchAngle + gyroPitch * 0.02f) + 0.02f * accelPitch;
    mpuYawRate = gyroYaw;

    dataSensor.rollAngle = mpuRollAngle;
    dataSensor.pitchAngle = mpuPitchAngle;
    dataSensor.yawRate = mpuYawRate;
}

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
    dataSensor.rollAngle = 0.0f;
    dataSensor.pitchAngle = 0.0f;
    dataSensor.yawRate = 0.0f;
    dht.begin();
    initMpu6050();
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
    readSensorMpu6050();
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
    if (MemoryData::GetInstance().sensorData_ == nullptr) {
        return;
    }
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

            readSensorMpu6050();
            if (sensorDataQueue != NULL) {
                // Luôn gửi bản ghi hiện tại mỗi lúc sau khi cập nhật ô cùng
                xQueueSend(sensorDataQueue, &dataSensor, pdMS_TO_TICKS(SENSOR_QUEUE_SEND_DELAY_MS));
            }
            if (sensorDataMutex != NULL) {
                // có thể dùng mutex nếu cần đọc dataSensor ở nơi khác, có thể for dữ liệu trên queue
                if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(SENSOR_MUTEX_WAIT_MS)) == pdTRUE) {
                    MemoryData::GetInstance().sensorData_ = &dataSensor;
                    updateMemoryStatus();
                    xSemaphoreGive(sensorDataMutex);
                }
            } else {
                MemoryData::GetInstance().sensorData_ = &dataSensor;
                updateMemoryStatus();
            }
            vTaskDelay(SENSOR_TASK_INTERVAL_MS / portTICK_PERIOD_MS);
            sensorReadStep++;
        }
    #else
        updateMemoryStatus();
         // Chu kỳ 1 giây / step: 0..3
        if (sensorReadStep >= 4) {
            sensorReadStep = 0;
        }
        readOps[sensorReadStep]();
        
        delay(SENSOR_TASK_INTERVAL_MS);
        sensorReadStep++;
    #endif

    
}
