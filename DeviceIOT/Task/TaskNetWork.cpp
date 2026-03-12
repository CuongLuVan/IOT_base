#include "TaskNetWork.h"



void TaskNetWork::setup(void){
    Serial.begin(115200);
    // Set WiFi to station mode and disconnect from an AP if it was previously connected
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    Serial.println("Setup done");
}

void TaskNetWork::taskRun(void) {
    Serial.print("Task2 is running on core ");
    Serial.println(xPortGetCoreID());  

    for(;;)
    { 
        digitalWrite(led_2, HIGH); 
        vTaskDelay(1000);
        digitalWrite(led_2, LOW);
        vTaskDelay(1000);
    }
}