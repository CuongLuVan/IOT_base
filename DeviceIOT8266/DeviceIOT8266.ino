// Start-up and scheduling. DeviceIOT.ino and DeviceIOT8266.ino are identical.

#include "DebugInfo.h"
#include "Memory.h"
#include "PlatformCompat.h"
#include "SystemTask.h"
#include "TaskDevice.h"
#include "TaskNetwork.h"
#include "TaskSensor.h"
#include "TaskWatchdog.h"
#include "define_All.h"

#if defined(ESP8266) && ESP8266_NONOS_CORE
#include <Schedule.h>
#endif

#if SUPPORT_RTOS
namespace {

// ESP32: Wi-Fi runs on core 0, so the sensor sampling gets core 1.
constexpr BaseType_t kNetworkCore = 0;
constexpr BaseType_t kSensorCore = 1;

bool createTask(TaskFunction_t entry, const char* name, uint32_t stackSize, UBaseType_t priority,
                task_watchdog::Slot slot, BaseType_t core)
{
    TaskHandle_t handle = nullptr;
#if defined(ESP32)
    const BaseType_t created = xTaskCreatePinnedToCore(entry, name, stackSize, nullptr, priority, &handle, core);
#else
    (void)core;
    const BaseType_t created = xTaskCreate(entry, name, stackSize, nullptr, priority, &handle);
#endif
    if (created != pdPASS) {
        DEVICE_LOGF_ERROR("[Boot] Cannot create task %s\n", name);
        return false;
    }
    SystemTask::registerTask(slot, handle);
    vTaskDelay(delayTicks(TASK_CREATE_DELAY_MS));
    return true;
}

}  // namespace
#endif

void setup()
{
    Serial.begin(SERIAL_BAUD_RATE);
    DEVICE_LOG_INFO("[Boot] Starting");

    if (!Memory::GetInstance()->begin(EEPROM_SIZE)) {
        DEVICE_LOG_ERROR("[Boot] EEPROM unavailable; running with defaults");
    }
    // Every module that other tasks talk to is ready before any task starts.
    TaskDevice::setup();
    TaskSensor::setup();
    SystemTask::setup();
    TaskNetwork::setup();

#if SUPPORT_RTOS
    task_watchdog::begin();
    bool started = true;
    started = started && createTask(TaskDevice::taskRun, "TaskDevice", TASK_STACK_SIZE, TASK_DEVICE_PRIORITY,
                                    task_watchdog::Slot::Device, kNetworkCore);
    started = started && createTask(TaskSensor::taskRun, "TaskSensor", TASK_STACK_SIZE, TASK_SENSOR_PRIORITY,
                                    task_watchdog::Slot::Sensor, kSensorCore);
    started = started && createTask(TaskNetwork::taskRun, "TaskNetwork", TASK_NETWORK_STACK_SIZE,
                                    TASK_NETWORK_PRIORITY, task_watchdog::Slot::Network, kNetworkCore);
    started = started && createTask(SystemTask::taskRun, "SystemTask", TASK_SYSTEM_STACK_SIZE, TASK_SYSTEM_PRIORITY,
                                    task_watchdog::Slot::System, kNetworkCore);
    // A device without one of its tasks accepts commands it never applies.
    if (!started) task_watchdog::restartOnFatal("task creation failed");
#elif defined(ESP8266)
    // NON-OS: the core runs recurrent functions at every yield() / delay(),
    // also inside blocking network calls (DNS, TLS handshake, MQTT CONNACK),
    // so outputs, button and auto OFF keep running while loop() is blocked.
    if (!schedule_recurrent_function_us(
            []() {
                TaskDevice::service();
                return true;
            },
            DEVICE_TASK_PERIOD_MS * 1000UL)) {
        task_watchdog::restartOnFatal("cannot schedule TaskDevice");
    }
#endif
}

void loop()
{
#if SUPPORT_RTOS
    vTaskDelay(delayTicks(RTOS_IDLE_LOOP_DELAY_MS));
#else
    TaskSensor::service();
    TaskNetwork::service();
    SystemTask::service();
    delay(COOP_LOOP_DELAY_MS);
#endif
}
