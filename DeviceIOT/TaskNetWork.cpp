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
#include <ArduinoJson.h>
#include <esp_system.h>


NetWork_Wifi netWork_Wifi;
NetWork_Mqtt netWork_Mqtt;
NetWork_RF netWork_RF;
InfoSensor sensorValue;
InfoDeviceControl statusDevice;
String lastLoraPayload;

// Gateway keeps only the most recent value per remote device.  A sequence
// number prevents an ACK/retry from being published twice.
struct RemotePressureNode {
  uint16_t id;
  uint16_t lastSequence;
  float pressureKPa;
  unsigned long lastSeenMs;
  bool used;
};

static RemotePressureNode remotePressureNodes[LORA_REMOTE_NODE_CAPACITY] = {};
static float lastPublishedPressureKPa = -1.0f;
static unsigned long lastPressurePublishMs = 0;
static uint16_t loraSequence = 0;
static uint16_t pendingSequence = 0;
static uint8_t pendingRetries = 0;
static bool waitingForLoraAck = false;
static unsigned long loraAckDeadlineMs = 0;
static unsigned long nextLoraAttemptMs = 0;
static unsigned long lastLoraTransmitSlot = 0xFFFFFFFFUL;
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
#define EEPROM_SIZE              2048
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
  int len = uart_read_bytes(UART_NUM, data, BUF_SIZE, UART_READ_TIMEOUT_MS / portTICK_PERIOD_MS);
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
        randomSeed((uint32_t)esp_random());
        if (!netWork_RF.begin(LORA_FREQUENCY, LORA_CS_PIN, LORA_RESET_PIN, LORA_IRQ_PIN)) {
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
   netWork_Mqtt.sendMessageInfo(data.c_str());
}

static unsigned long pressureReportInterval(float pressureKPa) {
  const float delta = lastPublishedPressureKPa < 0.0f
      ? PRESSURE_SMALL_DELTA_KPA + 1.0f
      : fabsf(pressureKPa - lastPublishedPressureKPa);
  if (delta <= PRESSURE_STABLE_DELTA_KPA) return PRESSURE_REPORT_STABLE_MS;
  if (delta <= PRESSURE_SMALL_DELTA_KPA) return PRESSURE_REPORT_SMALL_MS;
  return PRESSURE_REPORT_LARGE_MS;
}

// MQTT contract: {"var":[{"id":1,"val":123.4},{"id":2,"val":...}]}
// Values are pressure in kPa; the full-scale sensor range is 0..1200 kPa.
static void publishPressureReport() {
  if (!netWork_Mqtt.checkStatusMqtt()) return;

  StaticJsonDocument<MQTT_JSON_DOC_SIZE> jsonBufferData;
  JsonArray data = jsonBufferData.createNestedArray("var");
  JsonObject master = data.createNestedObject();
  master["id"] = 1;
  master["val"] = sensorValue.valuePressureKPa;
  for (uint8_t i = 0; i < LORA_REMOTE_NODE_CAPACITY; ++i) {
    if (!remotePressureNodes[i].used) continue;
    JsonObject node = data.createNestedObject();
    node["id"] = remotePressureNodes[i].id;
    node["val"] = remotePressureNodes[i].pressureKPa;
  }

  char payload[MQTT_PAYLOAD_SIZE];
  const size_t written = serializeJson(jsonBufferData, payload, sizeof(payload));
  if (written > 0 && written < sizeof(payload)) netWork_Mqtt.sendMessageInfo(payload);
}

static void reportMasterPressureIfDue() {
#if LORA_ROLE_GATEWAY
  const unsigned long now = millis();
  if (lastPressurePublishMs == 0 || now - lastPressurePublishMs >= pressureReportInterval(sensorValue.valuePressureKPa)) {
    publishPressureReport();
    lastPublishedPressureKPa = sensorValue.valuePressureKPa;
    lastPressurePublishMs = now;
  }
#endif
}

#if SUPPORT_LORA
static RemotePressureNode *findRemoteNode(uint16_t id) {
  for (uint8_t i = 0; i < LORA_REMOTE_NODE_CAPACITY; ++i) {
    if (remotePressureNodes[i].used && remotePressureNodes[i].id == id) return &remotePressureNodes[i];
  }
  for (uint8_t i = 0; i < LORA_REMOTE_NODE_CAPACITY; ++i) {
    if (!remotePressureNodes[i].used) {
      remotePressureNodes[i].used = true;
      remotePressureNodes[i].id = id;
      return &remotePressureNodes[i];
    }
  }
  return NULL; // bounded table: never overwrite another live device silently
}

static void sendLoraAck(uint16_t nodeId, uint16_t sequence) {
  char ack[32];
  snprintf(ack, sizeof(ack), "A,%u,%u,%u", LORA_NETWORK_ID, nodeId, sequence);
  netWork_RF.sendData(String(ack));
}

static void processLoraPacket() {
  uint8_t raw[LORA_BUFFER_SIZE];
  size_t len = 0;
  if (!netWork_RF.receiveData(raw, sizeof(raw) - 1, len)) return;
  raw[len] = '\0';
  lastLoraPayload = String((char *)raw);

  char type = 0;
  unsigned network = 0, node = 0, sequence = 0;
  long pressureDeciKPa = 0;
  if (sscanf((char *)raw, "%c,%u,%u,%u,%ld", &type, &network, &node, &sequence, &pressureDeciKPa) >= 4 && network == LORA_NETWORK_ID) {
    if (type == 'A' && node == LORA_NODE_ID && sequence == pendingSequence) {
      waitingForLoraAck = false;
      pendingRetries = 0;
      return;
    }
#if LORA_ROLE_GATEWAY
    if (type == 'P' && node > 1 && pressureDeciKPa >= 0 && pressureDeciKPa <= (long)(PRESSURE_SENSOR_FULL_SCALE_KPA * 10.0f)) {
      RemotePressureNode *remote = findRemoteNode((uint16_t)node);
      // ACK every valid packet, including a retry. The duplicate is not published again.
      sendLoraAck((uint16_t)node, (uint16_t)sequence);
      if (remote != NULL && (remote->lastSequence != (uint16_t)sequence || remote->lastSeenMs == 0)) {
        remote->lastSequence = (uint16_t)sequence;
        remote->pressureKPa = pressureDeciKPa / 10.0f;
        remote->lastSeenMs = millis();
        publishPressureReport();
      }
    }
#endif
  }
}

static bool isOwnLoraSlot() {
  const unsigned long slot = (millis() / LORA_SLOT_LENGTH_MS) % LORA_SLOT_COUNT;
  return slot == (LORA_NODE_ID % LORA_SLOT_COUNT);
}

static unsigned long currentLoraSlot() {
  return millis() / LORA_SLOT_LENGTH_MS;
}

static void sendNodePressure(bool newSequence) {
  char packet[48];
  if (newSequence) {
    ++loraSequence;
    pendingSequence = loraSequence;
  }
  const long deciKPa = lroundf(sensorValue.valuePressureKPa * 10.0f);
  snprintf(packet, sizeof(packet), "P,%u,%u,%u,%ld", LORA_NETWORK_ID, LORA_NODE_ID, pendingSequence, deciKPa);
  netWork_RF.sendData(String(packet));
  lastLoraTransmitSlot = currentLoraSlot();
  waitingForLoraAck = true;
  loraAckDeadlineMs = millis() + LORA_ACK_TIMEOUT_MS;
}

static void reportNodePressureIfDue() {
#if !LORA_ROLE_GATEWAY
  const unsigned long now = millis();
  const bool due = lastPressurePublishMs == 0 ||
      now - lastPressurePublishMs >= pressureReportInterval(sensorValue.valuePressureKPa);
  if (waitingForLoraAck && now - loraAckDeadlineMs < 0x80000000UL) {
    if (++pendingRetries > LORA_MAX_RETRIES) {
      waitingForLoraAck = false; // next reporting cycle will use a new sequence
      pendingRetries = 0;
    } else if (isOwnLoraSlot() && currentLoraSlot() != lastLoraTransmitSlot) {
      sendNodePressure(false);
    }
  }
  if (!waitingForLoraAck && due && isOwnLoraSlot()) {
    if (nextLoraAttemptMs == 0) {
      // The small randomized delay makes node-id slot collisions recoverable.
      nextLoraAttemptMs = now + random(1, LORA_RANDOM_BACKOFF_MS + 1);
    } else if (now >= nextLoraAttemptMs && currentLoraSlot() != lastLoraTransmitSlot) {
      sendNodePressure(true);
      lastPublishedPressureKPa = sensorValue.valuePressureKPa;
      lastPressurePublishMs = now;
      nextLoraAttemptMs = 0;
    }
  } else if (!isOwnLoraSlot()) {
    // Never transmit after the allocated slot has passed.
    nextLoraAttemptMs = 0;
  }
#endif
}
#endif


void TaskNetWork::loopNetWork(void) {
  DEVICE_LOG_INFO("start TaskNetWork::loopNetWork"+ String(modeStatus));
  if(WIFI_START_CONNECT==modeStatus){
      // check wifi netWor
        DEVICE_LOG_INFO("check wifi netWork compaireTimeInfo(processTimeData.timeStart)"+ String(compaireTimeInfo(processTimeData.timeStart)));
        DEVICE_LOG_INFO("check wifi netWork processTimeData.state"+ String(processTimeData.state));
        
        if(compaireTimeInfo(processTimeData.timeStart)>NETWORK_POLL_INTERVAL_MS){
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
#if SUPPORT_LORA
    processLoraPacket();
    reportNodePressureIfDue();
#endif
     updateStatusUART();
#if SUPPORT_RTOS
    // Process sensor queue data if any
    if (sensorDataQueue != NULL) {
        if(xQueueReceive(sensorDataQueue, &sensorValue, 0) == pdTRUE) {
            reportMasterPressureIfDue();
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
          // Fast LoRa polling is needed for the short ACK window; sensor sampling
          // itself remains at SENSOR_TASK_INTERVAL_MS in TaskSensor.
          vTaskDelay(50 / portTICK_PERIOD_MS);
      }
    #else
      // In non-RTOS mode, this function is called from loop() and should not block.
      loopNetWork();
      getRTCInfo();
    
    #endif
    //DEVICE_LOG_INFO("end TaskNetWork::taskRun");
}
