/*
  Arduino Nano - parking sensor slave

  Libraries needed (install from Arduino Library Manager):
    - RF24 by TMRh20
    - VL53L0X by Pololu

  Connections (Arduino Nano):
    nRF24L01      VL53L0X
    ----------    -------
    VCC -> 3.3 V   VIN -> 5 V (or 3.3 V depending on breakout board)
    GND -> GND     GND -> GND
    CE  -> D9      SDA -> A4
    CSN -> D10     SCL -> A5
    SCK -> D13
    MOSI-> D11
    MISO-> D12

  Put a 10-47 uF capacitor directly across the nRF24L01 VCC/GND pins.
  Change SENSOR_ID and RADIO_ADDRESS so they match the Master configuration.
*/

#include <SPI.h>
#include <Wire.h>
#include <RF24.h>
#include <VL53L0X.h>

// ---- Settings to change for each parking position ------------------------
const uint16_t SENSOR_ID = 1001;          // becomes "id" in the JSON message
const uint16_t VEHICLE_DISTANCE_MM = 800; // a car is present at/below this distance
const uint16_t HYSTERESIS_MM = 100;       // prevents toggling around threshold
// This address must be exactly the Master's *reading* pipe address.
const byte RADIO_ADDRESS[6] = "PK001";

const byte NRF_CE_PIN = 9;
const byte NRF_CSN_PIN = 10;
const uint8_t STABLE_SAMPLES = 3; // consecutive readings required for a change
const uint8_t APP_SEND_RETRIES = 5;
const uint16_t APP_RETRY_DELAY_MS = 100;
const uint16_t MEASURE_PERIOD_MS = 100;

RF24 radio(NRF_CE_PIN, NRF_CSN_PIN);
VL53L0X distanceSensor;

// Requested protocol: 0 = vehicle present, 1 = vehicle has left.
uint8_t currentState = 1;
uint8_t candidateState = 1;
uint8_t candidateSamples = 0;
unsigned long lastMeasureMs = 0;

// Returns true only when the Master nRF24L01 returned a hardware ACK.
bool sendStateWithConfirmation(uint8_t state) {
  char message[32];
  const int size = snprintf(message, sizeof(message),
                            "{\"id\":%u,\"state\":%u}", SENSOR_ID, state);
  if (size < 0 || size >= (int)sizeof(message)) {
    return false;
  }

  for (uint8_t attempt = 0; attempt < APP_SEND_RETRIES; ++attempt) {
    // RF24 auto-ack is enabled. write() == true means Master acknowledged it.
    if (radio.write(message, (uint8_t)(size + 1))) {
      return true;
    }
    delay(APP_RETRY_DELAY_MS);
  }
  return false;
}

void setup() {
  Serial.begin(115200);
  Wire.begin();

  distanceSensor.setTimeout(200);
  if (!distanceSensor.init()) {
    Serial.println(F("VL53L0X not found"));
    while (true) { delay(1000); }
  }
  distanceSensor.startContinuous(100);

  if (!radio.begin()) {
    Serial.println(F("nRF24L01 not found"));
    while (true) { delay(1000); }
  }
  radio.setPALevel(RF24_PA_LOW); // use HIGH only with a stable external 3.3 V supply
  radio.setDataRate(RF24_250KBPS); // better range/reliability
  radio.setChannel(76);            // must match Master
  radio.setRetries(15, 15);        // nRF24 retries before write() reports failure
  radio.setAutoAck(true);
  radio.enableDynamicPayloads();
  radio.openWritingPipe(RADIO_ADDRESS);
  radio.stopListening();

  // Start in "empty" state. The Master is notified only on a stable change.
  Serial.println(F("Parking slave ready"));
}

void loop() {
  if (millis() - lastMeasureMs < MEASURE_PERIOD_MS) return;
  lastMeasureMs = millis();

  const uint16_t distanceMm = distanceSensor.readRangeContinuousMillimeters();
  if (distanceSensor.timeoutOccurred()) {
    Serial.println(F("VL53L0X timeout"));
    return; // do not generate an incorrect departure event on a failed reading
  }

  // Schmitt trigger: different limits when arriving/leaving.
  uint8_t measuredState = currentState;
  if (currentState == 1 && distanceMm <= VEHICLE_DISTANCE_MM) {
    measuredState = 0;
  } else if (currentState == 0 && distanceMm > VEHICLE_DISTANCE_MM + HYSTERESIS_MM) {
    measuredState = 1;
  }

  if (measuredState == currentState) {
    candidateSamples = 0;
    return;
  }

  if (measuredState != candidateState) {
    candidateState = measuredState;
    candidateSamples = 1;
  } else if (candidateSamples < STABLE_SAMPLES) {
    ++candidateSamples;
  }

  if (candidateSamples < STABLE_SAMPLES) return;

  // Do not commit locally until the Master has acknowledged the message.
  if (sendStateWithConfirmation(candidateState)) {
    currentState = candidateState;
    candidateSamples = 0;
    Serial.print(F("Confirmed: "));
    Serial.println(currentState == 0 ? F("vehicle present") : F("vehicle left"));
  } else {
    // Keep currentState unchanged; next measurement will attempt delivery again.
    candidateSamples = STABLE_SAMPLES;
    Serial.println(F("Master ACK not received; will retry"));
  }
}
