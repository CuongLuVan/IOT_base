// DeviceIOT runs lwIP probes in its TCP/IP thread.

#include "LinkProbe.h"

#include <string.h>

#include "Sync.h"
#include "define_All.h"

#include <lwip/dns.h>
#include <lwip/etharp.h>
#include <lwip/ip_addr.h>
#include <lwip/netif.h>
#include <esp_netif.h>

namespace link_probe {

namespace {

struct ArpJob {
    uint32_t self;
    uint32_t gateway;
    bool start;
    ArpReport report;
};

// Runs in the ESP32 lwIP TCP/IP thread.
struct netif* findStationNetif(uint32_t address)
{
    struct netif* candidate = nullptr;
    NETIF_FOREACH(candidate)
    {
        if (netif_is_up(candidate) && ip4_addr_get_u32(netif_ip4_addr(candidate)) == address) {
            return candidate;
        }
    }
    return nullptr;
}

void runArpJob(ArpJob& job)
{
    struct netif* station = findStationNetif(job.self);
    if (station == nullptr) {
        return;
    }
    job.report.valid = true;
    ip4_addr_t self;
    ip4_addr_t gateway;
    ip4_addr_set_u32(&self, job.self);
    ip4_addr_set_u32(&gateway, job.gateway);

    if (job.start) {
        // Answers then create fresh entries: a stale cache would hide a dead
        // gateway for up to five minutes.
        etharp_cleanup_netif(station);
        if (job.gateway != 0) {
            etharp_request(station, &gateway);
        }
        // Nobody may answer for our own address; an answer creates an entry.
        etharp_request(station, &self);
        return;
    }

    struct eth_addr* mac = nullptr;
    const ip4_addr_t* entryAddress = nullptr;
    job.report.gatewayAnswered = job.gateway == 0 || etharp_find_addr(station, &gateway, &mac, &entryAddress) >= 0;
    mac = nullptr;
    if (etharp_find_addr(station, &self, &mac, &entryAddress) >= 0 && mac != nullptr &&
        memcmp(mac->addr, station->hwaddr, sizeof(mac->addr)) != 0) {
        job.report.duplicateAddress = true;
        memcpy(job.report.otherMac, mac->addr, sizeof(job.report.otherMac));
    }
}

esp_err_t runArpJobInTcpip(void* context)
{
    runArpJob(*static_cast<ArpJob*>(context));
    return ESP_OK;
}

void execute(ArpJob& job)
{
    esp_netif_tcpip_exec(runArpJobInTcpip, &job);
}

platform_sync::AtomicU32 dnsStateValue(static_cast<uint32_t>(DnsState::Idle));
platform_sync::AtomicU32 dnsGeneration;
uint32_t dnsStartedMs = 0;

void onDnsFound(const char* name, const ip_addr_t* address, void* argument)
{
    (void)name;
    if (static_cast<uint32_t>(reinterpret_cast<uintptr_t>(argument)) != dnsGeneration.load()) {
        return;
    }
    dnsStateValue.store(static_cast<uint32_t>(address != nullptr ? DnsState::Resolved : DnsState::Failed));
}

struct DnsJob {
    const char* host;
    uint32_t generation;
    err_t result;
};

void runDnsJob(DnsJob& job)
{
    ip_addr_t address;
    job.result = dns_gethostbyname(job.host, &address, onDnsFound,
                                   reinterpret_cast<void*>(static_cast<uintptr_t>(job.generation)));
}

esp_err_t runDnsJobInTcpip(void* context)
{
    runDnsJob(*static_cast<DnsJob*>(context));
    return ESP_OK;
}

void execute(DnsJob& job)
{
    esp_netif_tcpip_exec(runDnsJobInTcpip, &job);
}

}  // namespace

bool arpSupported()
{
    return true;
}

bool startArp(const IPAddress& self, const IPAddress& gateway)
{
    ArpJob job = {static_cast<uint32_t>(self), static_cast<uint32_t>(gateway), true, ArpReport()};
    execute(job);
    return job.report.valid;
}

ArpReport finishArp(const IPAddress& self, const IPAddress& gateway)
{
    ArpJob job = {static_cast<uint32_t>(self), static_cast<uint32_t>(gateway), false, ArpReport()};
    execute(job);
    return job.report;
}

bool dnsSupported()
{
    return true;
}

void startDns(const char* host, uint32_t nowMs)
{
    if (host == nullptr || host[0] == '\0' || dnsState(nowMs) == DnsState::Pending) {
        return;
    }
    DnsJob job = {host, dnsGeneration.fetchAdd(1) + 1, ERR_OK};
    dnsStartedMs = nowMs;
    dnsStateValue.store(static_cast<uint32_t>(DnsState::Pending));
    execute(job);
    if (job.result == ERR_OK) {
        dnsStateValue.store(static_cast<uint32_t>(DnsState::Resolved));
    } else if (job.result != ERR_INPROGRESS) {
        dnsStateValue.store(static_cast<uint32_t>(DnsState::Failed));
    }
}

DnsState dnsState(uint32_t nowMs)
{
    const DnsState state = static_cast<DnsState>(dnsStateValue.load());
    if (state == DnsState::Pending && nowMs - dnsStartedMs >= DNS_PROBE_TIMEOUT_MS) {
        dnsGeneration.fetchAdd(1);  // A late answer is ignored.
        dnsStateValue.store(static_cast<uint32_t>(DnsState::Failed));
        return DnsState::Failed;
    }
    return state;
}

const char* dnsStateName(DnsState state)
{
    switch (state) {
        case DnsState::Pending:
            return "pending";
        case DnsState::Resolved:
            return "ok";
        case DnsState::Failed:
            return "failed";
        case DnsState::Idle:
        default:
            return "idle";
    }
}

}  // namespace link_probe
