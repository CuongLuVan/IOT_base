
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
      if (size <= 0) {
          DEVICE_LOG_INFO("[Memory] EEPROM size must be positive");
          while(1) { delay(100); }
      }
      if (!EEPROM.begin(size)) {
          DEVICE_LOG_INFO("[Memory] EEPROM initialization failed");
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

bool Memory::readBoundedString(int address, size_t maxLength, String &value) {
  value = "";
  if (_size <= 0 || address < 0 || address >= _size || maxLength == 0 ||
      maxLength >= static_cast<size_t>(_size - address)) {
    return false;
  }

  value.reserve(maxLength);
  for (size_t i = 0; i <= maxLength; ++i) {
    const unsigned char character = EEPROM.read(address + static_cast<int>(i));
    if (character == '\0') {
      return true;
    }
    if (i == maxLength) {
      value = "";
      return false;
    }
    value += static_cast<char>(character);
  }
  value = "";
  return false;
}

bool Memory::writeBoundedString(int address, const char *value, size_t maxLength) {
  const BoundedStringWrite entry = {address, value, maxLength};
  return writeBoundedStrings(&entry, 1);
}

bool Memory::writeBoundedStrings(const BoundedStringWrite *values, size_t count) {
  if (_size <= 0 || values == nullptr || count == 0) {
    return false;
  }

  for (size_t i = 0; i < count; ++i) {
    const BoundedStringWrite &entry = values[i];
    if (entry.value == nullptr || entry.address < 0 ||
        entry.address >= _size || entry.maxLength == 0 ||
        entry.maxLength >= static_cast<size_t>(_size - entry.address) ||
        strlen(entry.value) > entry.maxLength) {
      return false;
    }

    const size_t entryEnd =
        static_cast<size_t>(entry.address) + entry.maxLength + 1;
    for (size_t j = 0; j < i; ++j) {
      const size_t previousStart = static_cast<size_t>(values[j].address);
      const size_t previousEnd = previousStart + values[j].maxLength + 1;
      if (static_cast<size_t>(entry.address) < previousEnd &&
          previousStart < entryEnd) {
        return false;
      }
    }
  }

  for (size_t i = 0; i < count; ++i) {
    const BoundedStringWrite &entry = values[i];
    const size_t length = strlen(entry.value);
    for (size_t j = 0; j <= entry.maxLength; ++j) {
      const char character = j < length ? entry.value[j] : '\0';
      EEPROM.write(entry.address + static_cast<int>(j), character);
    }
  }
  return EEPROM.commit();
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
