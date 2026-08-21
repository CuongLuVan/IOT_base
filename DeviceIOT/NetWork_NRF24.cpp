#include "NetWork_NRF24.h"

#include <SPI.h>
#include <RF24.h>
#include <ArduinoJson.h>

namespace {
const byte RADIO_ADDRESS[6] = "PK001";
RF24 radio(NRF24_CE_PIN, NRF24_CSN_PIN);
}

bool NetWork_NRF24::begin() {
    SPI.begin(NRF24_SCK_PIN, NRF24_MISO_PIN, NRF24_MOSI_PIN, NRF24_CSN_PIN);
    if (!radio.begin()) {
        return false;
    }

    radio.setPALevel(RF24_PA_LOW);
    radio.setDataRate(RF24_250KBPS);
    radio.setChannel(NRF24_CHANNEL);
    radio.setAutoAck(true);
    radio.enableDynamicPayloads();
    radio.openReadingPipe(1, RADIO_ADDRESS);
    radio.startListening();
    initialized = true;
    return true;
}

bool NetWork_NRF24::receiveClientState(uint16_t& clientId, uint8_t& state) {
    if (!initialized || !radio.available()) {
        return false;
    }

    const uint8_t payloadSize = radio.getDynamicPayloadSize();
    if (payloadSize == 0 || payloadSize > 32) {
        radio.flush_rx();
        return false;
    }

    char payload[33] = {};
    radio.read(payload, payloadSize);
    payload[payloadSize] = '\0';

    StaticJsonDocument<96> document;
    if (deserializeJson(document, payload)) {
        return false;
    }

    const uint16_t receivedId = document["id"] | 0;
    const int receivedState = document["state"] | -1;
    // All non-zero client IDs can share this pipe; the event queue keeps them separate.
    if (receivedId == 0 || (receivedState != 0 && receivedState != 1)) {
        return false;
    }

    clientId = receivedId;
    state = static_cast<uint8_t>(receivedState);
    return true;
}
