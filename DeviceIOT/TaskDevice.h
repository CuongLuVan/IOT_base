

class TaskDevice {
    public:
        static void setup(void);
        static void readTouch(void);
        static void controlPump(void);
        static void controlDevice(void);
        static void updateMemoryStatus(void);
        static void taskRun(void * parameter);
};
