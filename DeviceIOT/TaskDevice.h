

class TaskDevice {
    public:
        static void setup(void);
        static void readButton(void);
        // Returns true only after a debounced LOW<->HIGH transition.
        static bool readMagneticSwitch(void);
        static void controlPump(void);
        static void controlDevice(void);
        static void updateMemoryStatus(void);
        static void taskRun(void * parameter);
};
