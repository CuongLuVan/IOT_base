#include "TaskNetWork.h"
#include "NetWork_Wifi.h"
#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include "define_All.h"
#include "Memory.h"

#if SUPPORT_RTOS
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#endif

#include "driver/uart.h"
#include "esp_log.h"
#include "Common.h"
#include "define_All.h"
#include "DebugInfo.h"


NetWork_Wifi netWork_Wifi;
NetWork_Mqtt netWork_Mqtt;
InfoSensor sensorValue;
InfoDeviceControl statusDevice;
#if SUPPORT_RTOS
QueueHandle_t sensorDataQueue = NULL;
QueueHandle_t deviceStatusQueue = NULL;
QueueHandle_t deviceCommandQueue = NULL;
#else

#endif


#define UART_NUM        UART_NUM_0   // UART0
#define TXD_PIN         GPIO_NUM_1   // TXD0 (m?c d?nh l� GPIO1)
#define RXD_PIN         GPIO_NUM_3   // RXD0 (m?c d?nh l� GPIO3)
#define BUF_SIZE        1024



unsigned char modeStatus = 0;
ProcessTimeData processTimeData;
// External network ping tracking (check once per hour)
static unsigned long lastExternalPingTime = 0;
static const unsigned long EXTERNAL_PING_INTERVAL = 3600000UL; // 1 hour
#define BUTTON_PIN 0   // GPIO n�t nh?n
#define UART_NUM        UART_NUM_0   // UART0
#define TXD_PIN         GPIO_NUM_1   // TXD0 (m?c d?nh l� GPIO1)
#define RXD_PIN         GPIO_NUM_3   // RXD0 (m?c d?nh l� GPIO3)
#define BUF_SIZE        1024

void setupUART(void){
  uart_config_t uart_config = {
    .baud_rate = 115200,
    .data_bits = UART_DATA_8_BITS,
    .parity    = UART_PARITY_DISABLE,
    .stop_bits = UART_STOP_BITS_1,
    .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    .source_clk = UART_SCLK_APB,
  };

  uart_param_config(UART_NUM, &uart_config);

  // G�n ch�n TX v� RX (kh�ng d�ng RTS/CTS)
  uart_set_pin(UART_NUM, TXD_PIN, RXD_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);

  // C�i d?t driver UART v?i RX buffer, kh�ng d�ng event queue
  uart_driver_install(UART_NUM, BUF_SIZE * 2, 0, 0, NULL, 0);

  // In th�ng b�o kh?i d?ng
  const char* start_msg = "ESP32 UART0 d� kh?i d?ng!\n";
  uart_write_bytes(UART_NUM, start_msg, strlen(start_msg));
}


void updateStatusUART(void){
  uint8_t data[BUF_SIZE];
  int len = uart_read_bytes(UART_NUM, data, BUF_SIZE, 100 / portTICK_PERIOD_MS);
  if (len > 0) {
    data[len] = '\0';  // Null-terminate d? li?u nh?n du?c
    Serial.print("�� nh?n: ");
    Serial.println((char*)data);
  }
}


void getRTCInfo(){
    processTimeData.time_counter_end = millis();
    if (processTimeData.time_counter_end <= processTimeData.time_counter_start) {
        processTimeData.timestamp = processTimeData.timeStart + ((processTimeData.time_counter_end - processTimeData.time_counter_start) / 1000);
    } else {
        // Horizontal rollover due millis() (32-bit unsigned overflow)
        unsigned long elapsed = (0xFFFFFFFFUL - processTimeData.time_counter_start + processTimeData.time_counter_end + 1UL);
        processTimeData.timestamp = processTimeData.timeStart + (elapsed / 1000);
        processTimeData.time_counter_start = processTimeData.time_counter_end;
        processTimeData.timeStart = processTimeData.timestamp;
    }
}

void TaskNetWork::setup(void){
    DEVICE_LOG_INFO("start TaskNetWork::setup");

    Memory::GetInstance()->initEEPROM(2048);
    modeStatus = Memory::GetInstance()->readChar(MODE_WIFI_ADRESS);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // N�t n?i GND, n�n d�ng INPUT_PULLUP
    DEVICE_LOG_INFO("start TaskNetWork::setup ==>"+ String(modeStatus));
    if(WIFI_START_CONNECT==modeStatus){
        netWork_Wifi.connectWifi();
        if (netWork_Wifi.checkWifi() == WL_CONNECTED) {
            uint32_t netTs = netWork_Wifi.getNetworkTimestamp();
            if (netTs > 0) {
                processTimeData.timeStart = netTs;
            }
            processTimeData.time_counter_start = millis();
        } else {
            loopNetWork();
        }
        netWork_Wifi.startWebServer();

#if SUPPORT_RTOS
        if (sensorDataQueue == NULL) {
            sensorDataQueue = xQueueCreate(10, sizeof(InfoSensor));
            if (sensorDataQueue == NULL) {
                Serial.println("[TaskNetWork] Failed to create sensorDataQueue");
            }
        }
        if (deviceStatusQueue == NULL) {
            deviceStatusQueue = xQueueCreate(10, sizeof(InfoDeviceControl));
            if (deviceStatusQueue == NULL) {
                Serial.println("[TaskNetWork] Failed to create deviceStatusQueue");
            }
        }
        if (deviceCommandQueue == NULL) {
            deviceCommandQueue = xQueueCreate(10, sizeof(DeviceCommand));
            if (deviceCommandQueue == NULL) {
                Serial.println("[TaskNetWork] Failed to create deviceCommandQueue");
            }
        }
#else

#endif
        
        netWork_Mqtt.getAllDataSetup();
        netWork_Mqtt.setupInfoMQTT();
        if(netWork_Mqtt.checkStatusMqtt()) netWork_Mqtt.sendMessageInfo("mqtt");
        modeStatus = WIFI_START_CONNECT;
        processTimeData.state=0;
        processTimeData.numberCheck=0;
        setupUART();
    }else if(WIFI_BLE_PROVISION==modeStatus){
        netWork_Wifi.startProvisioning();
        netWork_Wifi.setupProvisioning();
    }else if(WIFI_SMART_CONFIG==modeStatus){
        netWork_Wifi.startSmartConfig();
        netWork_Wifi.setupSmartConfig();
    }else if(WIFI_BLE_SMART_CONFIG==modeStatus){
        //netWork_Wifi.startProvisioning();
        //netWork_Wifi.setupProvisioning();
        //netWork_Wifi.startSmartConfig();
        //netWork_Wifi.setupSmartConfig();
        DEVICE_LOG_INFO("WIFI_BLE_SMART_CONFIG .. ");
        netWork_Wifi.setupAP();
        netWork_Wifi.startWebserverAP();
    }else if(WIFI_START_OTA==modeStatus){
        netWork_Wifi.setupOTA();
    }
    else{
        netWork_Wifi.setupHostPost();
        netWork_Wifi.startWebserverRoot();
    }
    Serial.println("Setup done");
    DEVICE_LOG_INFO("end TaskNetWork::setup");
}

unsigned long compaireTimeInfo(unsigned long time){
  unsigned long currentTime = millis();
  if(currentTime>time){
    return (currentTime-time);
  }
  return (0xffffffff-time+currentTime);
}

bool checkNetWorkInConnect(void){  
    DEVICE_LOG_INFO("start checkNetWorkInConnect");
    static bool networkTimeInitialized = false;

    if(!netWork_Wifi.checkModeHostPost()){

        if((netWork_Wifi.checkWifi()!= WL_CONNECTED)||(!netWork_Mqtt.checkStatusMqtt())){
          if(!netWork_Wifi.pingNetWork()){
              processTimeData.numberCheck=0;
              processTimeData.state =1;
          }
          else
          {
              processTimeData.numberCheck++;
              if(processTimeData.numberCheck>10){
                  processTimeData.numberCheck=0;
                  processTimeData.state =1;
              }
          }
        }
        else
        {
          processTimeData.numberCheck++;
          if(processTimeData.numberCheck>120) {
            if(!netWork_Wifi.pingNetWork()){
                processTimeData.numberCheck=0;
                processTimeData.state =1;
            }
          }
        }
    }

    DEVICE_LOG_INFO("end checkNetWorkInConnect");
    return true;   
}


bool checkNetWorkDisconnect(void){
    DEVICE_LOG_INFO("start checkNetWorkDisconnect");
    netWork_Wifi.disconnetWifi();
    processTimeData.numberCheck = 0;
    processTimeData.state = 2; 
    DEVICE_LOG_INFO("end checkNetWorkDisconnect");
    return true;          
}


bool checkNetWorkReConnect(void){
    DEVICE_LOG_INFO("start checkNetWorkReConnect"+ String(processTimeData.numberCheck));
    processTimeData.numberCheck++;
    if(processTimeData.numberCheck>4){
        netWork_Wifi.connectWifi();
        processTimeData.state=3;
        processTimeData.numberCheck = 0;
        netWork_Wifi.startWebServer();
       // netWork_Mqtt.getAllDataSetup();
       // netWork_Mqtt.setupInfoMQTT();
        //if(netWork_Mqtt.checkStatusMqtt()) netWork_Mqtt.sendMessageInfo("mqtt");
    }
    DEVICE_LOG_INFO("end checkNetWorkReConnect");
    return true;   
}


bool checkNetWorkRealTimeServer(void){
      DEVICE_LOG_INFO("start checkNetWorkRealTimeServer");
      processTimeData.numberCheck++;
      if(netWork_Wifi.checkWifi()== WL_CONNECTED){
         DEVICE_LOG_INFO("netWork_Wifi.checkWifi()== WL_CONNECTED .......................ok");
          processTimeData.state=4;
      }
      else
      {
        if(processTimeData.numberCheck>240){
          processTimeData.countNetWorkWorng  ++;
          if(processTimeData.countNetWorkWorng>3){
            processTimeData.state=0;
          }
          processTimeData.numberCheck = 0;
        }
      }

      DEVICE_LOG_INFO("end checkNetWorkRealTimeServer");
      return true;
}


bool checkMQTTConnect(void){
  DEVICE_LOG_INFO("start checkMQTTConnect");
  processTimeData.numberCheck = 0;
  netWork_Mqtt.MqttReconnect();
  processTimeData.state=5;
  processTimeData.countNetWorkWorng =0;
  DEVICE_LOG_INFO("end checkMQTTConnect");
  return true;   
}


bool checkNetWorkERRORConnect(void){
    DEVICE_LOG_INFO("start checkNetWorkERRORConnect");
  // Check WiFi connectivity
  if(netWork_Wifi.checkWifi() != WL_CONNECTED){
      processTimeData.countNetWorkWorng ++;
  }

  // Check MQTT connectivity (netWork_Mqtt.checkStatusMqtt should return non-zero when connected)
  if(netWork_Mqtt.checkStatusMqtt() == 0){
      processTimeData.countNetWorkWorng ++;
  }

  // Periodic external ping (e.g. Google) - only run once per hour to avoid frequent network traffic
  if (compaireTimeInfo(processTimeData.lastExternalPingTime) >= EXTERNAL_PING_INTERVAL) {
    processTimeData.lastExternalPingTime = millis();
    if (!netWork_Wifi.pingNetWork()) {
      processTimeData.state = 0;
      processTimeData.numberCheck = 0;
    } 
  }

  if(processTimeData.countNetWorkWorng > 200){
     processTimeData.state = 0;
     processTimeData.numberCheck = 0;
  }
    DEVICE_LOG_INFO("end checkNetWorkERRORConnect");
    return true;
}

//boolean (* const xdrv_func_ptr[])(byte) PROGMEM = 
//boolean (* const xdrv_func_ptr[])(byte) PROGMEM = 
#define BUTTON_PIN 0   // GPIO n�t nh?n

unsigned long pressStartTime = 0;
bool isPressed = false;
char valueButton = 1;

void checkButton(){
  int buttonState = digitalRead(BUTTON_PIN);

  if (buttonState == LOW && !isPressed) {
    // B?t d?u nh?n
    isPressed = true;
    pressStartTime = millis();
  }

  if (buttonState == LOW && isPressed) {
    unsigned long heldTime = millis() - pressStartTime;

    // X�c d?nh gi� tr? d?a tr�n th?i gian gi?
    if (heldTime >= 20000) {
      valueButton = 5;
    } else if (heldTime >= 10000) {
      valueButton = 4;
    } else if (heldTime >= 6000) {
      valueButton = 3;
    } else if (heldTime >= 3000) {
      valueButton = 2;
    } else {
      valueButton = 1;
    }
  }

  // Khi nh? n�t
  if (buttonState == HIGH && isPressed) {
    isPressed = false;
    Serial.print("Button released -> value = ");
    Serial.println(valueButton);
    if(valueButton>WIFI_START_CONNECT&&valueButton<=WIFI_START_OTA){
      Memory::GetInstance()->writeChar(WIFI_MODE,valueButton);
      modeStatus = valueButton;
      if(WIFI_BLE_PROVISION==valueButton){
        netWork_Wifi.startProvisioning();
        netWork_Wifi.setupProvisioning();
      } else if(WIFI_SMART_CONFIG==valueButton){
        netWork_Wifi.startSmartConfig();
        netWork_Wifi.setupSmartConfig();
      }else if(WIFI_BLE_SMART_CONFIG==valueButton){
        //netWork_Wifi.startProvisioning();
        //netWork_Wifi.setupProvisioning();
        //netWork_Wifi.startSmartConfig();
       // netWork_Wifi.setupSmartConfig();
      }else if(WIFI_START_OTA==valueButton){
        netWork_Wifi.setupOTA();
      }

    }
  }
}


bool (* arrayNetworkFunction[])(void) ={
                                  &checkNetWorkInConnect,
                                  &checkNetWorkDisconnect,
                                  &checkNetWorkReConnect,
                                  &checkNetWorkRealTimeServer,
                                  &checkMQTTConnect,

                                  &checkNetWorkERRORConnect
                              };


void TaskNetWork::loopNetWork(void) {
  DEVICE_LOG_INFO("start TaskNetWork::loopNetWork"+ String(modeStatus));
  if(WIFI_START_CONNECT==modeStatus){
      // check wifi netWor
        DEVICE_LOG_INFO("check wifi netWork compaireTimeInfo(processTimeData.timeStart)"+ String(compaireTimeInfo(processTimeData.timeStart)));
        DEVICE_LOG_INFO("check wifi netWork processTimeData.state"+ String(processTimeData.state));
        
        if(compaireTimeInfo(processTimeData.timeStart)>500){
          arrayNetworkFunction[processTimeData.state]();
          processTimeData.timeStart = millis();
        } 
        if(processTimeData.state==5){
          netWork_Wifi.handerClient();
          netWork_Mqtt.lisenMqtt();
        }
        //netWork_Wifi.handerClient();
        //netWork_Mqtt.lisenMqtt();
    } else if(WIFI_BLE_PROVISION==modeStatus){
      netWork_Wifi.loopProvisioning();
    }else if(WIFI_SMART_CONFIG==modeStatus){
      netWork_Wifi.loopSmartConfig();
    }else if(WIFI_BLE_SMART_CONFIG==modeStatus){
        //netWork_Wifi.loopSmartConfig();
        //netWork_Wifi.loopProvisioning();
        netWork_Wifi.loopAP();
    }else if(WIFI_START_OTA==modeStatus){
      netWork_Wifi.loopOTA();
    }else
    {
      netWork_Wifi.loopHostPost();
    }
    checkButton();  
     updateStatusUART();
#if SUPPORT_RTOS
    // Process sensor queue data if any
    if (sensorDataQueue != NULL) {
        while (xQueueReceive(sensorDataQueue, &sensorValue, 0) == pdTRUE) {
            if (netWork_Mqtt.checkStatusMqtt()) {
                char payload[256];
                snprintf(payload, sizeof(payload), "{\"humi\":%d,\"temp\":%d,\"pm2_5\":%d,\"pm10\":%d}",
                         sensorValue.valueHumi,
                         sensorValue.valueTemp,
                         sensorValue.valueDust_PM2_5,
                         sensorValue.valueDust_PM10);
                netWork_Mqtt.sendMessageInfo(payload);
            }
            Serial.printf("[TaskNetWork] Sensor data sent queued: H=%d T=%d PM2.5=%d PM10=%d\n",
                          sensorValue.valueHumi,
                          sensorValue.valueTemp,
                          sensorValue.valueDust_PM2_5,
                          sensorValue.valueDust_PM10);
        }
    }

    // Process device status updates from TaskDevice
    if (deviceStatusQueue != NULL) {
        
        while (xQueueReceive(deviceStatusQueue, &statusDevice, 0) == pdTRUE) {
            if (netWork_Mqtt.checkStatusMqtt()) {
                char devPayload[256];
                snprintf(devPayload, sizeof(devPayload), "{\"device_port\":%d,\"button_click\":%d,\"button_status\":%d,\"count_info\":%d}",
                         statusDevice.device_port,
                         statusDevice.button_click,
                         statusDevice.button_status,
                         statusDevice.count_info);
                netWork_Mqtt.sendMessageInfo(devPayload);
            }
            Serial.printf("[TaskNetWork] Device status: port=%d click=%d status=%d count=%d\n",
                          statusDevice.device_port,
                          statusDevice.button_click,
                          statusDevice.button_status,
                          statusDevice.count_info);
        }
    }
#else
    // Non-RTOS mode: use simple flags for latest data
   // MemoryData::GetInstance().sensorData_=(&dataSensor);
#endif
    DEVICE_LOG_INFO("end TaskNetWork::loopNetWork");
}

void TaskNetWork::taskRun(void * parameter) {
  //  DEVICE_LOG_INFO("start TaskNetWork::taskRun");
    #if SUPPORT_RTOS
      Serial.print("Task2 is running on core ");
      Serial.println(xPortGetCoreID());

      for(;;) {
          loopNetWork();
          getRTCInfo();
          vTaskDelay(1000 / portTICK_PERIOD_MS);
      }
    #else
      // In non-RTOS mode, this function is called from loop() and should not block.
      loopNetWork();
      getRTCInfo();
    
    #endif
    //DEVICE_LOG_INFO("end TaskNetWork::taskRun");
}
