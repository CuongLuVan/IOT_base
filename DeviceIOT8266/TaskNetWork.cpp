#include "TaskNetWork.h"
#include "NetWork_Wifi.h"
#include "NetWork_Mqtt.h"
#include "NetWork_RF.h"
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
#include "MemoryData.h"
#include "HighSpeedSampler.h"
#include "SystemTask.h"
#include <WiFi.h>
#include <WiFiUdp.h>


NetWork_Wifi netWork_Wifi;
NetWork_Mqtt netWork_Mqtt;
NetWork_RF netWork_RF;
InfoSensor sensorValue;
InfoDeviceControl statusDevice;
String lastLoraPayload;
#if SUPPORT_RTOS
QueueHandle_t sensorDataQueue = NULL;
QueueHandle_t deviceStatusQueue = NULL;
QueueHandle_t deviceCommandQueue = NULL;
#else

#endif


#define UART_NUM                 UART_NUM_0   // UART0
#define TXD_PIN                  GPIO_NUM_1   // TXD0 (m?c d?nh l� GPIO1)
#define RXD_PIN                  GPIO_NUM_3   // RXD0 (m?c d?nh l� GPIO3)
#define BUF_SIZE                 1024
#define UART_BAUD_RATE           115200
#define UART_READ_TIMEOUT_MS     100
#define WIFI_QUEUE_SIZE_SENSOR   10
#define WIFI_QUEUE_SIZE_STATUS   10
#define WIFI_QUEUE_SIZE_COMMAND  10
#define WIFI_CHECK_LIMIT         10
#define WIFI_RECONNECT_LIMIT     4
#define WIFI_PING_RETRY_LIMIT    120
#define NETWORK_RECOVERY_LIMIT   3
#define MQTT_RETRY_LIMIT         30
#define NETWORK_ERROR_LIMIT      200
#define REALTIME_POLL_LIMIT      240
#define NETWORK_POLL_INTERVAL_MS 500
#define BUTTON_PIN               0   // GPIO n�t nh�n
#define BUTTON_HOLD_TIME_1       3000
#define BUTTON_HOLD_TIME_2       6000
#define BUTTON_HOLD_TIME_3       10000
#define BUTTON_HOLD_TIME_4       20000
#define BUTTON_VALUE_DEFAULT     1
#define BUTTON_VALUE_2           2
#define BUTTON_VALUE_3           3
#define BUTTON_VALUE_4           4
#define BUTTON_VALUE_5           5
#define LORA_BUFFER_SIZE         255
#define MQTT_PAYLOAD_SIZE        1024
#define SENSOR_PAYLOAD_SIZE      256
#define DEVICE_PAYLOAD_SIZE      256

namespace {
WiFiUDP highSpeedUdp;
uint32_t networkDroppedSamples[4] = {0, 0, 0, 0};
uint32_t networkDroppedSessionIds[4] = {0, 0, 0, 0};
bool networkDroppedSessionValid[4] = {false, false, false, false};
uint32_t networkSendFailures = 0;
uint32_t lastNetworkErrorLogMs = 0;

uint16_t packetSampleCount(const HighSpeedUdpPacket& packet) {
  return (static_cast<uint16_t>(packet.bytes[20]) << 8) | packet.bytes[21];
}

void accountNetworkDrops(HighSpeedUdpPacket& packet) {
  const uint8_t type = packet.bytes[3];
  if (type >= (sizeof(networkDroppedSamples) / sizeof(networkDroppedSamples[0]))) {
    return;
  }

  const uint32_t sessionId =
      (static_cast<uint32_t>(packet.bytes[4]) << 24) |
      (static_cast<uint32_t>(packet.bytes[5]) << 16) |
      (static_cast<uint32_t>(packet.bytes[6]) << 8) |
      static_cast<uint32_t>(packet.bytes[7]);
  if (networkDroppedSessionValid[type] &&
      networkDroppedSessionIds[type] != sessionId) {
    networkDroppedSamples[type] = 0;
    networkDroppedSessionValid[type] = false;
  }

  const uint32_t existing =
      (static_cast<uint32_t>(packet.bytes[24]) << 24) |
      (static_cast<uint32_t>(packet.bytes[25]) << 16) |
      (static_cast<uint32_t>(packet.bytes[26]) << 8) |
      static_cast<uint32_t>(packet.bytes[27]);
  const uint32_t total = existing + networkDroppedSamples[type];
  packet.bytes[24] = static_cast<uint8_t>(total >> 24);
  packet.bytes[25] = static_cast<uint8_t>(total >> 16);
  packet.bytes[26] = static_cast<uint8_t>(total >> 8);
  packet.bytes[27] = static_cast<uint8_t>(total);
  networkDroppedSamples[type] = 0;
}

void recordNetworkDrop(const HighSpeedUdpPacket& packet) {
  const uint8_t type = packet.bytes[3];
  if (type < (sizeof(networkDroppedSamples) / sizeof(networkDroppedSamples[0]))) {
    const uint32_t sessionId =
        (static_cast<uint32_t>(packet.bytes[4]) << 24) |
        (static_cast<uint32_t>(packet.bytes[5]) << 16) |
        (static_cast<uint32_t>(packet.bytes[6]) << 8) |
        static_cast<uint32_t>(packet.bytes[7]);
    if (!networkDroppedSessionValid[type] ||
        networkDroppedSessionIds[type] != sessionId) {
      networkDroppedSamples[type] = 0;
      networkDroppedSessionIds[type] = sessionId;
      networkDroppedSessionValid[type] = true;
    }
    const uint32_t packetReportedDrops =
        (static_cast<uint32_t>(packet.bytes[24]) << 24) |
        (static_cast<uint32_t>(packet.bytes[25]) << 16) |
        (static_cast<uint32_t>(packet.bytes[26]) << 8) |
        static_cast<uint32_t>(packet.bytes[27]);
    networkDroppedSamples[type] += packetSampleCount(packet) + packetReportedDrops;
    if (networkDroppedSamples[type] == 0) {
        networkDroppedSessionValid[type] = false;
    }
  }
  ++networkSendFailures;
}

void sendHighSpeedPackets() {
  HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
  HighSpeedUdpPacket packet;
  for (size_t i = 0; i < HS_NETWORK_DRAIN_BATCH; ++i) {
    if (!sampler.receivePacket(packet)) {
      break;
    }

    bool sent = false;
    if (WiFi.status() == WL_CONNECTED &&
        highSpeedUdp.beginPacket(packet.targetIP, packet.targetPort)) {
      accountNetworkDrops(packet);
      const size_t written = highSpeedUdp.write(packet.bytes, packet.length);
      const bool completed = highSpeedUdp.endPacket();
      sent = written == packet.length && completed;
    }

    if (sent) {
      SystemTask::recordUdpSent(static_cast<UdpPacketType>(packet.bytes[3]));
    } else {
      SystemTask::recordUdpFailure(
          static_cast<UdpPacketType>(packet.bytes[3]), packetSampleCount(packet));
      recordNetworkDrop(packet);
      const uint32_t nowMs = millis();
      if (nowMs - lastNetworkErrorLogMs >= 1000) {
        lastNetworkErrorLogMs = nowMs;
        DEVICE_LOG_INFO("[HighSpeed] UDP send failures=" +
            String(networkSendFailures));
      }
    }
  }
}
}


unsigned char modeStatus = 0;
ProcessTimeData processTimeData;
// External network ping tracking (check once per hour)
static unsigned long lastExternalPingTime = 0;
static const unsigned long EXTERNAL_PING_INTERVAL = 3600000UL; // 1 hour

void setupUART(void){
  uart_config_t uart_config = {
    .baud_rate = UART_BAUD_RATE,
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
  int len = uart_read_bytes(UART_NUM, data, sizeof(data) - 1, 0);
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

    Memory::GetInstance()->initEEPROM(EEPROM_SIZE);
    modeStatus = Memory::GetInstance()->readChar(MODE_WIFI_ADRESS);
    pinMode(BUTTON_PIN, INPUT_PULLUP); // N�t n?i GND, n�n d�ng INPUT_PULLUP
    DEVICE_LOG_INFO("start TaskNetWork::setup ==>"+ String(modeStatus));

    #if SUPPORT_RTOS

    
    #else
      MemoryData::GetInstance().deviceStatus_ = &statusDevice;
      MemoryData::GetInstance().sensorData_ = &sensorValue;
    #endif
    

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
            sensorDataQueue = xQueueCreate(WIFI_QUEUE_SIZE_SENSOR, sizeof(InfoSensor));
            if (sensorDataQueue == NULL) {
                Serial.println("[TaskNetWork] Failed to create sensorDataQueue");
            }
        }
        if (deviceStatusQueue == NULL) {
            deviceStatusQueue = xQueueCreate(WIFI_QUEUE_SIZE_STATUS, sizeof(InfoDeviceControl));
            if (deviceStatusQueue == NULL) {
                Serial.println("[TaskNetWork] Failed to create deviceStatusQueue");
            }
        }
        if (deviceCommandQueue == NULL) {
            deviceCommandQueue = xQueueCreate(WIFI_QUEUE_SIZE_COMMAND, sizeof(DeviceCommand));
            if (deviceCommandQueue == NULL) {
                Serial.println("[TaskNetWork] Failed to create deviceCommandQueue");
            }
        }
#else

#endif
        
        netWork_Mqtt.getAllDataSetup();
        netWork_Mqtt.setupInfoMQTT();
        //if(netWork_Mqtt.checkStatusMqtt()) netWork_Mqtt.sendMessageInfo("mqtt");
        modeStatus = WIFI_START_CONNECT;
        processTimeData.state=0;
        processTimeData.numberCheck=0;
        setupUART();
#if SUPPORT_LORA
        if (!netWork_RF.begin()) {
            Serial.println("[TaskNetWork] LoRa init failed");
        } else {
            Serial.println("[TaskNetWork] LoRa init OK");
        }
        lastLoraPayload = String();
#endif
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
    if (!highSpeedUdp.begin(0)) {
        DEVICE_LOG_INFO("[TaskNetWork] Failed to initialize high-speed UDP socket");
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
              if(processTimeData.numberCheck>WIFI_CHECK_LIMIT){
                  processTimeData.numberCheck=0;
                  processTimeData.state =1;
              }
          }
        }
        else
        {
          processTimeData.numberCheck++;
          if(processTimeData.numberCheck>WIFI_PING_RETRY_LIMIT) {
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
    if(processTimeData.numberCheck>WIFI_RECONNECT_LIMIT){
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
          netWork_Wifi.getWifiStatusIP();
          processTimeData.state=4;
      }
      else
      {
        if(processTimeData.numberCheck>REALTIME_POLL_LIMIT){
          processTimeData.countNetWorkWorng  ++;
          if(processTimeData.countNetWorkWorng>NETWORK_RECOVERY_LIMIT){
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
  if(netWork_Mqtt.checkStatusMqtt()){
    processTimeData.state=5;
    processTimeData.countNetWorkWorng =0;
  }
  else 
  {
    processTimeData.countNetWorkWorng ++;
  }
  if(processTimeData.countNetWorkWorng>MQTT_RETRY_LIMIT){
    processTimeData.countNetWorkWorng =0;
    processTimeData.state=1;
  }

  DEVICE_LOG_INFO("end checkMQTTConnect");
  return true;   
}


bool checkNetWorkERRORConnect(void){
    DEVICE_LOG_INFO("start checkNetWorkERRORConnect");
    netWork_Wifi.printWifiStatusIP();
  // Check WiFi connectivity
  if(netWork_Wifi.checkWifi() != WL_CONNECTED){
      processTimeData.countNetWorkWorng ++;
  }

  // Check MQTT connectivity (netWork_Mqtt.checkStatusMqtt should return non-zero when connected)
  if(netWork_Mqtt.checkStatusMqtt() == 0){
      processTimeData.countNetWorkWorng ++;
  }

  // Periodic external ping (e.g. Google) - only run once per hour to avoid frequent network traffic
  if (compaireTimeInfo(lastExternalPingTime) >= EXTERNAL_PING_INTERVAL) {
    lastExternalPingTime = millis();
    if (!netWork_Wifi.pingNetWork()) {
      processTimeData.state = 0;
      processTimeData.numberCheck = 0;
    } 
  }

  if(processTimeData.countNetWorkWorng > NETWORK_ERROR_LIMIT){
     processTimeData.state = 0;
     processTimeData.numberCheck = 0;
  }
    DEVICE_LOG_INFO("end checkNetWorkERRORConnect");
    return true;
}

//boolean (* const xdrv_func_ptr[])(byte) PROGMEM = 
//boolean (* const xdrv_func_ptr[])(byte) PROGMEM = 

unsigned long pressStartTime = 0;
bool isPressed = false;
char valueButton = BUTTON_VALUE_DEFAULT;

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
    if (heldTime >= BUTTON_HOLD_TIME_4) {
      valueButton = BUTTON_VALUE_5;
    } else if (heldTime >= BUTTON_HOLD_TIME_3) {
      valueButton = BUTTON_VALUE_4;
    } else if (heldTime >= BUTTON_HOLD_TIME_2) {
      valueButton = BUTTON_VALUE_3;
    } else if (heldTime >= BUTTON_HOLD_TIME_1) {
      valueButton = BUTTON_VALUE_2;
    } else {
      valueButton = BUTTON_VALUE_DEFAULT;
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
void sendMessageInfo(String data){
  char *p = new char[data.length() + 1];
  strcpy(p, data.c_str());
   netWork_Mqtt.sendMessageInfo(p);
}


void TaskNetWork::loopNetWork(void) {
  sendHighSpeedPackets();
  if(WIFI_START_CONNECT==modeStatus){
        static uint32_t lastNetworkPollMs = 0;
        const uint32_t nowMs = millis();
        if(!HighSpeedSampler::GetInstance().isSamplingActive() &&
           nowMs - lastNetworkPollMs >= NETWORK_POLL_INTERVAL_MS){
          arrayNetworkFunction[processTimeData.state]();
          lastNetworkPollMs = nowMs;
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
#if SUPPORT_LORA
    if (netWork_RF.available()) {
        uint8_t buffer[LORA_BUFFER_SIZE];
        size_t receivedLen = 0;
        if (netWork_RF.receiveData(buffer, sizeof(buffer) - 1, receivedLen)) {
            buffer[receivedLen] = '\0';
            lastLoraPayload = String((char*)buffer);
            if (netWork_Mqtt.checkStatusMqtt()) {
                String mqttPayload = "{\"data\":\"" + lastLoraPayload + "\"}";
                char mqttBuf[MQTT_PAYLOAD_SIZE];
                mqttPayload.toCharArray(mqttBuf, sizeof(mqttBuf));
                netWork_Mqtt.sendMessageInfo(mqttBuf);
            }
        }
    }
#endif
     updateStatusUART();
#if SUPPORT_RTOS
    // Process sensor queue data if any
    if (sensorDataQueue != NULL) {
        if(xQueueReceive(sensorDataQueue, &sensorValue, 0) == pdTRUE) {
            if (netWork_Mqtt.checkStatusMqtt()) {
              // sendMessageInfo(getInfoDevice(sensorValue,statusDevice));
            }
            Serial.printf("[TaskNetWork] x1111 Sensor data sent queued: H=%d T=%d PM2.5=%d PM10=%d\n",
                          sensorValue.valueHumi,
                          sensorValue.valueTemp,
                          sensorValue.valueDust_PM2_5,
                          sensorValue.valueDust_PM10);
        }
    }

    // Process device status updates from TaskDevice
    if (deviceStatusQueue != NULL) {
        
        if (xQueueReceive(deviceStatusQueue, &statusDevice, 0) == pdTRUE) {
            if (netWork_Mqtt.checkStatusMqtt()) {
              sendMessageInfo(getInfoDevice(sensorValue,statusDevice));
            }
            Serial.printf("[TaskNetWork] x22222 Device status: port=%d click=%d status=%d count=%d\n",
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
}

void TaskNetWork::taskRun(void * parameter) {
  //  DEVICE_LOG_INFO("start TaskNetWork::taskRun");
    #if SUPPORT_RTOS
      Serial.print("TaskNetwork is running on core ");
      Serial.println(xPortGetCoreID());

      for(;;) {
          loopNetWork();
          static TickType_t lastRtcUpdate = xTaskGetTickCount();
          const TickType_t now = xTaskGetTickCount();
          if (now - lastRtcUpdate >= pdMS_TO_TICKS(1000)) {
              getRTCInfo();
              const bool wifi = WiFi.status() == WL_CONNECTED;
              SystemTask::setNetworkState(
                  wifi, netWork_Mqtt.checkStatusMqtt() != 0, wifi);
              lastRtcUpdate = now;
          }
          static uint32_t lastSystemTelemetryMs = millis();
          const uint32_t nowMs = millis();
          if (nowMs - lastSystemTelemetryMs >=
              SYSTEM_TASK_TELEMETRY_INTERVAL_MS) {
              lastSystemTelemetryMs = nowMs;
              if (netWork_Mqtt.checkStatusMqtt() != 0) {
                  String telemetry = SystemTask::telemetryJson();
                  char mqttBuffer[MQTT_PAYLOAD_SIZE];
                  if (telemetry.length() > 0 &&
                      telemetry.length() + 64 < sizeof(mqttBuffer)) {
                      telemetry.toCharArray(mqttBuffer, sizeof(mqttBuffer));
                      netWork_Mqtt.sendMessageInfo(mqttBuffer);
                  } else if (telemetry.length() > 0) {
                      DEVICE_LOG_INFO("[SystemTask] Telemetry payload exceeds MQTT buffer");
                  }
              }
          }
          vTaskDelay(1);
      }
    #else
      // In non-RTOS mode, this function is called from loop() and should not block.
      loopNetWork();
      getRTCInfo();
    
    #endif
    //DEVICE_LOG_INFO("end TaskNetWork::taskRun");
}
