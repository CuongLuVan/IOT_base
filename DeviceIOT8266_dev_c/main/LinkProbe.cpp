#include "LinkProbe.h"

#include <string.h>

#include "DebugInfo.h"
#include "Sync.h"
#include "define_All.h"
#include "lwip/dns.h"
#include "lwip/etharp.h"
#include "lwip/ip_addr.h"
#include "lwip/netif.h"
#include "lwip/tcpip.h"

namespace link_probe {
namespace {

// Runs job(context) in the lwIP tcpip thread and waits for it. The job
// storage is static: if the wait times out, a late job still writes valid
// memory, and the next call waits for the semaphore it gives.
SemaphoreHandle_t jobDone = nullptr;

struct JobCall {
    void (*function)(void*);
    void* context;
};

JobCall pendingCall = {nullptr, nullptr};

void runInTcpip(void* argument)
{
    JobCall* call = static_cast<JobCall*>(argument);
    call->function(call->context);
    xSemaphoreGive(jobDone);
}

bool execute(void (*function)(void*), void* context)
{
    if (jobDone == nullptr) {
        jobDone = xSemaphoreCreateBinary();
        if (jobDone == nullptr) return false;
    }
    // A job that timed out earlier has finished by now or never will; drop its signal.
    (void)xSemaphoreTake(jobDone, 0);
    pendingCall.function = function;
    pendingCall.context = context;
    if (tcpip_callback(runInTcpip, &pendingCall) != ERR_OK) return false;
    if (xSemaphoreTake(jobDone, platform_sync::timeoutTicks(LWIP_JOB_TIMEOUT_MS)) != pdTRUE) {
        DEVICE_LOG_WARNING("[Link] lwIP job timed out");
        return false;
    }
    return true;
}

struct ArpJob {
    uint32_t self;
    uint32_t gateway;
    bool start;
    ArpReport report;
};

ArpJob arpJob;

struct netif* findStationNetif(uint32_t address)
{
    for (struct netif* candidate = netif_list; candidate != nullptr; candidate = candidate->next) {
        if (netif_is_up(candidate) && ip4_addr_get_u32(netif_ip4_addr(candidate)) == address) {
            return candidate;
        }
    }
    return nullptr;
}

void runArpJob(void* argument)
{
    ArpJob& job = *static_cast<ArpJob*>(argument);
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

platform_sync::AtomicU32 dnsStateValue(static_cast<uint32_t>(DnsState::Idle));
platform_sync::AtomicU32 dnsGeneration;
uint32_t dnsStartedMs = 0;

// lwIP DNS callback, in the tcpip thread.
void onDnsFound(const char* name, const ip_addr_t* address, void* argument)
{
    (void)name;
    if (static_cast<uint32_t>(reinterpret_cast<uintptr_t>(argument)) != dnsGeneration.load()) {
        return;
    }
    dnsStateValue.store(static_cast<uint32_t>(address != nullptr ? DnsState::Resolved : DnsState::Failed));
}

struct DnsJob {
    char host[128];
    uint32_t generation;
    err_t result;
};

DnsJob dnsJob;

void runDnsJob(void* argument)
{
    DnsJob& job = *static_cast<DnsJob*>(argument);
    ip_addr_t address;
    job.result = dns_gethostbyname(job.host, &address, onDnsFound,
                                   reinterpret_cast<void*>(static_cast<uintptr_t>(job.generation)));
}

}  // namespace

bool arpSupported()
{
    return true;
}

bool startArp(uint32_t self, uint32_t gateway)
{
    arpJob.self = self;
    arpJob.gateway = gateway;
    arpJob.start = true;
    arpJob.report = ArpReport();
    return execute(runArpJob, &arpJob) && arpJob.report.valid;
}

ArpReport finishArp(uint32_t self, uint32_t gateway)
{
    arpJob.self = self;
    arpJob.gateway = gateway;
    arpJob.start = false;
    arpJob.report = ArpReport();
    if (!execute(runArpJob, &arpJob)) return ArpReport();
    return arpJob.report;
}

bool dnsSupported()
{
    return true;
}

void startDns(const char* host, uint32_t nowMs)
{
    if (host == nullptr || host[0] == '\0' || strlen(host) >= sizeof(dnsJob.host) ||
        dnsState(nowMs) == DnsState::Pending) {
        return;
    }
    memcpy(dnsJob.host, host, strlen(host) + 1);
    dnsJob.generation = dnsGeneration.fetchAdd(1) + 1;
    dnsJob.result = ERR_OK;
    dnsStartedMs = nowMs;
    dnsStateValue.store(static_cast<uint32_t>(DnsState::Pending));
    if (!execute(runDnsJob, &dnsJob)) {
        dnsStateValue.store(static_cast<uint32_t>(DnsState::Failed));
        return;
    }
    if (dnsJob.result == ERR_OK) {
        dnsStateValue.store(static_cast<uint32_t>(DnsState::Resolved));
    } else if (dnsJob.result != ERR_INPROGRESS) {
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
