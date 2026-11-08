#pragma once

// Non-blocking lwIP probes of the station link (docs/Connectivity.md):
//   ARP  - is the gateway answering, and does another host answer for our
//          own address (IP conflict)? startArp() flushes the station ARP
//          cache and sends the requests; finishArp() reads the answers
//          WIFI_ARP_REPLY_WAIT_MS later.
//   DNS  - does the broker host name resolve? Asynchronous lwIP lookup.
// Supported on ESP32 (inside the tcpip thread) and on the ESP8266 NON-OS
// core; on the ESP8266 RTOS core every probe reports "not supported".
//
// DeviceIOT runs the probes inside the TCP/IP thread.

#include <Arduino.h>
#include <IPAddress.h>
#include <stdint.h>

namespace link_probe {

struct ArpReport {
    bool valid = false;              // The station interface was found.
    bool gatewayAnswered = false;    // Also true when there is no gateway.
    bool duplicateAddress = false;   // Another MAC answered for our address.
    uint8_t otherMac[6] = {0, 0, 0, 0, 0, 0};
};

bool arpSupported();
bool startArp(const IPAddress& self, const IPAddress& gateway);
ArpReport finishArp(const IPAddress& self, const IPAddress& gateway);

enum class DnsState : uint8_t {
    Idle,
    Pending,
    Resolved,
    Failed,
};

bool dnsSupported();
// Starts a lookup unless one is still pending. An IP literal resolves at once.
void startDns(const char* host, uint32_t nowMs);
// A lookup pending for DNS_PROBE_TIMEOUT_MS counts as Failed.
DnsState dnsState(uint32_t nowMs);
const char* dnsStateName(DnsState state);

}  // namespace link_probe
