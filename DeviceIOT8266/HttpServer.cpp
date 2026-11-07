// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include "HttpServer.h"

#include <new>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

#include "DebugInfo.h"
#include "DeviceHttpApi.h"
#include "SafeRestart.h"
#include "SetupPortal.h"
#include "define_All.h"

#if !(defined(ESP8266) && ESP8266_NONOS_CORE)
#include <lwip/sockets.h>
#endif

namespace {

// Header bytes of the waiting request; the network task is the only user.
char requestHead[HTTP_HEADER_MAX_LENGTH + 1];

// Copies up to length received bytes without consuming them.
template <typename Client>
size_t peekRequest(Client& client, char* buffer, size_t length)
{
#if defined(ESP8266) && ESP8266_NONOS_CORE
    // length <= available(), so peekBytes() does not wait.
    return client.peekBytes(reinterpret_cast<uint8_t*>(buffer), length);
#else
    // Nothing was read from this client yet, so every byte is still in the socket.
    const int count = recv(client.fd(), buffer, length, MSG_PEEK | MSG_DONTWAIT);
    return count > 0 ? static_cast<size_t>(count) : 0;
#endif
}

// Content-Length of a complete header block; 0 when absent, -1 when invalid.
long contentLength(const char* head, size_t headLength)
{
    static const char kName[] = "content-length:";
    const char* line = strstr(head, "\r\n");
    while (line != nullptr && static_cast<size_t>(line - head) < headLength) {
        line += 2;
        if (strncasecmp(line, kName, sizeof(kName) - 1) == 0) {
            char* end = nullptr;
            const long value = strtol(line + sizeof(kName) - 1, &end, 10);
            return end != line + sizeof(kName) - 1 && value >= 0 ? value : -1;
        }
        line = strstr(line, "\r\n");
    }
    return 0;
}

const char* reasonPhrase(int status)
{
    switch (status) {
        case 408:
            return "Request Timeout";
        case 413:
            return "Payload Too Large";
        case 431:
            return "Request Header Fields Too Large";
        default:
            return "Bad Request";
    }
}

}  // namespace

void DeviceWebServer::handleClient()
{
    if (_currentStatus == HC_NONE) {
        _currentClient = _server.accept();
        if (!_currentClient) return;
        _currentStatus = HC_WAIT_READ;
        _statusChange = millis();
    }
    if (_currentStatus == HC_WAIT_READ && checkRequest() != Gate::Ready) {
        return;
    }
    DeviceWebServerBase::handleClient();
}

DeviceWebServer::Gate DeviceWebServer::checkRequest()
{
    const uint32_t waitedMs = millis() - _statusChange;
    const int available = _currentClient.available();
    if (available <= 0) {
        if (!_currentClient.connected()) {
            dropClient(0, "closed by the client");
            return Gate::Drop;
        }
        // An idle connection (browser preconnect) gives way to a waiting one.
        if (waitedMs >= HTTP_REQUEST_TIMEOUT_MS || (waitedMs >= 50 && _server.hasClient())) {
            dropClient(0, "no request");
            return Gate::Drop;
        }
        return Gate::Wait;
    }

    const size_t wanted =
        static_cast<size_t>(available) < HTTP_HEADER_MAX_LENGTH ? static_cast<size_t>(available) : HTTP_HEADER_MAX_LENGTH;
    const size_t length = peekRequest(_currentClient, requestHead, wanted);
    requestHead[length] = '\0';
    const char* headEnd = strstr(requestHead, "\r\n\r\n");
    if (headEnd == nullptr) {
        if (length >= HTTP_HEADER_MAX_LENGTH) {
            dropClient(431, "header too large");
            return Gate::Drop;
        }
        if (waitedMs >= HTTP_REQUEST_TIMEOUT_MS) {
            dropClient(408, "incomplete header");
            return Gate::Drop;
        }
        return Gate::Wait;
    }

    const size_t headLength = static_cast<size_t>(headEnd - requestHead) + 4;
    const long bodyLength = contentLength(requestHead, headLength);
    if (bodyLength < 0 || static_cast<size_t>(bodyLength) > maxBodyLength_) {
        dropClient(413, "body too large");
        return Gate::Drop;
    }
    const size_t total = headLength + static_cast<size_t>(bodyLength);
    if (total <= HTTP_PREBUFFER_MAX_LENGTH && static_cast<size_t>(available) < total) {
        if (waitedMs >= HTTP_REQUEST_TIMEOUT_MS) {
            dropClient(408, "incomplete body");
            return Gate::Drop;
        }
        return Gate::Wait;
    }
    return Gate::Ready;
}

void DeviceWebServer::dropClient(int status, const char* reason)
{
    if (status != 0) {
        char response[96];
        const int length = snprintf(response, sizeof(response),
                                    "HTTP/1.1 %d %s\r\nConnection: close\r\nContent-Length: 0\r\n\r\n", status,
                                    reasonPhrase(status));
        if (length > 0) {
            _currentClient.write(reinterpret_cast<const uint8_t*>(response), static_cast<size_t>(length));
        }
        DEVICE_LOGF_WARNING("[HTTP] Request rejected with %d: %s\n", status, reason);
    } else {
        DEVICE_LOGF_DEBUG("[HTTP] Connection closed: %s\n", reason);
    }
    _currentClient.stop();
    _currentClient = decltype(_currentClient)();
    _currentStatus = HC_NONE;
}

namespace http_server {

namespace {
DeviceWebServer* instance = nullptr;
Routes activeRoutes = Routes::None;
bool restartPending = false;
uint32_t restartRequestedMs = 0;
}  // namespace

void start(Routes routes)
{
    stop();
    if (routes == Routes::None) return;
    instance = new (std::nothrow) DeviceWebServer(WIFI_HTTP_PORT);
    if (instance == nullptr) {
        DEVICE_LOG_ERROR("[HTTP] Not enough memory for the web server");
        return;
    }
    if (routes == Routes::SetupPortal) {
        setup_portal::registerRoutes(*instance);
        device_http_api::registerLoraRoutes(*instance);
        instance->setMaxBodyLength(SETUP_HTTP_BODY_MAX_LENGTH);
    } else {
        device_http_api::registerRoutes(*instance);
        instance->setMaxBodyLength(LAN_REQUEST_MAX_LENGTH);
    }
    instance->begin();
    activeRoutes = routes;
}

void stop()
{
    if (instance != nullptr) {
        instance->close();
        delete instance;
        instance = nullptr;
    }
    activeRoutes = Routes::None;
}

Routes routes()
{
    return activeRoutes;
}

void service(uint32_t nowMs)
{
    if (instance != nullptr) {
        instance->handleClient();
    }
    if (restartPending && nowMs - restartRequestedMs >= WIFI_WEB_RESPONSE_DELAY_MS) {
        safe_restart::restart("new configuration from the setup pages");
    }
}

DeviceWebServer& server()
{
    return *instance;
}

void addCommonHeaders()
{
    instance->sendHeader(F("Cache-Control"), F("no-cache, no-store, must-revalidate"));
    instance->sendHeader(F("Pragma"), F("no-cache"));
    instance->sendHeader(F("Expires"), F("-1"));
    instance->sendHeader(F("Access-Control-Allow-Origin"), F("*"));
}

void sendJson(int status, const String& body)
{
    addCommonHeaders();
    instance->send(status, "application/json", body);
}

void restartAfterReply()
{
    restartPending = true;
    restartRequestedMs = millis();
}

}  // namespace http_server
