

#define MODE_WIFI_ADRESS          1
#define SUPPORT_RTOS false
#define SUPPORT_LORA 1
#define SUPPORT_MQTT 1

// 0 = use standard WiFiClient
// 1 = use WiFiClientSecure for TLS-capable MQTT connections
#define MQTT_NO_TLS 1

#define COMMAND_TYPE_CONTROL      0x01
#define COMMAND_TYPE_OTHER        0x02

#define COMMAND_RESERVED_NONE     0x00
#define COMMAND_RESERVED_CONTROL  0x01

