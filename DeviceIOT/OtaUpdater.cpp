#include "OtaUpdater.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Update.h>
#include <stdio.h>

#include "DebugInfo.h"
#include "Memory.h"
#include "TaskWatchdog.h"
#include "define_All.h"

namespace ota_updater {

namespace {

// Ends the HTTP session on every return path. The core stream reads
// busy-wait up to the HTTP timeout, so it is kept short.
class HttpSession {
public:
    HttpSession()
    {
        http.setConnectTimeout(OTA_HTTP_CONNECT_TIMEOUT_MS);
        http.setTimeout(OTA_HTTP_TIMEOUT_MS);
    }
    ~HttpSession()
    {
        http.end();
    }
    HTTPClient http;
};

struct Version {
    int major = 0;
    int minor = 0;
    int patch = 0;
};

// "x.y.z"; anything else counts as 0.0.0.
Version parseVersion(const String& text)
{
    Version version;
    if (sscanf(text.c_str(), "%d.%d.%d", &version.major, &version.minor, &version.patch) != 3) {
        return Version();
    }
    return version;
}

bool isNewer(const Version& candidate, const Version& current)
{
    if (candidate.major != current.major) return candidate.major > current.major;
    if (candidate.minor != current.minor) return candidate.minor > current.minor;
    return candidate.patch > current.patch;
}

// Reads the version file; true when it names a newer image.
bool checkServerVersion(const char* versionUrl, String& serverVersion, String& binaryUrl)
{
    String body;
    {
        HttpSession session;
        if (!session.http.begin(versionUrl)) {
            DEVICE_LOG_WARNING("[OTA] Invalid version URL");
            return false;
        }
        const int status = session.http.GET();
        task_watchdog::reset(task_watchdog::Slot::Network);
        if (status != HTTP_STATUS_OK) {
            DEVICE_LOGF_WARNING("[OTA] Version check failed: HTTP %d\n", status);
            return false;
        }
        body = session.http.getString();
    }
    JsonDocument document;
    if (deserializeJson(document, body)) {
        DEVICE_LOG_WARNING("[OTA] Version file is not JSON");
        return false;
    }
    serverVersion = document["version"] | "";
    binaryUrl = document["bin"] | "";
    const String currentVersion = Memory::GetInstance()->readString(EEPROM_ADDR_FW_VERSION, FW_VERSION_MAX_LENGTH);
    DEVICE_LOGF_INFO("[OTA] Current %s, server %s\n", currentVersion.c_str(), serverVersion.c_str());
    if (binaryUrl.length() == 0 || !isNewer(parseVersion(serverVersion), parseVersion(currentVersion))) {
        DEVICE_LOG_INFO("[OTA] No newer firmware");
        return false;
    }
    return true;
}

// Copies the response body into Update. Reads only what has arrived and sleeps
// 1 ms otherwise (Update.writeStream() busy-waits in Stream::readBytes()), so
// the network task keeps feeding its watchdog; gives up after
// OTA_STALL_TIMEOUT_MS without data. size <= 0: until the server closes.
size_t copyToUpdate(HTTPClient& http, int size)
{
    static uint8_t buffer[1024];
    Stream* stream = http.getStreamPtr();
    size_t written = 0;
    uint32_t lastDataMs = millis();
    while (stream != nullptr && (size <= 0 || written < static_cast<size_t>(size))) {
        task_watchdog::reset(task_watchdog::Slot::Network);
        const int available = stream->available();
        if (available <= 0) {
            if (!http.connected()) break;
            if (millis() - lastDataMs >= OTA_STALL_TIMEOUT_MS) {
                DEVICE_LOG_WARNING("[OTA] Download stalled");
                break;
            }
            delay(1);
            continue;
        }
        const size_t wanted = static_cast<size_t>(available) < sizeof(buffer) ? static_cast<size_t>(available)
                                                                               : sizeof(buffer);
        const size_t count = stream->readBytes(buffer, wanted);
        if (count == 0) continue;
        if (Update.write(buffer, count) != count) break;
        written += count;
        lastDataMs = millis();
    }
    return written;
}

bool downloadAndFlash(const String& binaryUrl)
{
    HttpSession session;
    if (!session.http.begin(binaryUrl)) {
        DEVICE_LOG_WARNING("[OTA] Invalid firmware URL");
        return false;
    }
    const int status = session.http.GET();
    task_watchdog::reset(task_watchdog::Slot::Network);
    if (status != HTTP_STATUS_OK) {
        DEVICE_LOGF_WARNING("[OTA] Download failed: HTTP %d\n", status);
        return false;
    }
    const int size = session.http.getSize();
    if (!Update.begin(size > 0 ? static_cast<size_t>(size) : UPDATE_SIZE_UNKNOWN)) {
        DEVICE_LOGF_WARNING("[OTA] Cannot start the update: %s\n", Update.errorString());
        return false;
    }
    DEVICE_LOG_INFO("[OTA] Downloading firmware");
    const size_t written = copyToUpdate(session.http, size);
    if (Update.hasError() || (size > 0 && written != static_cast<size_t>(size))) {
        DEVICE_LOGF_WARNING("[OTA] Download incomplete: %u of %d bytes (%s)\n", static_cast<unsigned>(written), size,
                            Update.errorString());
        Update.abort();
        return false;
    }
    if (!Update.end(true) || !Update.isFinished()) {
        DEVICE_LOGF_WARNING("[OTA] Image rejected: %s\n", Update.errorString());
        return false;
    }
    return true;
}

}  // namespace

bool updateIfNewer(const char* versionUrl)
{
    if (versionUrl == nullptr || versionUrl[0] == '\0') {
        DEVICE_LOG_ERROR("[OTA] OTA_VERSION_URL is not configured");
        return false;
    }
    String serverVersion;
    String binaryUrl;
    if (!checkServerVersion(versionUrl, serverVersion, binaryUrl) || !downloadAndFlash(binaryUrl)) {
        return false;
    }
    Memory::GetInstance()->writeString(EEPROM_ADDR_FW_VERSION, serverVersion, FW_VERSION_MAX_LENGTH);
    DEVICE_LOGF_INFO("[OTA] Firmware %s installed\n", serverVersion.c_str());
    return true;
}

}  // namespace ota_updater
