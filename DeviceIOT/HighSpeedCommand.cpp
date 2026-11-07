// {"com":15}: high-speed capture (docs/HighSpeedAcquisition.md), DeviceIOT only.
//   {"com":15,"value":<duration ms>,"mode":1..4,"udp_host":"..","udp_port":n} starts,
//   {"com":15,"value":0} stops, {"com":15} only reports.
// Reply {"rc":15,"rs":<status>,"act":<1 = sampling>}: rs 0 ok, 2 invalid (mode,
// UDP target or duration), 5 sensor / sampler not ready, 7 busy.

#include <IPAddress.h>

#include "DebugInfo.h"
#include "HighSpeedSampler.h"
#include "MqttInternal.h"

namespace mqtt {
namespace {

// "mode" on the wire is the HighSpeedMode value.
static_assert(HS_MODE_ADC_10KHZ == 1 && HS_MODE_ICM32K == 2 && HS_MODE_ADS100K == 3 && HS_MODE_ALL == 4,
              "com:15 \"mode\" numbers are HighSpeedMode values");

// Capture packets go to one host: not 0.x.x.x, multicast (224+) or broadcast.
bool isUsableUnicastIp(const IPAddress& address)
{
    constexpr uint8_t kFirstMulticastOctet = 224;
    return address[0] != 0 && address[0] < kFirstMulticastOctet;
}

void sendReply(ReplySink& sink, CommandStatus status, const char* reason = nullptr)
{
    if (reason != nullptr) {
        DEVICE_LOGF_WARNING("[HighSpeed] %s\n", reason);
    }
    JsonDocument reply;
    reply["rc"] = static_cast<int>(COMMAND_TYPE_HIGH_SPEED_CAPTURE);
    reply["rs"] = toWire(status);
    reply["act"] = HighSpeedSampler::GetInstance().isSamplingActive() ? 1 : 0;
    (void)sink.send(reply);
}

}  // namespace

void handleHighSpeedCommand(const CommandContext& context)
{
    HighSpeedSampler& sampler = HighSpeedSampler::GetInstance();
    if (context.fields["value"].isNull()) {
        sendReply(context.reply, CommandStatus::Ok);
        return;
    }
    long duration = 0;
    if (!readIntField(context.fields, "value", 0, 0, HS_CAPTURE_MAX_DURATION_MS, duration)) {
        sendReply(context.reply, CommandStatus::Invalid, "invalid_duration");
        return;
    }
    if (duration == 0) {
        sampler.stopSampling();
        sendReply(context.reply, CommandStatus::Ok);
        return;
    }

    long mode = 0;
    if (!readIntField(context.fields, "mode", 0, HS_MODE_ADC_10KHZ, HS_MODE_ALL, mode)) {
        sendReply(context.reply, CommandStatus::Invalid, "invalid_mode");
        return;
    }
    HighSpeedConfig config;
    config.mode = static_cast<HighSpeedMode>(mode);
    long port = 0;
    if (!config.udpTargetIP.fromString(context.fields["udp_host"] | "") || !isUsableUnicastIp(config.udpTargetIP) ||
        !readIntField(context.fields, "udp_port", 0, 1, 65535, port)) {
        sendReply(context.reply, CommandStatus::Invalid, "invalid_udp_target");
        return;
    }
    config.udpTargetPort = static_cast<uint16_t>(port);
    config.durationMs = static_cast<uint32_t>(duration);
    if (sampler.isSamplingActive()) {
        sendReply(context.reply, CommandStatus::Busy, "capture_busy");
        return;
    }
    if (!sampler.isModeAvailable(config.mode)) {
        sendReply(context.reply, CommandStatus::NotReady, "sensor_or_sampler_unavailable");
        return;
    }
    if (!sampler.startSampling(config)) {
        sendReply(context.reply, CommandStatus::NotReady, "capture_start_failed");
        return;
    }
    sendReply(context.reply, CommandStatus::Ok);
}

}  // namespace mqtt
