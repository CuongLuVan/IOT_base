#pragma once

#include <stddef.h>
#include <string>

#include "define_All.h"

// MQTT link to the broker over TLS / mTLS. All state is internal to the module;
// call every method from the network task (TaskNetwork).
class NetworkMqtt {
public:
    // Loads the stored MQTT settings and TLS / message-auth credentials. Safe
    // to call again after /setup stored new ones. connect() refuses to run
    // until every step succeeded.
    void begin();
    // One connect + subscribe attempt; true when connected and subscribed.
    bool connect();
    void disconnect();
    bool isConnected();
    // Encrypts (Ascon), adds replay metadata and signs as configured, then
    // publishes non-retained. Logs the reason and returns false on failure.
    bool publish(const std::string& payload);
    // Services the client; incoming commands are dispatched from here.
    void loop();
};

#if ENABLE_COMMAND_PASSWORD
// true when received equals the device password (constant time).
bool commandPasswordMatches(const char* received);
#endif

#if ENABLE_LAN_CONTROL
// LAN control (POST LAN_CONTROL_PATH): runs json exactly like an MQTT
// message on the subscribe topic and returns, as a JSON array, the replies
// the device would have published. "[]" = rejected or unknown command.
// Call from the task that services MQTT (TaskNetwork).
std::string handleLanCommand(const char* json, size_t length);
#endif

#if ENABLE_ASCON_AEAD128
// Encrypts with the current MQTT session key for the HTTP API.
// Fails closed until the first key exists.
std::string getAsconEncryptedPayload(const std::string& payload);
#endif
