#include "TaskNetWork.h"
#include "NetWork_Wifi.h"
#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include "define_All.h"
#include "Memory.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include "driver/uart.h"
#include "esp_log.h"
#include "Common.h"

NetWork_Wifi netWork_Wifi;
NetWork_Mqtt netWork_Mqtt;
InfoSensor sensorValue;
QueueHandle_t sensorDataQueue = NULL;
QueueHandle_t deviceStatusQueue = NULL;
QueueHandle_t deviceCommandQueue = NULL;


#define UART_NUM        UART_NUM_0   // UART0
#define TXD_PIN         GPIO_NUM_1   // TXD0 (m?c d?nh l� GPIO1)
#define RXD_PIN         GPIO_NUM_3   // RXD0 (m?c d?nh l� GPIO3)
#define BUF_SIZE        1024



unsigned char modeStatus = 0;
TestTimeData testTimeData;
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




void TaskNetWork::setup(void){
    
    Memory::GetInstance()->initEEPROM(2048);
    modeStatus = Memory::GetInstance()->readChar(MODE_WIFI_ADRESS);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // N�t n?i GND, n�n d�ng INPUT_PULLUP

    if(WIFI_START_CONNECT==modeStatus){
        netWork_Wifi.connectWifi();
        if(netWork_Wifi.checkWifi() != WL_CONNECTED){
          loopNetWork();
        }
        netWork_Wifi.startWebServer();

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
        
        netWork_Mqtt.getAllDataSetup();
        netWork_Mqtt.setupInfoMQTT();
        if(netWork_Mqtt.checkStatusMqtt()) netWork_Mqtt.sendMessageInfo("mqtt");
        modeStatus = WIFI_START_CONNECT;
        testTimeData.state=0;
        testTimeData.numberCheck=0;
        setupUART();
    }else if(WIFI_BLE_PROVISION==modeStatus){
        netWork_Wifi.startProvisioning();
        netWork_Wifi.setupProvisioning();
    }else if(WIFI_SMART_CONFIG==modeStatus){
        netWork_Wifi.startSmartConfig();
        netWork_Wifi.setupSmartConfig();
    }else if(WIFI_BLE_SMART_CONFIG==modeStatus){
        netWork_Wifi.startProvisioning();
        netWork_Wifi.setupProvisioning();
        netWork_Wifi.startSmartConfig();
        netWork_Wifi.setupSmartConfig();
    }else if(WIFI_START_OTA==modeStatus){
        netWork_Wifi.setupOTA();
    }
    else{
        netWork_Wifi.setupHostPost();
        netWork_Wifi.startWebserverRoot();
    }
    Serial.println("Setup done");
}

unsigned long compaireTimeInfo(unsigned long time){
  unsigned long currentTime = millis();
  if(currentTime>time){
    return (currentTime-time);
  }
  return (0xffffffff-time+currentTime);
}

bool checkNetWorkInConnect(void){  
    if(!netWork_Wifi.checkModeHostPost()){
        if(!netWork_Wifi.checkWifi()||!netWork_Mqtt.checkStatusMqtt()){
          if(!netWork_Wifi.pingNetWork()){
              testTimeData.numberCheck=0;;
              testTimeData.state =1;
          }
          else
          {
              testTimeData.numberCheck++;
              if(testTimeData.numberCheck>10){
                  testTimeData.numberCheck=0;
                  testTimeData.state =1;
              }
          }
        }
        else
        {
          testTimeData.numberCheck++;
          if(testTimeData.numberCheck>120) {
            if(!netWork_Wifi.pingNetWork()){
                testTimeData.numberCheck=0;
                testTimeData.state =1;
            }
          }
        }           
    }

    return true;   
}


bool checkNetWorkDisconnect(void){
    netWork_Wifi.disconnetWifi();
    testTimeData.numberCheck = 0;
    testTimeData.state = 2; 
    return true;          
}


bool checkNetWorkReConnect(void){
    testTimeData.numberCheck++;
    if(testTimeData.numberCheck>4){
        netWork_Wifi.connectWifi();
        testTimeData.state==3;
        testTimeData.numberCheck = 0;
    }
    return true;   
}


bool checkNetWorkRealTimeServer(void){
      testTimeData.numberCheck++;
      if(netWork_Wifi.checkWifi()){
          testTimeData.state==4;
      }
      else
      {
        if(testTimeData.numberCheck>4){
          testTimeData.countNetWorkWorng  ++;
          if(testTimeData.countNetWorkWorng>3){
            testTimeData.state==5;
          }
          testTimeData.numberCheck = 0;
        }
      }

      return true;
}


bool checkMQTTConnect(void){
  testTimeData.numberCheck = 0;
  netWork_Mqtt.MqttReconnect();
  testTimeData.state=0;
  return true;   
}


bool checkNetWorkERRORConnect(void){
    if(testTimeData.countNetWorkWorng>100){
      // reset device
    
    }
    
    testTimeData.state=0;
    testTimeData.numberCheck=0;
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
        netWork_Wifi.startProvisioning();
        netWork_Wifi.setupProvisioning();
        netWork_Wifi.startSmartConfig();
        netWork_Wifi.setupSmartConfig();
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
  if(WIFI_START_CONNECT==modeStatus){
      // check wifi netWor
        if(compaireTimeInfo(testTimeData.timeStart)>30000){
          arrayNetworkFunction[testTimeData.state]();
          testTimeData.timeStart = millis();
        } 
        netWork_Wifi.handerClient();
        netWork_Mqtt.lisenMqtt();
    } else if(WIFI_BLE_PROVISION==modeStatus){
      netWork_Wifi.loopProvisioning();
    }else if(WIFI_SMART_CONFIG==modeStatus){
      netWork_Wifi.loopSmartConfig();
    }else if(WIFI_BLE_SMART_CONFIG==modeStatus){
        netWork_Wifi.loopSmartConfig();
        netWork_Wifi.loopProvisioning();
    }else if(WIFI_START_OTA==modeStatus){
      netWork_Wifi.loopOTA();
    }else
    {
      netWork_Wifi.loopHostPost();
    }
    checkButton();  
     updateStatusUART();
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
        InfoDeviceControl status;
        while (xQueueReceive(deviceStatusQueue, &status, 0) == pdTRUE) {
            if (netWork_Mqtt.checkStatusMqtt()) {
                char devPayload[256];
                snprintf(devPayload, sizeof(devPayload), "{\"device_port\":%d,\"button_click\":%d,\"button_status\":%d,\"count_info\":%d}",
                         status.device_port,
                         status.button_click,
                         status.button_status,
                         status.count_info);
                netWork_Mqtt.sendMessageInfo(devPayload);
            }
            Serial.printf("[TaskNetWork] Device status: port=%d click=%d status=%d count=%d\n",
                          status.device_port,
                          status.button_click,
                          status.button_status,
                          status.count_info);
        }
    }
}

void TaskNetWork::taskRun(void * parameter) {
    Serial.print("Task2 is running on core ");
    Serial.println(xPortGetCoreID());  

    
        for(;;)
        {   
          loopNetWork();
          vTaskDelay(200);
         
        }

    for(;;)
    {   
      netWork_Wifi.handerHospost();
        vTaskDelay(1000);

    }
}
