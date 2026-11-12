#pragma once

// The device web server (WIFI_HTTP_PORT): one instance at a time, with the
// routes of the setup pages (SetupPortal) or of the station (DeviceHttpApi).
// It replaces ESP8266WebServer + the request gate of DeviceIOT8266 and runs
// inside the network task on non-blocking lwIP sockets, so request handlers
// run in the same task as MQTT (no extra lock):
//   - one client at a time; a request is handled only once its header and,
//     up to HTTP_PREBUFFER_MAX_LENGTH bytes, its whole body have arrived;
//   - 408 when that does not happen within HTTP_REQUEST_TIMEOUT_MS, 431 for a
//     header over HTTP_HEADER_MAX_LENGTH, 413 for a Content-Length over the
//     route limit (before the body is read);
//   - a larger body (setup pages only) is read while it arrives, at most
//     HTTP_MAX_POST_WAIT_MS per pause.
// Call everything from the network task.

#include <stddef.h>
#include <stdint.h>
#include <string>
#include <utility>
#include <vector>

namespace http_server {

enum class Routes : uint8_t {
    None,
    Station,      // /control, /update, /lan, /lora.
    SetupPortal,  // /, /setup, /wifi, /lora.
};

// Route method masks.
constexpr uint8_t kMethodGet = 0x01;
constexpr uint8_t kMethodPost = 0x02;
constexpr uint8_t kMethodOptions = 0x04;
constexpr uint8_t kMethodOther = 0x08;
constexpr uint8_t kMethodAny = 0xFF;

// One parsed request. Arguments are the query string and, for a
// form-urlencoded body, its fields (URL-decoded); "plain" is the raw body.
class Request {
public:
    uint8_t method() const
    {
        return method_;
    }
    const std::string& path() const
    {
        return path_;
    }
    bool hasArg(const char* name) const;
    // "" when missing.
    std::string arg(const char* name) const;

private:
    friend struct RequestParser;
    uint8_t method_ = kMethodOther;
    std::string path_;
    std::vector<std::pair<std::string, std::string>> args_;
};

using Handler = void (*)(const Request& request);

// Route table of the running server.
class Router {
public:
    void on(const char* path, uint8_t methods, Handler handler);
};

// Replaces the running server (if any) with a new one serving routes.
void start(Routes routes);
void stop();
Routes routes();
// Answers pending requests; performs a restart requested by restartAfterReply().
void service(uint32_t nowMs);

// For request handlers, one reply per request:
// JSON reply with the no-cache and CORS headers.
void sendJson(int status, const std::string& body);
// Reply without a body (e.g. 204), with the headers added before.
void sendEmpty(int status);
// Extra header of the next reply.
void addHeader(const char* name, const char* value);
// Cache-Control / Pragma / Expires no-cache and Access-Control-Allow-Origin *.
void addCommonHeaders();
// Restarts WIFI_WEB_RESPONSE_DELAY_MS later, so the current reply still leaves.
void restartAfterReply();

}  // namespace http_server
