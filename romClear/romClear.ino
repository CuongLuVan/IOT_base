#include <EEPROM.h>

#define EEPROM_SIZE 2048

void setup() {
  Serial.begin(115200);

  EEPROM.begin(EEPROM_SIZE);

  for (int i = 0; i < EEPROM_SIZE; i++) {
    EEPROM.write(i, 0xFF);
  }

  EEPROM.commit();

  Serial.println("EEPROM erased");
}

void loop() {
}