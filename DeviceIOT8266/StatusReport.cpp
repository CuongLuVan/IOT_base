// Status report and short command replies. Each is built in one JsonDocument
// and serialised once by the sink.
//
// Status report (reply to com 2, 4, 5, 8..12, 14, and after every MQTT connect):
//   {"se":..,"va":..,"co":..,"set":["8,20,1,1,5",...],"tim":1800,"cd":0,"cm":1,"cs":600,
//    "ip":"..","th":[n,n],"rc":..,"rs":..,"id":..,"ci":..,"cp":..}
// - the device status (writeDeviceInfo in Common.h);
// - "set": every active schedule as 5 numbers "hour,minute,weekday,port_state,auto_off",
//   ordered by time (docs/Schedule.md);
// - "tim": on-timer seconds (0 = off); "cd" / "cm" / "cs": countdown seconds
//   left (0 = idle), its ports and its last length;
// - "ip": the LAN address, so web_manager can reach the device without the broker;
// - "th": both sensor threshold rules (ThresholdControl.h), 0 = empty;
// - for a command: "rc" (the com answered), "rs" (CommandStatus), "id" (schedule
//   or rule) and on conflict "ci" / "cp" (conflicting schedule id / ports).
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

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

void writeDeviceStatus(JsonDocument& document)
{
    InfoSensor sensor = {};
    (void)TaskSensor::copyLatest(sensor);
    InfoDeviceControl device = {};
    (void)TaskDevice::copyStatus(device);
    writeDeviceInfo(document.to<JsonObject>(), sensor, device);
}

void writeResult(JsonDocument& document, long replyTo, CommandStatus status)
{
    document["rc"] = replyTo;
    document["rs"] = toWire(status);
}

}  // namespace

void sendReport(ReplySink& sink, long replyTo, const CommandResult& result, long id)
{
    JsonDocument report;
    writeDeviceStatus(report);
    ScheduleEngine::addSettings(report["set"].to<JsonArray>());
    report["tim"] = OnTimer::seconds();
    report["cd"] = Countdown::remaining();
    report["cm"] = Countdown::mask();
    report["cs"] = Countdown::lastSeconds();
    report["ip"] = mqtt_platform::localIp();
    JsonArray thresholds = report["th"].to<JsonArray>();
    for (uint8_t rule = 1; rule <= threshold::kRuleCount; ++rule) {
        thresholds.add(ThresholdControl::value(rule));
    }
    if (replyTo != 0) {
        writeResult(report, replyTo, result.status);
        if (id > 0) {
            report["id"] = id;
        }
        if (result.status == CommandStatus::Conflict) {
            report["ci"] = result.conflictId;
            report["cp"] = result.conflictPorts;
        }
    }
    if (report.overflowed()) {
        DEVICE_LOG_WARNING("[Status] Status report does not fit in RAM");
        return;
    }
    (void)sink.send(report);
}

void sendShortReply(ReplySink& sink, long replyTo, CommandStatus status)
{
    JsonDocument reply;
    writeDeviceStatus(reply);
    writeResult(reply, replyTo, status);
    (void)sink.send(reply);
}

void sendResult(ReplySink& sink, long replyTo, CommandStatus status)
{
    JsonDocument reply;
    writeResult(reply, replyTo, status);
    (void)sink.send(reply);
}

}  // namespace status
}  // namespace mqtt
