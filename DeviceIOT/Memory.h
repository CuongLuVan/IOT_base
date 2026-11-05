//#include <semphr.h> 
//#include "freertos/semphr.h"
  #include <Arduino.h>
  #include <stddef.h>

// EEPROM addresses (WIFI_SSSID, WIFI_PASS, WIFI_SETUP_JSON, ...) live in the
// layout block of define_All.h.
#include "define_All.h"

struct BoundedStringWrite {
    int address;
    const char *value;
    size_t maxLength;
};

class Memory
{
    /**
     * The Singleton's constructor/destructor should always be private to
     * prevent direct construction/desctruction calls with the `new`/`delete`
     * operator.
     */
private:
    static Memory * pinstance_;
    int _size = 0;
    uint64_t  time_stamp = 0;
    uint32_t startTime = 0;
   // static std::mutex mutex_;
 //   SemaphoreHandle_t mutex_v; 
protected:
    Memory()
    {
    }
    ~Memory() {}

public:
    /**
     * Singletons should not be cloneable.
     */
    Memory(Memory &other) = delete;
    /**
     * Singletons should not be assignable.
     */
    void operator=(const Memory &) = delete;
    /**
     * This is the static method that controls the access to the singleton
     * instance. On the first run, it creates a singleton object and places it
     * into the static field. On subsequent runs, it returns the client existing
     * object stored in the static field.
     */

    static Memory *GetInstance();
    /**
     * Finally, any singleton should define some business logic, which can be
     * executed on its instance.
     */
    void SomeBusinessLogic()
    {
        // ...
    }

    void initEEPROM(int size);
    void writeInt(int address, int value);
    int readInt(int address);
    void writeLong(int address, long value);
    long readLong(int address);
    void writeDouble(int address, double value);
    double readDouble(int address);
    bool writeString(int address, const char* str, int maxLen = -1);
    bool writeString(int address, const String &str, int maxLen = -1);
    String readString(int address, int maxLen = 1024);
    String readLargeString(int address, int maxLen);
    bool readBoundedString(int address, size_t maxLength, String &value);
    bool writeBoundedString(int address, const char *value, size_t maxLength);
    bool writeBoundedStrings(const BoundedStringWrite *values, size_t count);
    // Bounded raw block access; writeBytes commits once for the whole block.
    bool readBytes(int address, uint8_t *data, size_t length);
    bool writeBytes(int address, const uint8_t *data, size_t length);
    void writeChar(int address, char value);
    char readChar(int address);
    void saveWiFiCredentials(int ssidAddr, int passAddr, const char* ssid, const char* pass);
    void getWiFiCredentials(int ssidAddr, int passAddr, String &ssid, String &pass);
    uint64_t getTimeStamp();


};
