#include "Clock.h"

#include "DebugInfo.h"
#include "lwip/apps/sntp.h"

namespace device_clock {

void startSync()
{
    static bool started = false;
    if (started) return;
    sntp_setoperatingmode(SNTP_OPMODE_POLL);
    sntp_setservername(0, const_cast<char*>("pool.ntp.org"));
    // Ignored by lwIP when SNTP_MAX_SERVERS is 1.
    sntp_setservername(1, const_cast<char*>("time.nist.gov"));
    sntp_init();
    started = true;
    DEVICE_LOG_INFO("[Clock] SNTP started");
}

}  // namespace device_clock
