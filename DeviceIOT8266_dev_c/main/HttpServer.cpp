#include "HttpServer.h"

#include <ctype.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>

#include "DebugInfo.h"
#include "DeviceHttpApi.h"
#include "Platform.h"
#include "SafeRestart.h"
#include "SetupPortal.h"
#include "TaskWatchdog.h"
#include "define_All.h"

// Last: lwIP defines connect / read / write / close / send / recv ... as macros.
#include "lwip/sockets.h"

namespace http_server {

// Builds a Request from the raw bytes of one request.
struct RequestParser {
    static bool parse(const std::string& data, size_t headLength, size_t bodyLength, Request& request,
                      std::string& contentType);
    static void addArguments(Request& request, const std::string& text);
};

namespace {

struct Route {
    const char* path;
    uint8_t methods;
    Handler handler;
};

constexpr size_t kMaxRoutes = 12;
// Wait before start() tries again after the listening socket failed.
constexpr uint32_t kStartRetryMs = 1000;
// An idle connection (browser preconnect) gives way to a waiting one after this.
constexpr uint32_t kIdleYieldMs = 50;

Route routeTable[kMaxRoutes];
size_t routeCount = 0;

int listenFd = -1;
Routes activeRoutes = Routes::None;
size_t maxBodyLength = 0;
bool restartPending = false;
uint32_t restartRequestedMs = 0;
bool startFailed = false;
uint32_t startFailedMs = 0;

// The client being served; the network task is the only user.
struct Client {
    int fd = -1;
    uint32_t acceptedMs = 0;
    std::string data;
    size_t headLength = 0;  // 0 until the header is complete.
    size_t bodyLength = 0;
};

Client client;

// Reply of the request being handled.
std::string replyHeaders;
bool replied = false;

const char* reasonPhrase(int status)
{
    switch (status) {
        case 200: return "OK";
        case 204: return "No Content";
        case 400: return "Bad Request";
        case 403: return "Forbidden";
        case 404: return "Not Found";
        case 408: return "Request Timeout";
        case 413: return "Payload Too Large";
        case 422: return "Unprocessable Entity";
        case 431: return "Request Header Fields Too Large";
        case 500: return "Internal Server Error";
        case 503: return "Service Unavailable";
        default: return "Error";
    }
}

void setNonBlocking(int fd)
{
    lwip_fcntl(fd, F_SETFL, lwip_fcntl(fd, F_GETFL, 0) | O_NONBLOCK);
}

bool waitWritable(int fd, uint32_t timeoutMs)
{
    fd_set set;
    FD_ZERO(&set);
    FD_SET(fd, &set);
    struct timeval timeout;
    timeout.tv_sec = static_cast<long>(timeoutMs / 1000U);
    timeout.tv_usec = static_cast<long>((timeoutMs % 1000U) * 1000U);
    return lwip_select(fd + 1, nullptr, &set, nullptr, &timeout) > 0;
}

bool waitReadable(int fd, uint32_t timeoutMs)
{
    fd_set set;
    FD_ZERO(&set);
    FD_SET(fd, &set);
    struct timeval timeout;
    timeout.tv_sec = static_cast<long>(timeoutMs / 1000U);
    timeout.tv_usec = static_cast<long>((timeoutMs % 1000U) * 1000U);
    return lwip_select(fd + 1, &set, nullptr, nullptr, &timeout) > 0;
}

// Writes everything, waiting at most HTTP_SEND_TIMEOUT_MS whenever the TCP
// send buffer is full.
bool sendAllBytes(int fd, const char* data, size_t length)
{
    size_t sent = 0;
    while (sent < length) {
        const int result = lwip_send(fd, data + sent, length - sent, 0);
        if (result > 0) {
            sent += static_cast<size_t>(result);
            continue;
        }
        if (result < 0 && (errno == EAGAIN || errno == EWOULDBLOCK) && waitWritable(fd, HTTP_SEND_TIMEOUT_MS)) {
            continue;
        }
        return false;
    }
    return true;
}

void closeClient()
{
    if (client.fd >= 0) lwip_close(client.fd);
    client.fd = -1;
    client.data.clear();
    client.data.shrink_to_fit();
    client.headLength = 0;
    client.bodyLength = 0;
}

void writeReply(int status, const char* contentType, const std::string& body)
{
    if (client.fd < 0 || replied) return;
    replied = true;
    char statusLine[96];
    snprintf(statusLine, sizeof(statusLine), "HTTP/1.1 %d %s\r\n", status, reasonPhrase(status));
    std::string head = statusLine;
    if (contentType != nullptr) {
        head += "Content-Type: ";
        head += contentType;
        head += "\r\n";
    }
    char lengthLine[48];
    snprintf(lengthLine, sizeof(lengthLine), "Content-Length: %u\r\n", static_cast<unsigned>(body.size()));
    head += lengthLine;
    head += "Connection: close\r\n";
    head += replyHeaders;
    head += "\r\n";
    if (sendAllBytes(client.fd, head.data(), head.size()) && !body.empty()) {
        (void)sendAllBytes(client.fd, body.data(), body.size());
    }
}

void dropClient(int status, const char* reason)
{
    if (status != 0) {
        char response[128];
        const int length = snprintf(response, sizeof(response),
                                    "HTTP/1.1 %d %s\r\nConnection: close\r\nContent-Length: 0\r\n\r\n", status,
                                    reasonPhrase(status));
        if (length > 0) (void)sendAllBytes(client.fd, response, static_cast<size_t>(length));
        DEVICE_LOGF_WARNING("[HTTP] Request rejected with %d: %s\n", status, reason);
    } else {
        DEVICE_LOGF_DEBUG("[HTTP] Connection closed: %s\n", reason);
    }
    closeClient();
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

// Non-blocking read of up to limit bytes in total into client.data.
// false when the peer closed the connection or the socket failed.
bool pullAvailable(size_t limit)
{
    char chunk[256];
    while (client.data.size() < limit) {
        const size_t room = limit - client.data.size();
        const int received = lwip_recv(client.fd, chunk, room < sizeof(chunk) ? room : sizeof(chunk), MSG_DONTWAIT);
        if (received > 0) {
            client.data.append(chunk, static_cast<size_t>(received));
            continue;
        }
        if (received == 0) return false;
        return errno == EAGAIN || errno == EWOULDBLOCK;
    }
    return true;
}

// Large body (setup pages): read while it arrives, at most
// HTTP_MAX_POST_WAIT_MS per pause, feeding the task watchdog.
bool pullBlocking(size_t total)
{
    char chunk[256];
    while (client.data.size() < total) {
        if (!waitReadable(client.fd, HTTP_MAX_POST_WAIT_MS)) return false;
        const size_t room = total - client.data.size();
        const int received = lwip_recv(client.fd, chunk, room < sizeof(chunk) ? room : sizeof(chunk), MSG_DONTWAIT);
        if (received == 0) return false;
        if (received < 0) {
            if (errno == EAGAIN || errno == EWOULDBLOCK) continue;
            return false;
        }
        client.data.append(chunk, static_cast<size_t>(received));
        task_watchdog::reset(task_watchdog::Slot::Network);
    }
    return true;
}

enum class Gate : uint8_t { Wait, Ready, Drop };

Gate checkRequest(uint32_t nowMs)
{
    const uint32_t waitedMs = nowMs - client.acceptedMs;
    if (client.headLength == 0) {
        if (!pullAvailable(HTTP_HEADER_MAX_LENGTH)) {
            dropClient(0, "closed by the client");
            return Gate::Drop;
        }
        const size_t end = client.data.find("\r\n\r\n");
        if (end == std::string::npos) {
            if (client.data.size() >= HTTP_HEADER_MAX_LENGTH) {
                dropClient(431, "header too large");
                return Gate::Drop;
            }
            if (client.data.empty()) {
                // An idle connection (browser preconnect) gives way to a waiting one.
                if (waitedMs >= HTTP_REQUEST_TIMEOUT_MS ||
                    (waitedMs >= kIdleYieldMs && listenFd >= 0 && waitReadable(listenFd, 0))) {
                    dropClient(0, "no request");
                    return Gate::Drop;
                }
                return Gate::Wait;
            }
            if (waitedMs >= HTTP_REQUEST_TIMEOUT_MS) {
                dropClient(408, "incomplete header");
                return Gate::Drop;
            }
            return Gate::Wait;
        }
        client.headLength = end + 4;
        const long bodyLength = contentLength(client.data.c_str(), client.headLength);
        if (bodyLength < 0 || static_cast<size_t>(bodyLength) > maxBodyLength) {
            dropClient(413, "body too large");
            return Gate::Drop;
        }
        client.bodyLength = static_cast<size_t>(bodyLength);
    }

    const size_t total = client.headLength + client.bodyLength;
    if (total <= HTTP_PREBUFFER_MAX_LENGTH) {
        if (client.data.size() < total && !pullAvailable(total)) {
            dropClient(0, "closed by the client");
            return Gate::Drop;
        }
        if (client.data.size() < total) {
            if (waitedMs >= HTTP_REQUEST_TIMEOUT_MS) {
                dropClient(408, "incomplete body");
                return Gate::Drop;
            }
            return Gate::Wait;
        }
        return Gate::Ready;
    }
    if (!pullBlocking(total)) {
        dropClient(408, "body stalled");
        return Gate::Drop;
    }
    return Gate::Ready;
}

std::string urlDecode(const std::string& text)
{
    std::string decoded;
    decoded.reserve(text.size());
    for (size_t i = 0; i < text.size(); ++i) {
        const char c = text[i];
        if (c == '+') {
            decoded += ' ';
        } else if (c == '%' && i + 2 < text.size() && isxdigit(static_cast<unsigned char>(text[i + 1])) &&
                   isxdigit(static_cast<unsigned char>(text[i + 2]))) {
            const char hex[3] = {text[i + 1], text[i + 2], '\0'};
            decoded += static_cast<char>(strtol(hex, nullptr, 16));
            i += 2;
        } else {
            decoded += c;
        }
    }
    return decoded;
}

void handleRequest()
{
    Request request;
    std::string contentType;
    replyHeaders.clear();
    replied = false;
    if (!RequestParser::parse(client.data, client.headLength, client.bodyLength, request, contentType)) {
        dropClient(400, "malformed request line");
        return;
    }
    for (size_t i = 0; i < routeCount; ++i) {
        const Route& route = routeTable[i];
        if (request.path() == route.path && (route.methods & request.method()) != 0) {
            route.handler(request);
            if (!replied) sendJson(500, "{\"error\":\"no reply\"}");
            return;
        }
    }
    addCommonHeaders();
    writeReply(404, "text/plain", "Not found");
}

}  // namespace

bool RequestParser::parse(const std::string& data, size_t headLength, size_t bodyLength, Request& request,
                          std::string& contentType)
{
    const size_t lineEnd = data.find("\r\n");
    if (lineEnd == std::string::npos) return false;
    const std::string line = data.substr(0, lineEnd);
    const size_t firstSpace = line.find(' ');
    const size_t secondSpace = firstSpace == std::string::npos ? std::string::npos : line.find(' ', firstSpace + 1);
    if (firstSpace == std::string::npos || secondSpace == std::string::npos) return false;
    const std::string method = line.substr(0, firstSpace);
    const std::string target = line.substr(firstSpace + 1, secondSpace - firstSpace - 1);
    if (method == "GET") {
        request.method_ = kMethodGet;
    } else if (method == "POST") {
        request.method_ = kMethodPost;
    } else if (method == "OPTIONS") {
        request.method_ = kMethodOptions;
    } else {
        request.method_ = kMethodOther;
    }
    const size_t query = target.find('?');
    request.path_ = urlDecode(target.substr(0, query));
    if (query != std::string::npos) addArguments(request, target.substr(query + 1));

    // Content-Type header.
    static const char kContentType[] = "content-type:";
    size_t position = lineEnd + 2;
    while (position < headLength) {
        const size_t end = data.find("\r\n", position);
        if (end == std::string::npos || end == position) break;
        if (end - position > sizeof(kContentType) - 1 &&
            strncasecmp(data.c_str() + position, kContentType, sizeof(kContentType) - 1) == 0) {
            contentType = data.substr(position + sizeof(kContentType) - 1, end - position - (sizeof(kContentType) - 1));
            trimString(contentType);
        }
        position = end + 2;
    }

    if (bodyLength > 0) {
        const std::string body = data.substr(headLength, bodyLength);
        std::string lowerType = contentType;
        for (char& c : lowerType) c = static_cast<char>(tolower(static_cast<unsigned char>(c)));
        if (lowerType.find("application/x-www-form-urlencoded") != std::string::npos) addArguments(request, body);
        request.args_.push_back(std::make_pair(std::string("plain"), body));
    }
    return true;
}

void RequestParser::addArguments(Request& request, const std::string& text)
{
    size_t start = 0;
    while (start <= text.size()) {
        size_t end = text.find('&', start);
        if (end == std::string::npos) end = text.size();
        const std::string pair = text.substr(start, end - start);
        if (!pair.empty()) {
            const size_t equals = pair.find('=');
            const std::string name = urlDecode(pair.substr(0, equals));
            const std::string value = equals == std::string::npos ? std::string() : urlDecode(pair.substr(equals + 1));
            request.args_.push_back(std::make_pair(name, value));
        }
        start = end + 1;
    }
}

bool Request::hasArg(const char* name) const
{
    for (const auto& argument : args_) {
        if (argument.first == name) return true;
    }
    return false;
}

std::string Request::arg(const char* name) const
{
    for (const auto& argument : args_) {
        if (argument.first == name) return argument.second;
    }
    return std::string();
}

void Router::on(const char* path, uint8_t methods, Handler handler)
{
    if (routeCount >= kMaxRoutes) {
        DEVICE_LOG_ERROR("[HTTP] Route table full");
        return;
    }
    routeTable[routeCount++] = {path, methods, handler};
}

void start(Routes routes)
{
    stop();
    if (routes == Routes::None) return;
    const uint32_t nowMs = millis();
    if (startFailed && nowMs - startFailedMs < kStartRetryMs) return;

    const int fd = lwip_socket(AF_INET, SOCK_STREAM, 0);
    bool ok = fd >= 0;
    if (ok) {
        int reuse = 1;
        (void)lwip_setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));
        struct sockaddr_in address;
        memset(&address, 0, sizeof(address));
        address.sin_family = AF_INET;
        address.sin_port = htons(WIFI_HTTP_PORT);
        address.sin_addr.s_addr = htonl(INADDR_ANY);
        ok = lwip_bind(fd, reinterpret_cast<struct sockaddr*>(&address), sizeof(address)) == 0 &&
             lwip_listen(fd, HTTP_LISTEN_BACKLOG) == 0;
    }
    if (!ok) {
        if (fd >= 0) lwip_close(fd);
        startFailed = true;
        startFailedMs = nowMs;
        DEVICE_LOG_ERROR("[HTTP] Cannot open the web server socket");
        return;
    }
    startFailed = false;
    setNonBlocking(fd);
    listenFd = fd;

    Router router;
    if (routes == Routes::SetupPortal) {
        setup_portal::registerRoutes(router);
        device_http_api::registerLoraRoutes(router);
        maxBodyLength = SETUP_HTTP_BODY_MAX_LENGTH;
    } else {
        device_http_api::registerRoutes(router);
        maxBodyLength = LAN_REQUEST_MAX_LENGTH;
    }
    activeRoutes = routes;
}

void stop()
{
    closeClient();
    if (listenFd >= 0) {
        lwip_close(listenFd);
        listenFd = -1;
    }
    routeCount = 0;
    activeRoutes = Routes::None;
}

Routes routes()
{
    return activeRoutes;
}

void service(uint32_t nowMs)
{
    if (listenFd >= 0) {
        if (client.fd < 0) {
            const int fd = lwip_accept(listenFd, nullptr, nullptr);
            if (fd >= 0) {
                setNonBlocking(fd);
                client.fd = fd;
                client.acceptedMs = nowMs;
                client.data.clear();
                client.headLength = 0;
                client.bodyLength = 0;
            }
        }
        if (client.fd >= 0 && checkRequest(nowMs) == Gate::Ready) {
            handleRequest();
            closeClient();
        }
    }
    if (restartPending && nowMs - restartRequestedMs >= WIFI_WEB_RESPONSE_DELAY_MS) {
        safe_restart::restart("new configuration from the setup pages");
    }
}

void addHeader(const char* name, const char* value)
{
    replyHeaders += name;
    replyHeaders += ": ";
    replyHeaders += value;
    replyHeaders += "\r\n";
}

void addCommonHeaders()
{
    addHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    addHeader("Pragma", "no-cache");
    addHeader("Expires", "-1");
    addHeader("Access-Control-Allow-Origin", "*");
}

void sendJson(int status, const std::string& body)
{
    addCommonHeaders();
    writeReply(status, "application/json", body);
}

void sendEmpty(int status)
{
    writeReply(status, nullptr, std::string());
}

void restartAfterReply()
{
    restartPending = true;
    restartRequestedMs = millis();
}

}  // namespace http_server
