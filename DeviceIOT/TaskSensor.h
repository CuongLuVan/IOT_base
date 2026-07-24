

class TaskSensor {
    public:
        void setup(void);
        static void readSensor(void);
        static void readSensorDistance(void);
        static void taskRun(void * parameter);
};
