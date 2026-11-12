#pragma once

// Console logging (UART0, printf) with a compile-time level, same macros and
// messages as DeviceIOT8266. A disabled level expands to an empty statement,
// so its argument is never evaluated and costs no flash.
//
//   ERROR   a feature is disabled or data is lost
//   WARNING something is rejected or will be retried
//   INFO    normal business events
//   DEBUG   detail for development
//
// DEVICE_LOG_*(msg) takes a const char* and adds a newline. DEVICE_LOGF_*(fmt, ...)
// is printf-style (the format carries its own "\n"). Never log passwords or keys.

#include <stdio.h>

#define DEVICE_LOG_LEVEL_NONE 0
#define DEVICE_LOG_LEVEL_ERROR 1
#define DEVICE_LOG_LEVEL_WARNING 2
#define DEVICE_LOG_LEVEL_INFO 3
#define DEVICE_LOG_LEVEL_DEBUG 4

#ifndef DEVICE_LOG_LEVEL
#define DEVICE_LOG_LEVEL DEVICE_LOG_LEVEL_INFO
#endif

#define DEVICE_LOG_DISCARD() \
    do {                     \
    } while (0)

#define DEVICE_LOG_PRINT_LINE(msg) printf("%s\n", static_cast<const char*>(msg))

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_ERROR
#define DEVICE_LOG_ERROR(msg) DEVICE_LOG_PRINT_LINE(msg)
#define DEVICE_LOGF_ERROR(...) printf(__VA_ARGS__)
#else
#define DEVICE_LOG_ERROR(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_ERROR(...) DEVICE_LOG_DISCARD()
#endif

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_WARNING
#define DEVICE_LOG_WARNING(msg) DEVICE_LOG_PRINT_LINE(msg)
#define DEVICE_LOGF_WARNING(...) printf(__VA_ARGS__)
#else
#define DEVICE_LOG_WARNING(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_WARNING(...) DEVICE_LOG_DISCARD()
#endif

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_INFO
#define DEVICE_LOG_INFO(msg) DEVICE_LOG_PRINT_LINE(msg)
#define DEVICE_LOGF_INFO(...) printf(__VA_ARGS__)
#else
#define DEVICE_LOG_INFO(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_INFO(...) DEVICE_LOG_DISCARD()
#endif

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_DEBUG
#define DEVICE_LOG_DEBUG(msg) DEVICE_LOG_PRINT_LINE(msg)
#define DEVICE_LOGF_DEBUG(...) printf(__VA_ARGS__)
#else
#define DEVICE_LOG_DEBUG(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_DEBUG(...) DEVICE_LOG_DISCARD()
#endif
