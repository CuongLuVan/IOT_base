#include <stdint.h>

#include "driver/adc.h"
#include "esp_err.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#define ADC_SAMPLE_INTERVAL_MS 1000
#define ADC_TASK_STACK_SIZE    1024
#define ADC_TASK_PRIORITY      5

static const char *TAG = "device_adc";
static TaskHandle_t TaskADC = NULL;

static esp_err_t adc_setup(void)
{
    adc_config_t adc_config = {
        .mode = ADC_READ_TOUT_MODE,
        .clk_div = 8,
    };

    const esp_err_t result = adc_init(&adc_config);
    if (result != ESP_OK) {
        ESP_LOGE(TAG, "ADC initialization failed: %s", esp_err_to_name(result));
        return result;
    }

    ESP_LOGI(TAG, "ADC initialized for TOUT/A0");
    return ESP_OK;
}

static void adc_task(void *parameter)
{
    (void)parameter;

    for (;;) {
        uint16_t sample = 0;
        const esp_err_t result = adc_read(&sample);
        if (result == ESP_OK) {
            ESP_LOGI(TAG, "A0 raw sample: %u", (unsigned int)sample);
        } else {
            ESP_LOGE(TAG, "ADC read failed: %s", esp_err_to_name(result));
        }

        vTaskDelay(pdMS_TO_TICKS(ADC_SAMPLE_INTERVAL_MS));
    }
}

void app_main(void)
{
    ESP_LOGI(TAG, "start DeviceIOT8266::app_main");

    if (adc_setup() != ESP_OK) {
        return;
    }

    const BaseType_t task_created = xTaskCreate(
        adc_task,
        "TaskADC",
        ADC_TASK_STACK_SIZE,
        NULL,
        ADC_TASK_PRIORITY,
        &TaskADC);
    if (task_created != pdPASS) {
        ESP_LOGE(TAG, "Failed to create TaskADC");
        return;
    }

    ESP_LOGI(TAG, "TaskADC started");
    ESP_LOGI(TAG, "end DeviceIOT8266::app_main");
}
