#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <avr/power.h>
#include <avr/sleep.h>
#include <avr/wdt.h>
#include <avr/interrupt.h>

// ---------- Hardware configuration ----------
#define DEVICE_ID 1234UL

const uint8_t PRESSURE_PIN = A0;
const uint8_t SUPPLY_MONITOR_PIN = A1;
const uint8_t SENSOR_POWER_PIN = 7;
const uint8_t LORA_POWER_PIN = 8;

// SX127x wiring for Arduino Uno / ATmega328P.
const uint8_t LORA_SS_PIN = 10;
const uint8_t LORA_RESET_PIN = 9;
const uint8_t LORA_DIO0_PIN = 2;
const long LORA_FREQUENCY = 433E6; // Change to 868E6 or 915E6 where required.

// Supply monitor divider: source -> R_TOP -> A1 -> R_BOTTOM -> GND.
const float R_TOP_OHM = 100000.0f;
const float R_BOTTOM_OHM = 100000.0f;
const float SUPPLY_THRESHOLD_V = 3.30f;
const float ADC_REFERENCE_V = 5.00f; // Calibrate to the actual ATmega328P VCC.

// Change these if the pressure transmitter has another output range.
const float SENSOR_OUTPUT_MIN_V = 0.50f;
const float SENSOR_OUTPUT_MAX_V = 4.50f;
const float PRESSURE_MAX_MPA = 1.20f;

const unsigned long REPORT_INTERVAL_MS = 60000UL;
const unsigned long SENSOR_SETTLE_MS = 100UL;
const uint8_t REPORT_SLEEP_CYCLES = (REPORT_INTERVAL_MS + 7999UL) / 8000UL;

volatile bool watchdogWake = false;

ISR(WDT_vect) {
  watchdogWake = true;
}

float readSupplyVoltage() {
  const uint16_t adcValue = analogRead(SUPPLY_MONITOR_PIN);
  const float pinVoltage = adcValue * ADC_REFERENCE_V / 1023.0f;
  return pinVoltage * (R_TOP_OHM + R_BOTTOM_OHM) / R_BOTTOM_OHM;
}

float readPressureMpa() {
  const uint16_t adcValue = analogRead(PRESSURE_PIN);
  const float sensorVoltage = adcValue * ADC_REFERENCE_V / 1023.0f;
  float pressure = (sensorVoltage - SENSOR_OUTPUT_MIN_V) * PRESSURE_MAX_MPA /
                   (SENSOR_OUTPUT_MAX_V - SENSOR_OUTPUT_MIN_V);
  if (pressure < 0.0f) {
    pressure = 0.0f;
  }
  if (pressure > PRESSURE_MAX_MPA) {
    pressure = PRESSURE_MAX_MPA;
  }
  return pressure;
}

void powerDevicesOn() {
  digitalWrite(SENSOR_POWER_PIN, HIGH);
  digitalWrite(LORA_POWER_PIN, HIGH);
  delay(SENSOR_SETTLE_MS);
}

void powerDevicesOff() {
  LoRa.sleep();
  digitalWrite(LORA_POWER_PIN, LOW);
  digitalWrite(SENSOR_POWER_PIN, LOW);
}

void configureWatchdog8Seconds() {
  MCUSR &= ~(1 << WDRF);
  WDTCSR = (1 << WDCE) | (1 << WDE);
  WDTCSR = (1 << WDIE) | (1 << WDP3) | (1 << WDP0); // 8 seconds
}

void sleep8Seconds() {
  watchdogWake = false;
  set_sleep_mode(SLEEP_MODE_PWR_DOWN);
  noInterrupts();
  sleep_enable();
  interrupts();
  sleep_cpu();
  sleep_disable();
}

void sleepOneLowPowerPeriod() {
  powerDevicesOff();
  ADCSRA &= ~(1 << ADEN);
  power_all_disable();

  configureWatchdog8Seconds();
  sleep8Seconds();

  wdt_disable();
  power_all_enable();
  ADCSRA |= (1 << ADEN);
}

void sleepUntilNextReport() {
  for (uint8_t cycle = 0; cycle < REPORT_SLEEP_CYCLES; ++cycle) {
    sleepOneLowPowerPeriod();
  }
}

bool startLoRa() {
  LoRa.setPins(LORA_SS_PIN, LORA_RESET_PIN, LORA_DIO0_PIN);
  if (!LoRa.begin(LORA_FREQUENCY)) {
    return false;
  }
  LoRa.sleep();
  return true;
}

void sendPressureReport(float pressureMpa) {
  // JSON keys must be quoted to be valid JSON.
  LoRa.beginPacket();
  LoRa.print(F("{\"id\":"));
  LoRa.print(DEVICE_ID);
  LoRa.print(F(",\"val\":"));
  LoRa.print(pressureMpa, 3);
  LoRa.print(F("}"));
  LoRa.endPacket();
  LoRa.sleep();
}

void setup() {
  pinMode(SENSOR_POWER_PIN, OUTPUT);
  pinMode(LORA_POWER_PIN, OUTPUT);
  digitalWrite(SENSOR_POWER_PIN, LOW);
  digitalWrite(LORA_POWER_PIN, LOW);

  pinMode(PRESSURE_PIN, INPUT);
  pinMode(SUPPLY_MONITOR_PIN, INPUT);
  Serial.begin(9600);
}

void loop() {
  const float supplyVoltage = readSupplyVoltage();

  if (supplyVoltage <= SUPPLY_THRESHOLD_V) {
    sleepOneLowPowerPeriod();
    return;
  }

  powerDevicesOn();
  if (startLoRa()) {
    sendPressureReport(readPressureMpa());
  }

  sleepUntilNextReport();
}
