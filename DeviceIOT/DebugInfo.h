#pragma once

// Serial logging with a compile-time level. A disabled level expands to an
// empty statement, so its argument (often a String concatenation) is never
// evaluated and costs neither flash nor heap.
//
//   ERROR   a feature is disabled or data is lost
//   WARNING something is rejected or will be retried
//   INFO    normal business events
//   DEBUG   detail for development
//
// DEVICE_LOG_*(msg) accepts anything Serial.println accepts (const char*,
// F("..."), String). DEVICE_LOGF_*(fmt, ...) is printf-style and allocates
// nothing on the heap. Never log passwords or keys.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#include <Arduino.h>

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

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_ERROR
#define DEVICE_LOG_ERROR(msg) Serial.println(msg)
#define DEVICE_LOGF_ERROR(...) Serial.printf(__VA_ARGS__)
#else
#define DEVICE_LOG_ERROR(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_ERROR(...) DEVICE_LOG_DISCARD()
#endif

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_WARNING
#define DEVICE_LOG_WARNING(msg) Serial.println(msg)
#define DEVICE_LOGF_WARNING(...) Serial.printf(__VA_ARGS__)
#else
#define DEVICE_LOG_WARNING(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_WARNING(...) DEVICE_LOG_DISCARD()
#endif

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_INFO
#define DEVICE_LOG_INFO(msg) Serial.println(msg)
#define DEVICE_LOGF_INFO(...) Serial.printf(__VA_ARGS__)
#else
#define DEVICE_LOG_INFO(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_INFO(...) DEVICE_LOG_DISCARD()
#endif

#if DEVICE_LOG_LEVEL >= DEVICE_LOG_LEVEL_DEBUG
#define DEVICE_LOG_DEBUG(msg) Serial.println(msg)
#define DEVICE_LOGF_DEBUG(...) Serial.printf(__VA_ARGS__)
#else
#define DEVICE_LOG_DEBUG(msg) DEVICE_LOG_DISCARD()
#define DEVICE_LOGF_DEBUG(...) DEVICE_LOG_DISCARD()
#endif
