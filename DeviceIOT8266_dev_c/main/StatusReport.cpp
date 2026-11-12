// Status report and short command replies (same messages as DeviceIOT8266).
// Each is built in one cJSON object and serialised once by the sink.
//
// Status report (reply to com 2, 4, 5, 8..12, 14, and after every MQTT connect):
//   {"se":..,"va":..,"co":..,"set":["8,20,1,1,5",...],"tim":1800,"cd":0,"cm":1,"cs":600,
//    "ip":"..","th":[n,n],"rc":..,"rs":..,"id":..,"ci":..,"cp":..}

#include "Common.h"
#include "Countdown.h"
#include "DebugInfo.h"
#include "MqttInternal.h"
#include "MqttPlatform.h"
#include "OnTimer.h"
#include "ScheduleEngine.h"
#include "TaskDevice.h"
#include "TaskSensor.h"
#include "ThresholdControl.h"

namespace mqtt {
namespace status {
namespace {

void writeDeviceStatus(cJSON* document)
{
    InfoSensor sensor = {};
    (void)TaskSensor::copyLatest(sensor);
    InfoDeviceControl device = {};
    (void)TaskDevice::copyStatus(device);
    writeDeviceInfo(document, sensor, device);
}

void writeResult(cJSON* document, long replyTo, CommandStatus status)
{
    json::setNumber(document, "rc", replyTo);
    json::setNumber(document, "rs", toWire(status));
}

}  // namespace

void sendReport(ReplySink& sink, long replyTo, const CommandResult& result, long id)
{
    json::Ptr owner = json::newObject();
    cJSON* report = owner.get();
    if (report == nullptr) {
        DEVICE_LOG_WARNING("[Status] Status report does not fit in RAM");
        return;
    }
    writeDeviceStatus(report);
    ScheduleEngine::addSettings(json::setArray(report, "set"));
    json::setNumber(report, "tim", OnTimer::seconds());
    json::setNumber(report, "cd", Countdown::remaining());
    json::setNumber(report, "cm", Countdown::mask());
    json::setNumber(report, "cs", Countdown::lastSeconds());
    json::setString(report, "ip", mqtt_platform::localIp());
    cJSON* thresholds = json::setArray(report, "th");
    for (uint8_t rule = 1; rule <= threshold::kRuleCount; ++rule) {
        json::addNumber(thresholds, ThresholdControl::value(rule));
    }
    if (replyTo != 0) {
        writeResult(report, replyTo, result.status);
        if (id > 0) {
            json::setNumber(report, "id", id);
        }
        if (result.status == CommandStatus::Conflict) {
            json::setNumber(report, "ci", result.conflictId);
            json::setNumber(report, "cp", result.conflictPorts);
        }
    }
    (void)sink.send(report);
}

void sendShortReply(ReplySink& sink, long replyTo, CommandStatus status)
{
    json::Ptr reply = json::newObject();
    if (!reply) return;
    writeDeviceStatus(reply.get());
    writeResult(reply.get(), replyTo, status);
    (void)sink.send(reply.get());
}

void sendResult(ReplySink& sink, long replyTo, CommandStatus status)
{
    json::Ptr reply = json::newObject();
    if (!reply) return;
    writeResult(reply.get(), replyTo, status);
    (void)sink.send(reply.get());
}

}  // namespace status
}  // namespace mqtt
