

class TaskSensor {
    public:
        void setup(void);
        static void readSensor(void);
        static void readSensorDust(void);
        static void readSensorTemp(void);
        static void readSensorHumi(void);
        static void readSensorFSR(void);
        static void taskRun(void * parameter);
};
