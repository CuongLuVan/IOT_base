#include "SystemTask.h"

#include <ArduinoJson.h>
#include <time.h>

#include "DebugInfo.h"
#include "PlatformCompat.h"
#include "define_All.h"

namespace {
SystemTaskSnapshot latestSnapshot = {};
volatile bool wifiConnected = false;
volatile bool mqttConnected = false;
uint32_t lastSnapshotMs = 0;

#if SUPPORT_RTOS
SemaphoreHandle_t snapshotMutex = nullptr;

TickType_t delayTicks(uint32_t milliseconds) {
    const TickType_t ticks = pdMS_TO_TICKS(milliseconds);
    return ticks == 0 ? 1 : ticks;
}
#endif

void refreshSnapshot() {
    const time_t now = time(nullptr);
    SystemTaskSnapshot snapshot = {};
    snapshot.uptimeMs = millis();
    snapshot.freeHeapBytes = ESP.getFreeHeap();
    snapshot.clockValid = now >= 1704067200;
    snapshot.epochSeconds = snapshot.clockValid ? static_cast<uint64_t>(now) : 0;
    snapshot.wifiConnected = wifiConnected;
    snapshot.mqttConnected = mqttConnected;

#if SUPPORT_RTOS
    if (snapshotMutex != nullptr && xSemaphoreTake(snapshotMutex, delayTicks(10)) == pdTRUE) {
        latestSnapshot = snapshot;
        xSemaphoreGive(snapshotMutex);
    }
#else
    latestSnapshot = snapshot;
#endif
}
} // namespace

void SystemTask::setup() {
    latestSnapshot = {};
    lastSnapshotMs = 0;
#if SUPPORT_RTOS
    if (snapshotMutex == nullptr) {
        snapshotMutex = xSemaphoreCreateMutex();
    }
#endif
}

void SystemTask::service() {
    const uint32_t now = millis();
    if (lastSnapshotMs == 0 || now - lastSnapshotMs >= SYSTEM_TASK_CHECK_INTERVAL_MS) {
        lastSnapshotMs = now;
        refreshSnapshot();
    }
}

void SystemTask::taskRun(void* parameter) {
    (void)parameter;
#if SUPPORT_RTOS
    for (;;) {
        service();
        vTaskDelay(delayTicks(100));
    }
#endif
}

void SystemTask::setNetworkState(bool wifi, bool mqtt, bool) {
    wifiConnected = wifi;
    mqttConnected = mqtt;
}

String SystemTask::telemetryJson() {
    SystemTaskSnapshot snapshot;
#if SUPPORT_RTOS
    if (snapshotMutex != nullptr && xSemaphoreTake(snapshotMutex, delayTicks(10)) == pdTRUE) {
        snapshot = latestSnapshot;
        xSemaphoreGive(snapshotMutex);
    } else {
        snapshot = latestSnapshot;
    }
#else
    snapshot = latestSnapshot;
#endif

    StaticJsonDocument<JSON_BUFFER_SIZE> document;
    document["event"] = "system.status";
    document["uptime_ms"] = snapshot.uptimeMs;
    document["heap_free_bytes"] = snapshot.freeHeapBytes;
    document["epoch_s"] = snapshot.epochSeconds;
    document["clock_valid"] = snapshot.clockValid;
    JsonObject network = document.createNestedObject("network");
    network["wifi"] = snapshot.wifiConnected;
    network["mqtt"] = snapshot.mqttConnected;

    String payload;
    if (serializeJson(document, payload) == 0 || document.overflowed()) {
        return String();
    }
    return payload;
}