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
