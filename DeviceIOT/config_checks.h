#pragma once

// Constraints between the feature flags of config_features.h. Every flag is
// 0 or 1. Include after config_features.h.
//
// This file is identical in DeviceIOT and DeviceIOT8266 (tools/check_shared_files.sh).

#if !ENABLE_TLS_SSL
#error "MqttBroker1885.js only accepts MQTT over TLS: enable ENABLE_TLS_SSL."
#endif

#if !ENABLE_MTLS && !ENABLE_MQTT_USER_AUTH
#error "Without mTLS the broker authenticates with username/password: enable ENABLE_MQTT_USER_AUTH."
#endif

#if SUPPORT_RTOS != 0 && SUPPORT_RTOS != 1
#error "SUPPORT_RTOS must be 0 or 1."
#endif

#if ENABLE_ANTI_CLONE && !ENABLE_MTLS
#error "ENABLE_ANTI_CLONE needs ENABLE_MTLS: the broker ties the session ticket to the client certificate."
#endif

#if ENABLE_ANTI_CLONE && !defined(ESP32)
#error "ENABLE_ANTI_CLONE stores its session ticket in NVS: ESP32 (DeviceIOT) only."
#endif

#if ENABLE_ANTI_CLONE && (!defined(ANTI_CLONE_MAX_TICKET_WRITES_PER_DAY) || ANTI_CLONE_MAX_TICKET_WRITES_PER_DAY < 1 || ANTI_CLONE_MAX_TICKET_WRITES_PER_DAY > 255)
#error "ANTI_CLONE_MAX_TICKET_WRITES_PER_DAY must be 1-255 (flash wear guard of the anti-clone ticket)."
#endif
