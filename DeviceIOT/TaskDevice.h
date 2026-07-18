#include "Common.h"

class TaskDevice {
    public:
        static void setup(void);
        static void readButton(void);
        static void controlPump(void);
        static void controlDevice(void);
        static void updateMemoryStatus(void);
        static void taskRun(void * parameter);
        static void setFlightCommand(uint8_t controlMode, int16_t throttle, int16_t moveX, int16_t moveY, int16_t around);
        static void applyFlightControl(const InfoSensor &sensor);
        static void resetFlightPid(void);
};
