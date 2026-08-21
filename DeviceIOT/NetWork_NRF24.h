#ifndef NETWORK_NRF24_H
#define NETWORK_NRF24_H

#include <Arduino.h>
#include "define_All.h"

class NetWork_NRF24 {
public:
    // Initializes the master receive pipe. RF24 hardware Auto-ACK is enabled.
    bool begin();

    // Reads one client event. Returns true only for a valid parking-state packet.
    bool receiveClientState(uint16_t& clientId, uint8_t& state);

private:
    bool initialized = false;
};

#endif // NETWORK_NRF24_H
