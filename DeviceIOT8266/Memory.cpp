
#include "Memory.h"
#include <EEPROM.h>
#include "define_All.h"
#include "DebugInfo.h"


Memory* Memory::pinstance_{nullptr};
//mutex Memory::mutex_;

/**
 * The first time we call GetInstance we will lock the storage location
 *      and then we make sure again that the variable is null and then we
 *      set the value. RU:
 */
Memory *Memory::GetInstance()
{
   // std::lock_guard<std::mutex> lock(mutex_);
   
    if (pinstance_ == nullptr)
    {
        pinstance_ = new Memory();
    }
    return pinstance_;
}

void Memory::initEEPROM(int size) {
      DEVICE_LOG_INFO("start Memory::initEEPROM");
      EEPROM.begin(size);
      if (!EEPROM.begin(size)) {
          Serial.println("EEPROM init failed");
          // Có thể delay ngắn hoặc dừng hẳn
          while(1) { delay(100); }
      }
      _size = size;
      DEVICE_LOG_INFO("end Memory::initEEPROM");
}

// Ghi int
void Memory::writeInt(int address, int value) {
  EEPROM.writeInt(address, value);
  EEPROM.commit();
}

int  Memory::readInt(int address) {
  return EEPROM.readInt(address);
}

// Ghi long
void  Memory::writeLong(int address, long value) {
  EEPROM.writeLong(address, value);
  EEPROM.commit();
}

long  Memory::readLong(int address) {
  return EEPROM.readLong(address);
}

// Ghi double
void  Memory::writeDouble(int address, double value) {
  EEPROM.writeDouble(address, value);
  EEPROM.commit();
}

double  Memory::readDouble(int address) {
  return EEPROM.readDouble(address);
}

// Ghi chuỗi kiểu const char*
void  Memory::writeString(int address, const char* str) {
  int len = strlen(str);
  for (int i = 0; i < len; i++) {
    EEPROM.write(address + i, str[i]);
  }
  EEPROM.write(address + len, '\0'); // null-terminate
  EEPROM.commit();
}

// Ghi chuỗi kiểu String
void  Memory::writeString(int address, String str) {
  writeString(address, str.c_str());
}

// Đọc chuỗi về String
String  Memory::readString(int address, int maxLen ) {
  char data[maxLen + 1];
  int len = 0;
  unsigned char k;
  k = EEPROM.read(address);
  while (k != '\0' && len < maxLen) {
    data[len++] = k;
    k = EEPROM.read(address + len);
  }
  data[len] = '\0';
  return String(data);
}

// Intended for certificates and keys that are too large for a stack buffer.
String Memory::readLargeString(int address, int maxLen) {
  String data;
  data.reserve(maxLen);
  int len = 0;
  while (len < maxLen) {
    unsigned char k = EEPROM.read(address + len);
    if (k == '\0') {
      break;
    }
    data += (char)k;
    len++;
  }
  return data;
}

// Ghi một ký tự
void  Memory::writeChar(int address, char value) {
  EEPROM.write(address, value);
  EEPROM.commit();
}

char  Memory::readChar(int address) {
  return EEPROM.read(address);
}

// Ghi dữ liệu WiFi (SSID & Password)
void  Memory::saveWiFiCredentials(int ssidAddr, int passAddr, const char* ssid, const char* pass) {
  writeString(ssidAddr, ssid);
  writeString(passAddr, pass);
}

void  Memory::getWiFiCredentials(int ssidAddr, int passAddr, String &ssid, String &pass) {
  ssid = readString(ssidAddr);
  pass = readString(passAddr);
}

uint64_t  Memory::getTimeStamp(){
  time_stamp = time_stamp+ ((uint32_t) (millis() - startTime));
  startTime = millis();  // Reset mốc
  return time_stamp;
}
