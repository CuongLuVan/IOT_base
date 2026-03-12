//#include <semphr.h> 
//#include "freertos/semphr.h"
  #include <Arduino.h>

#define  WIFI_SSSID    50
#define  WIFI_PASS    100
#define  WIFI_SETUP_JSON    150


class Memory
{
    /**
     * The Singleton's constructor/destructor should always be private to
     * prevent direct construction/desctruction calls with the `new`/`delete`
     * operator.
     */
private:
    static Memory * pinstance_;
    int _size;
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
    void writeString(int address, const char* str);
    void writeString(int address, String str);
    String readString(int address, int maxLen = 1024);
    void writeChar(int address, char value);
    char readChar(int address);
    void saveWiFiCredentials(int ssidAddr, int passAddr, const char* ssid, const char* pass);
    void getWiFiCredentials(int ssidAddr, int passAddr, String &ssid, String &pass);
    uint64_t getTimeStamp();


};