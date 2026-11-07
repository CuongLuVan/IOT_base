# Báo cáo kiểm tra lỗi RTOS – DeviceIOT (ESP32) và DeviceIOT8266

Phạm vi: toàn bộ source sau đợt refactor theo `report/firmware_code_review.csv`, kiểm tra theo `checkRTOS.txt`.
Chỉ đọc code, đối chiếu với source core thật (Arduino-ESP32 3.2.1 / IDF 5.4, ESP8266 core 3.1.2, esp8266RTOS 1.1.0) và thư viện (PubSubClient, ArduinoJson 7.0.3, LoRa). Chưa chạy trên phần cứng: các mục ghi "Rủi ro" cần kiểm thử thêm.

## Tổng hợp

| Phần | CRITICAL | HIGH | MEDIUM | LOW |
|---|---|---|---|---|
| A. Task / Automation / System | 1 | 2 | 8 | 11 |
| B. Network / MQTT / Wi-Fi / HTTP | 1 | 5 | 6 | 10 |
| **Tổng** | **2** | **7** | **14** | **21** |

Không phát hiện deadlock (mutex không lồng nhau, không có thứ tự khóa ngược), không có ISR/timer callback trong code ứng dụng, không tạo/xóa task động, callback sự kiện Wi-Fi chỉ ghi biến atomic, các lệnh gọi lwIP (ARP, DNS) đúng ngữ cảnh, không có use-after-free trong TLS credential.

### CRITICAL / HIGH

| # | Mục | Mức độ | Loại |
|---|---|---|---|
| A1 | `DeviceIOT/board_pins.h` DHT trên GPIO12 (chân strapping) – có thể không boot | CRITICAL | Rủi ro (xác suất cao) |
| B1 | `HttpServer.cpp` client HTTP chậm làm TaskNetwork quay ~10 s không nhường CPU → Task WDT reset ESP32; TaskDevice/SystemTask bị đói | CRITICAL | Xác nhận code |
| A2 | 8266 `SUPPORT_RTOS 1` không build được (core RTOS không có EEPROM, `analogRead`) | HIGH | Xác nhận |
| A3/B5 | 8266 NON-OS: MQTT connect chặn `loop()` 15–35 s → nút, auto-OFF, on-timer không chạy | HIGH | Xác nhận |
| B2 | PubSubClient chờ CONNACK busy-loop tới 5 s → TWDT | HIGH | Rủi ro |
| B3 | ESP32 `setTimeout` không giới hạn TCP connect (30 s) | HIGH | Xác nhận |
| B4 | 8266 RTOS: `setTimeout` là stub, không có handshake timeout (120 s) | HIGH | Xác nhận |
| B6 | 8266 RTOS: stack TaskNetwork 4096 B cho mbedTLS handshake | HIGH | Rủi ro |

## Kế hoạch khắc phục theo giai đoạn

- **Giai đoạn 1 – chống reset / treo (CRITICAL, HIGH):** ưu tiên task (TaskDevice > TaskNetwork), Task WDT đăng ký theo task, timeout TCP/TLS/CONNACK, client có `delay(1)` khi chờ, HTTP chặn client chậm, 8266 NON-OS chạy TaskDevice qua `schedule_recurrent_function_us` để không bị chặn bởi kết nối, stack 8266 RTOS, build 8266 RTOS (EEPROM trên NVS, ADC), cảnh báo chân DHT strapping.
- **Giai đoạn 2 – ổn định (MEDIUM):** heartbeat phát hiện task treo + restart, giảm ghi flash EEPROM, hàng đợi UDP, giới hạn kích thước HTTP body trước khi đọc, telemetry vượt 1024 B, restart có khóa EEPROM, timeout LoRa, tick 8266 RTOS.
- **Giai đoạn 3 – tối ưu (LOW):** phần còn lại.

Chi tiết từng phần ở dưới (bảng đầy đủ, ví dụ code, file cần sửa).

---

# Phần A

Phạm vi: `*.ino`, `Sync.h`, `TaskDevice.*`, `TaskSensor.*`, `SystemTask.*`, `Automation.*`, `ScheduleEngine.*`, `ScheduleCore.h`, `Countdown.*`, `OnTimer.*`, `ThresholdControl.*`, `PortArbiter.h`, `ButtonInput.h`, `Memory.*`, `HighSpeedSampler.*`, `HighSpeedUdpSender.*`, `CaptureTypes.h`, `PlatformCompat.h`, `Clock.h`, `DebugInfo.h`, `timing.h`, `board_pins.h`.
Các file giống hệt nhau ở 2 thư mục được phân tích cho cả 3 runtime: ESP32 (FreeRTOS SMP, 2 core), ESP8266 `SUPPORT_RTOS 0` (NON-OS, `loop()` cooperative, mặc định trong `config_features.h`), ESP8266 `SUPPORT_RTOS 1` (esp8266RTOSArduCore 1.1.0).

Đã đối chiếu API với mã nguồn core:
- ESP32 3.2.1 `sdkconfig`: `CONFIG_FREERTOS_HZ=1000`, `CONFIG_ESP_TASK_WDT_TIMEOUT_S=5` (panic), `CHECK_IDLE_TASK_CPU0=y`, **CPU1 không giám sát**, `CONFIG_ESP_INT_WDT_TIMEOUT_MS=300`, `CONFIG_ARDUINO_RUNNING_CORE=1`, `CONFIG_ARDUINO_EVENT_RUNNING_CORE=1` (task `arduino_events` ưu tiên 19), `CONFIG_LWIP_TCPIP_CORE_LOCKING=y` + `CHECK_THREAD_SAFETY=y` (`configTime()` tự `LOCK_TCPIP_CORE` nên gọi từ SystemTask an toàn).
- ESP32 `EEPROM.commit()` = `nvs_set_blob(_handle, _name, _data, _size)` cho **toàn bộ 3071 byte** mỗi lần (libraries/EEPROM/src/EEPROM.cpp).
- ESP32 `delay(ms)` = `vTaskDelay(ms / portTICK_PERIOD_MS)`; `noInterrupts()` = `portDISABLE_INTERRUPTS()` (Arduino.h:86-89).
- ESP8266 3.1.2 `EEPROM.commit()` = `flashEraseSector` + `flashWrite` 1 sector 4 KB.
- esp8266RTOS 1.1.0: `StackType_t = uint8_t` (stack tính theo **byte**), `CONFIG_FREERTOS_HZ=100` (tools/idfTemplate/sdkconfig), `CONFIG_TASK_WDT_TIMEOUT_S=15`, `delay(ms) = vTaskDelay(ms/10)`; **không có thư viện EEPROM và không có `analogRead()`** cho variant generic.
- Adafruit DHT: `read()` gọi `delay(1)`, `delay(20)` rồi `InterruptLock` (tắt ngắt) khi đọc 40 bit.

---

## 1. Sơ đồ Task / Lock / Queue

### 1.1 Task

| Runtime | Task | Stack | Prio | Core | Chu kỳ | Gọi gì |
|---|---|---|---|---|---|---|
| ESP32 | `loopTask` (Arduino) | 8192 B | 1 | 1 | `vTaskDelay(1000 ms)` | `setup()` rồi chỉ ngủ |
| ESP32 | `TaskDevice` | 10000 B | **1** | 0 | `delay(25)` | nút, 2 queue lệnh, Threshold/Countdown/OnTimer, `PortArbiter`, `digitalWrite` |
| ESP32 | `TaskSensor` | 10000 B | 3 | 1 | `delay(1)` (1 kHz); khi capture: busy-loop, `delay(1)` mỗi 1 s | PMS UART2, DHT, `ThresholdControl::evaluate`, `HighSpeedSampler` (SPI/ADC) |
| ESP32 | `TaskNetwork` | 10000 B | **2** | 0 | `vTaskDelay(1 tick)` | Wi-Fi, HTTP, MQTT/TLS, UDP drain, LoRa, lệnh -> mọi module |
| ESP32 | `SystemTask` | 4096 B | 1 | 0 | poll 100 ms, chu kỳ 5 s | SNTP, `ScheduleEngine::process`, `flushSettings` (**EEPROM/NVS commit**), snapshot |
| ESP32 hệ thống | `arduino_events` 19 / core 1; wifi, lwIP, esp_timer, ipc ưu tiên cao / core 0; IDLE0 (TWDT 5 s), IDLE1 (không TWDT) | | | | | |
| 8266 RTOS | Device / Sensor / Network / System | 2048 / 2048 / 4096 / 2048 B | 1 / 2 / 2 / 1 | – | tick 10 ms | như trên; `loopTask` 4096 B prio 1 `vTaskDelay(5 tick)` |
| 8266 NON-OS | `loop()` | CONT 4 KB | – | – | `delay(2)` | `TaskDevice::service` → `TaskSensor` → `TaskNetwork` → `SystemTask` tuần tự |

Không có ISR, `attachInterrupt`, hardware timer, `Ticker` hay `esp_timer` callback nào trong ứng dụng. Các đoạn tắt ngắt: `portENTER_CRITICAL` (Sync.h, vài lệnh gán) và DHT `InterruptLock` (~4–5 ms, tối đa ~80 ms khi lỗi đường truyền).

### 1.2 Lock

| Lock | Kiểu | Ai lấy | Timeout | Đang giữ thì làm gì | Lồng nhau |
|---|---|---|---|---|---|
| `eepromMutex` (Memory.cpp:10) | FreeRTOS mutex (PI) | setup, SystemTask (flush), TaskNetwork (đọc settings/cert/creds, `writeByte` mode, SetupPortal `writeStrings`) | forever | `EEPROM.commit()` = NVS write (ESP32) / erase+write sector (8266), log Serial | không |
| `entriesMutex` (ScheduleEngine.cpp:16) | mutex | TaskNetwork (add/update/remove/setEnabled/clear/addSettings/listJson), SystemTask (process/flush/activeCount) | forever | copy mảng 20 Entry, **log Serial** (add/update/...) | không – được nhả trước `writeBytes` |
| `timerMutex` (Countdown.cpp:16) | mutex | TaskNetwork (start/cancel/remaining/mask), TaskDevice (takeExpired) | forever | vài phép gán | không |
| `stateMutex` (ThresholdControl.cpp:24) | mutex | TaskNetwork (set), TaskSensor (evaluate), TaskDevice (takeActions) | forever | vài phép gán | không |
| `snapshotMutex` (SystemTask.cpp) | mutex | SystemTask (ghi), TaskNetwork (`telemetryJson`) | 10 ms | copy struct | không |
| `CriticalSection` (Sync.h:38) | 1 spinlock toàn cục (ESP32) / `taskENTER_CRITICAL` (8266 RTOS) / no-op (NON-OS) | TaskDevice publish/copyStatus, TaskSensor publish/copyLatest, `AtomicU32`, `DirtyFlag` | – | copy struct ≤ 48 B | không |
| `std::atomic<bool>` | lock-free | HighSpeedSampler `samplingActive`, `stopRequested` | – | – | – |

Thứ tự lock: không có chỗ nào giữ 2 mutex cùng lúc → **không có deadlock**. Priority inversion được giới hạn nhờ priority inheritance của mutex FreeRTOS.

### 1.3 Queue

| Queue | Dài × kích thước | Producer (timeout) | Consumer | Khi đầy |
|---|---|---|---|---|
| TaskDevice `commandQueue` | 10 × 8 B | TaskNetwork MQTT/LAN/HTTP, 50 ms | TaskDevice, non-block, ≤10/chu kỳ | trả `NotReady` |
| ScheduleEngine `commandQueue` | 10 × 8 B | SystemTask, 0 ms, all-or-none | TaskDevice, ≤10/chu kỳ | thử lại phút đó ở chu kỳ sau |
| HS `controlQueue` | 1 × CaptureCommand | TaskNetwork, 0 ms (`xQueueSend`, không dùng `xQueueOverwrite`) | TaskSensor | trả lỗi start |
| HS `packetQueue` | 24 × ~290 B (~7 KB heap) | TaskSensor, 0 ms | TaskNetwork, 8 gói/vòng | bỏ gói, cộng `dropped` |

`Queue::overwrite()` có `static_assert(Capacity == 1)` → đúng quy tắc `xQueueOverwrite` chỉ cho queue dài 1.

---

## 2. Bảng lỗi

| STT | File / Hàm | Vị trí lỗi (file:line) | Mô tả lỗi | Mức độ | Xác nhận/Rủi ro | Đề xuất |
|---|---|---|---|---|---|---|
| 1 | DeviceIOT/board_pins.h – `DHT_PIN` | DeviceIOT/board_pins.h:28 | DHT11 nối **GPIO12 (MTDI, chân strapping chọn điện áp flash)**. Module DHT luôn có điện trở kéo lên (10 kΩ) trên DATA → lúc reset GPIO12 = HIGH → VDD_SDIO = 1,8 V → flash 3,3 V của WROOM-32 không đọc được → **không boot / boot-loop** (hoặc brownout ngẫu nhiên khi reset nóng). | CRITICAL | Rủi ro phần cứng, xác suất rất cao (gần như chắc chắn khi có pull-up) | Chuyển DHT sang GPIO không strapping (vd 32 hoặc 4) và thêm kiểm tra lúc biên dịch; hoặc burn eFuse `set_flash_voltage 3.3V` (không đảo ngược được). |
| 2 | Memory.cpp (`#include <EEPROM.h>`, `EEPROM.length()`); DeviceIOT8266/TaskSensor.cpp `sampleAdc` | DeviceIOT8266/Memory.cpp:3, 45; DeviceIOT8266/TaskSensor.cpp:28 | Với `SUPPORT_RTOS 1`, core esp8266RTOS 1.1.0 đã cài **không có thư viện EEPROM** (thư mục `libraries/` chỉ có DNSServer, ESP8266RTOS, ESPmDNS, FS, HTTPClient, WebServer, WiFi, WiFiClientSecure, WiFiProv, WrapperFreeRTOS) và **không định nghĩa `analogRead()`** cho variant generic → bản RTOS của 8266 **không biên dịch/link được**; toàn bộ đường RTOS 8266 chưa từng chạy thật. | HIGH | Xác nhận (theo mã nguồn core) | Thêm backend EEPROM cho 8266 RTOS dựa trên `nvs_flash` của ESP8266_RTOS_SDK (cùng API với lớp EEPROM ESP32) và đọc A0 bằng `adc_read()` (`driver/adc.h`, như `main/main.c`). Hoặc ghi rõ bản RTOS chưa hỗ trợ và `#error`. |
| 3 | DeviceIOT8266.ino `loop()` (NON-OS) – liên module với TaskNetwork/MqttTransport | DeviceIOT8266/DeviceIOT8266.ino:79-83; DeviceIOT8266/MqttTransport.cpp:297-299; timing.h:78-79 | Bản mặc định (NON-OS) chạy 4 module tuần tự trong `loop()`. `PubSubClient::connect()` chặn: TCP connect + bắt tay TLS (timeout 10 s) + chờ CONNACK (5 s). Trong thời gian đó **`TaskDevice::service()` không chạy** → nút bấm, lệnh, **auto-OFF lịch, on-timer, countdown, ngưỡng** bị trễ tới ~15–20 s mỗi lần thử (lặp lại theo backoff khi broker lỗi). Với ngõ ra là **bơm**, on-timer/auto-OFF là chức năng an toàn. | HIGH | Rủi ro (cần đo trên phần cứng; broker không tới được là tình huống thường gặp) | Chạy `TaskDevice::service` bằng `schedule_recurrent_function_us()` (core 8266 gọi hàm này ở mọi `yield()/delay()`, kể cả bên trong connect/TLS); giảm `MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS`/`MQTT_SOCKET_TIMEOUT_SECONDS` cho 8266. |
| 4 | DeviceIOT.ino `setup()` + timing.h | DeviceIOT/DeviceIOT.ino:60-67; DeviceIOT/timing.h:16-19, 133 | Trên core 0: `TaskNetwork` prio 2 (chu kỳ 1 tick) **cao hơn** `TaskDevice` và `SystemTask` prio 1. Mỗi lần TaskNetwork dùng CPU liên tục (bắt tay TLS ECDHE/ECDSA vài trăm ms, parse JSON, phục vụ HTTP, gửi 8 gói UDP/ms khi capture) thì điều khiển ngõ ra, debounce nút, áp lệnh lịch/ngưỡng bị đói CPU. Task điều khiển (deadline 25 ms) nên ưu tiên cao hơn task mạng. | MEDIUM | Rủi ro | `TASK_DEVICE_PRIORITY 3` (TaskDevice gần như luôn ngủ nên không gây đói), giữ `TASK_NETWORK_PRIORITY 2`; cân nhắc `NETWORK_TASK_PERIOD_MS` > 1 khi không capture. |
| 5 | SystemTask (giám sát), .ino | DeviceIOT/SystemTask.cpp:99-127, 145-171; DeviceIOT/DeviceIOT.ino:24-39 | Không có cơ chế phát hiện task treo: các task ứng dụng không đăng ký TWDT (`esp_task_wdt_add`), IDLE1 không bị giám sát (`CHECK_IDLE_TASK_CPU1` tắt), SystemTask chỉ báo `eTaskGetState` (một task chờ mutex mãi mãi vẫn là "blocked" như bình thường). Mọi `ScopedLock` dùng timeout vô hạn. Không có phục hồi (restart task / reset). | MEDIUM | Xác nhận (thiếu cơ chế) | Thêm bộ đếm heartbeat `AtomicU32` cho mỗi task; SystemTask kiểm tra mỗi 5 s, quá N chu kỳ không tăng → log + `ESP.restart()`. Hoặc `esp_task_wdt_add(nullptr)` + `esp_task_wdt_reset()` trong vòng lặp từng task (ESP32). |
| 6 | Memory::commit (ESP32), Automation::flushSettings | DeviceIOT/Memory.cpp:69-74; DeviceIOT/ScheduleEngine.cpp:410; Countdown.cpp:89; OnTimer.cpp:55; ThresholdControl.cpp:115 | Trên ESP32 mỗi thay đổi 4 byte (on-timer, countdown, ngưỡng) hay bảng lịch đều ghi lại **blob NVS 3071 byte** (~1 trang NVS) → (a) mỗi commit gần như 1 lần xoá sector (mòn flash, 20–100 ms), (b) trong lúc ghi flash cache bị tắt, **core 1 (TaskSensor/capture) bị dừng** → mất mẫu, (c) nếu phân vùng NVS (dùng chung với Wi-Fi) đầy, `nvs_set_blob` trả `ESP_ERR_NVS_NOT_ENOUGH_SPACE` → `flush()` đặt lại `dirty` và thử lại **mãi mãi mỗi 5 s**. | MEDIUM | Xác nhận (a,b theo mã nguồn); (c) rủi ro | Gộp/giới hạn tần suất commit (vd tối thiểu 30–60 s giữa 2 commit, trừ khi chỉ có dữ liệu cấu hình); hoãn commit khi `HighSpeedSampler::isSamplingActive()`; giới hạn số lần thử lại + log lỗi một lần. Lâu dài: lưu các giá trị nhỏ bằng `Preferences` key riêng. |
| 7 | HighSpeedSampler `serviceChannel`, `readAdsSample`; TaskSensor::taskRun | DeviceIOT/HighSpeedSampler.cpp:164-173, 288-300; DeviceIOT/TaskSensor.cpp:106-118; timing.h:141-143 | Lấy mẫu bằng polling `esp_timer_get_time()` trong busy-loop prio 3 trên core 1 tới 60 s. Mỗi mẫu ADS gồm `digitalWrite` + `delayMicroseconds(9)` + `beginTransaction` (lấy mutex SPI) + `transfer16` + `endTransaction` ≈ 13–16 µs > chu kỳ 10 µs của **100 kHz** → không đạt tần số danh định (chế độ ALL càng tệ hơn); jitter do `delay(1)` mỗi giây, flash commit ở core 0, ngắt Wi-Fi/arduino_events. Mất mẫu được đếm (`missed`) nhưng tần số cấu hình là không khả thi. | MEDIUM | Xác nhận (về thời gian thực thi), mức mất mẫu cần đo | Hạ `HS_ADS8866_SAMPLE_RATE_HZ` xuống mức đo được (vd 50 kHz), gọi `beginTransaction` 1 lần cho cả phiên (bus riêng, chỉ TaskSensor dùng), dùng `GPIO.out_w1ts` thay `digitalWrite`; lâu dài: SPI DMA/I2S + gptimer. |
| 8 | HighSpeedUdpSender::service, TaskNetwork (liên module) | DeviceIOT/HighSpeedUdpSender.cpp:91; DeviceIOT/HighSpeedSampler.cpp:14; DeviceIOT/TaskNetwork.cpp:269-270 | Hàng đợi gói chỉ 24 gói (~15 ms dữ liệu ADS 100 kHz, 64 mẫu/gói) và chỉ được xả trong vòng lặp TaskNetwork (8 gói/vòng). Mọi lần TaskNetwork bị chặn (`mqtt.loop()`/publish TLS chờ socket tới 5 s, HTTP client, DNS) → queue đầy → mất gói. Đã chặn MQTT connect khi capture nhưng chưa chặn các thao tác chặn khác. | MEDIUM | Rủi ro | Task gửi UDP riêng (core 0, prio 3) chờ `xQueueReceive(packetQueue, portMAX_DELAY)`; hoặc tăng `kPacketQueueDepth` và tạm dừng HTTP/MQTT publish khi capture. |
| 9 | timing.h (8266 RTOS) – stack | DeviceIOT8266/timing.h:12-14 | Với esp8266RTOS stack tính bằng byte: TaskDevice/TaskSensor/SystemTask 2048 B, TaskNetwork 4096 B. SystemTask: `runMinute` (~450 B locals) / `flush` (~430 B) + `printf` của newlib (~1–1,5 KB) + NVS/flash; TaskNetwork: mbedTLS bắt tay ECDSA cần ~5–6 KB stack + JSON/String. Nguy cơ tràn stack (configCHECK_FOR_STACK_OVERFLOW=2 sẽ panic). | MEDIUM | Rủi ro (đo `uxTaskGetStackHighWaterMark`) | 8266 RTOS: SystemTask 3072 B, TaskNetwork ≥ 8192 B (hoặc dùng BearSSL nhỏ hơn); thêm HWM vào telemetry bản 8266 như bản ESP32. |
| 10 | DHT (TaskSensor 8266, SUPPORT_RTOS 1), Sync.h | DHT.cpp (thư viện) `delay(1)`, `delay(20)`; DeviceIOT8266/TaskSensor.cpp:32-46; Sync.h:150, 228 | Tick 100 Hz: `delay(20)` = `vTaskDelay(2)` → xung start DHT chỉ **10–20 ms** (DHT11 cần ≥ 18 ms) → đọc lỗi ngẫu nhiên; `delay(1)` = `vTaskDelay(0)` (không chờ). `Mutex::lock()`/`Queue::push()` dùng `pdMS_TO_TICKS(timeoutMs)` không làm tròn lên → timeout < 10 ms thành 0 (khác `delayTicks()`). | MEDIUM | Xác nhận (theo `delay()` của core và HZ=100 trong idfTemplate) | Đặt `CONFIG_FREERTOS_HZ=1000` cho bản RTOS, hoặc tự sinh xung start bằng `delayMicroseconds(20000)` trong vùng có `vTaskSuspendAll`; trong Sync.h làm tròn lên: `(timeoutMs + portTICK_PERIOD_MS - 1) / portTICK_PERIOD_MS`. |
| 11 | .ino `createTask` / `setup()` | DeviceIOT/DeviceIOT.ino:33-37, 68-70 | Tạo task thất bại chỉ log rồi chạy tiếp với hệ thống thiếu task (vd thiếu TaskDevice: lệnh vẫn được nhận, xếp hàng và trả OK nhưng không bao giờ được áp). `TASK_CREATE_DELAY_MS 500` làm các task khởi động lệch nhau ~2 s. | MEDIUM | Xác nhận (logic) | Nếu `!started` → `delay(1000); ESP.restart();`; giảm `TASK_CREATE_DELAY_MS` (không cần vì mọi module đã `setup()` trước). |
| 12 | ScheduleCore `shouldRun` / `catchUpWindow` | DeviceIOT/ScheduleCore.h:261, 301 | `day` (lần chạy cuối của lịch tuần) và `kFlagDone` (ONCE) chỉ lưu RAM. Reboot trong **cùng phút** vừa chạy → lần đánh giá đầu tiên lấy `nowMinute-1` → phút hiện tại được chạy **lần 2**. | LOW | Xác nhận (logic) | Lần đầu sau boot bắt đầu từ `nowMinute` nếu `millis()` < 60 s, hoặc lưu "phút chạy cuối" trong RTC memory (`RTC_NOINIT_ATTR`). |
| 13 | ThresholdControl::set / evaluate | DeviceIOT/ThresholdControl.cpp:61-64, 79 | `edges.reset()` nằm trong `stateMutex` nhưng `ruleValues.exchange()` ở ngoài; `evaluate()` (TaskSensor, core 1) đọc rule ngoài lock → có thể cập nhật `met_` theo rule cũ sau khi reset → bỏ lỡ cạnh lên đầu tiên của rule mới. | LOW | Xác nhận (race, cửa sổ hẹp) | Ghi `ruleValues` trong cùng `ScopedLock` với `edges.reset()`, và trong `evaluate()` đọc rule bên trong lock. |
| 14 | ScheduleEngine add/update/remove/setEnabled/clear; Memory::writeStrings | DeviceIOT/ScheduleEngine.cpp:297, 321 (logEntry trong lock); DeviceIOT/Memory.cpp:153 | Gọi `Serial.printf` khi đang giữ mutex. Serial ESP32 (tx buffer 0) chặn ~9 ms/100 byte → kéo dài thời gian giữ `entriesMutex`/`eepromMutex`. | LOW | Xác nhận | Lưu thông tin cần log, nhả lock rồi mới log (như `expireMissedOnce` đã làm). |
| 15 | DHT `read()` (TaskSensor cả 2 firmware) | DeviceIOT/TaskSensor.cpp:38-52; DeviceIOT8266/TaskSensor.cpp:32-46 | DHT tắt ngắt ~4–5 ms (tới ~80 ms nếu đường DATA nhiễu). ESP32: chỉ core 1, nhưng làm trễ IPC khi core 0 ghi flash; 8266 NON-OS: Wi-Fi bị trễ. Dưới INT WDT 300 ms. | LOW | Rủi ro nhỏ | Chấp nhận; nếu thấy Wi-Fi rớt trên 8266 thì giãn chu kỳ DHT hoặc dùng cảm biến I²C. |
| 16 | TaskSensor::service khi capture | DeviceIOT/TaskSensor.cpp:122-123 | Trong lúc capture (tới 60 s) không đọc PMS/DHT: RX buffer UART2 (256 B) tràn, `pmsValid` không bị đánh dấu cũ, ngưỡng không được đánh giá. | LOW | Xác nhận | Vẫn gọi `pollPms()` (rẻ) hoặc xả `PMS_SERIAL` và đánh dấu dữ liệu cũ khi capture kết thúc. |
| 17 | TaskSensor::taskRun (ESP32), TaskDevice/SystemTask taskRun | DeviceIOT/TaskSensor.cpp:113-116; TaskDevice.cpp:147; SystemTask.cpp:149; timing.h:27-29 | TaskSensor thức 1000 lần/s chỉ để poll UART (DHT 4 s/lần) → tốn CPU core 1; chú thích "staggered over SENSOR_READ_STEP_COUNT steps" không đúng với code. Các task dùng `delay()` thay `vTaskDelayUntil` (trôi chu kỳ, chấp nhận được). | LOW | Xác nhận | Khi không capture dùng `delay(20)`; sửa chú thích. |
| 18 | HighSpeedConfig / HighSpeedUdpPacket qua queue | DeviceIOT/HighSpeedSampler.h:28-38 | Struct chứa `IPAddress` (có vtable, không trivially-copyable) được copy bằng `xQueueSend` (memcpy). Hoạt động thực tế nhưng là UB về C++. | LOW | Xác nhận (UB, chưa gây lỗi) | Lưu IP dạng `uint32_t` trong struct truyền qua queue. |
| 19 | board_pins.h (ESP32) – chân tiềm ẩn | DeviceIOT/board_pins.h:8, 33, 42, 44, 60 | Khi bật `SUPPORT_LORA`: LoRa dùng VSPI mặc định (18/19/23) trùng `adsSPI(VSPI)` (TaskSensor core 1) và `OUTPUT_DEVICE_1_PIN 23` → 2 `SPIClass` trên cùng peripheral từ 2 task khác core; LORA_CS 5 / IRQ 2 là chân strapping. PMS 16/17 trùng PSRAM nếu dùng module WROVER. | LOW | Rủi ro tiềm ẩn (hiện `SUPPORT_LORA 0`) | Thêm `#error` khi `SUPPORT_LORA` cùng high-speed ADS; dùng chân/HSPI khác cho LoRa. |
| 20 | Automation::flushSettings (thiết kế) + tài liệu | DeviceIOT/SystemTask.cpp:168; DeviceIOT8266/docs/BUILD_MODES.md:83 | Lệnh trả "saved" nhưng ghi EEPROM sau ≤ 5 s → mất điện trong khoảng đó mất cấu hình. Tài liệu ghi `EEPROM_SIZE` 3055 B, code là 3071 B. | LOW | Xác nhận | Ghi rõ trong reply/tài liệu; sửa số trong tài liệu. |
| 21 | Memory::readByte / GetInstance | DeviceIOT/Memory.cpp:17-21, 76-80 | `readByte` trả 0 khi lỗi (không phân biệt với giá trị 0); `GetInstance()` khởi tạo lười không thread-safe (an toàn chỉ vì setup gọi trước khi tạo task). | LOW | Xác nhận | Giữ quy ước "gọi trong setup trước"; thêm `bool readByte(int, uint8_t&)` khi cần. |
| 22 | timing.h (ESP32) – stack SystemTask | DeviceIOT/timing.h:14 | 4096 B cho đường `flush()` → `nvs_set_blob` + `printf` newlib đầy đủ (~1,3 KB) + locals ~0,9 KB: còn dư ít. | LOW | Rủi ro (đã có `stack_hwm_units` trong telemetry) | Theo dõi HWM; nếu < 512 B thì tăng lên 6144 B. |

Tổng: CRITICAL 1, HIGH 2, MEDIUM 8, LOW 11.

Các mục đã kiểm tra và **không** thấy lỗi: không deadlock (không lồng mutex); không có ISR gọi API chặn; `portENTER_CRITICAL` chỉ bao vài lệnh gán, không gọi hàm chặn; `xQueueOverwrite` chỉ cho queue dài 1; không tạo/xoá task động (không leak task, không use-after-free/double free); không cấp phát heap trong vòng lặp nhanh của TaskDevice/TaskSensor (JSON/String chỉ ở TaskNetwork – phạm vi agent mạng); kiểm tra biên `Memory::validRange`, `PacketBuilder::append`, `writeStrings` (chống chồng lấn) đúng; `HighSpeedSampler` start/stop dùng CAS + queue, không race; tràn `millis()` được xử lý bằng phép trừ không dấu; Countdown/OnTimer `seconds*1000` ≤ 86 400 000 < 2³².

---

## 3. Ví dụ code cho CRITICAL / HIGH

### #1 (CRITICAL) – DHT trên GPIO12 (chân strapping)

Hiện tại (`DeviceIOT/board_pins.h:28`):
```cpp
// DHT11 temperature / humidity sensor.
#define DHT_PIN 12          // MTDI: HIGH lúc reset -> VDD_SDIO 1.8 V -> không boot
#define DHT_TYPE DHT11
```
Sửa (đổi 1 chân + chặn lúc biên dịch):
```cpp
// DHT11 temperature / humidity sensor. Không dùng chân strapping 0/2/5/12/15:
// pull-up của DHT làm GPIO12 = HIGH lúc reset -> flash 1.8 V -> không boot.
#define DHT_PIN 32
#define DHT_TYPE DHT11

#if DHT_PIN == 0 || DHT_PIN == 2 || DHT_PIN == 5 || DHT_PIN == 12 || DHT_PIN == 15
#error "DHT_PIN must not be an ESP32 strapping pin (pull-up on DATA)."
#endif
```
(Đi dây lại DHT DATA sang GPIO32. Phương án thay thế không cần đổi dây: `espefuse.py set_flash_voltage 3.3V` – cố định VDD_SDIO 3,3 V, không đảo ngược được.)

### #2 (HIGH) – Bản ESP8266 `SUPPORT_RTOS 1` không build được (thiếu EEPROM, `analogRead`)

Hiện tại (`Memory.cpp:3`, `DeviceIOT8266/TaskSensor.cpp:28`):
```cpp
#include <EEPROM.h>                       // không tồn tại trong esp8266RTOS 1.1.0
...
EEPROM.begin(size);
size_ = static_cast<size_t>(EEPROM.length());
...
sum += static_cast<uint16_t>(analogRead(A0));   // không có analogRead() trong core RTOS
```
Sửa tối thiểu (giữ nguyên lớp `Memory`, chỉ thay backend khi là 8266 RTOS):
```cpp
// Memory.cpp
#if defined(ESP8266) && SUPPORT_RTOS
#include "EepromNvs.h"     // lớp nhỏ cùng API EEPROM: begin/read/write/commit/length
#else
#include <EEPROM.h>
#endif
```
```cpp
// EepromNvs.h (chỉ cho 8266 RTOS) – cùng cách làm với EEPROM của ESP32
#include <nvs_flash.h>
#include <nvs.h>
class EepromNvs {
public:
    bool begin(size_t size) {
        if (nvs_flash_init() != ESP_OK || nvs_open("eeprom", NVS_READWRITE, &h_) != ESP_OK) return false;
        data_ = static_cast<uint8_t*>(calloc(size, 1));
        if (data_ == nullptr) return false;
        memset(data_, 0xFF, size);
        size_t stored = size;
        (void)nvs_get_blob(h_, "eeprom", data_, &stored);   // lần đầu: giữ 0xFF
        size_ = size;
        return true;
    }
    uint8_t read(int a) const { return data_[a]; }
    void write(int a, uint8_t v) { if (data_[a] != v) { data_[a] = v; dirty_ = true; } }
    bool commit() {
        if (!dirty_) return true;
        if (nvs_set_blob(h_, "eeprom", data_, size_) != ESP_OK || nvs_commit(h_) != ESP_OK) return false;
        dirty_ = false;
        return true;
    }
    size_t length() const { return size_; }
private:
    nvs_handle h_ = 0; uint8_t* data_ = nullptr; size_t size_ = 0; bool dirty_ = false;
};
extern EepromNvs EEPROM;
```
```cpp
// DeviceIOT8266/TaskSensor.cpp
#if SUPPORT_RTOS
#include "driver/adc.h"
uint16_t readA0() { uint16_t raw = 0; return adc_read(&raw) == ESP_OK ? raw : 0; }
#else
uint16_t readA0() { return static_cast<uint16_t>(analogRead(A0)); }
#endif
// setup(): #if SUPPORT_RTOS  adc_config_t c = {ADC_READ_TOUT_MODE, 8}; adc_init(&c);  #endif
// sampleAdc(): sum += readA0();
```
Nếu chưa muốn hỗ trợ: thêm vào `DeviceIOT8266/config_features.h`
`#if SUPPORT_RTOS` → `#error "SUPPORT_RTOS 1: esp8266RTOSArduCore has no EEPROM/analogRead yet"`.

### #3 (HIGH) – NON-OS: `connect()` MQTT chặn `loop()`, TaskDevice (auto-OFF/on-timer) không chạy

Hiện tại (`DeviceIOT8266.ino:79-83`):
```cpp
void loop()
{
    TaskDevice::service();    // không chạy trong 10-20 s khi TaskNetwork::service() đang connect TLS
    TaskSensor::service();
    TaskNetwork::service();   // -> mqtt.connect(): TCP + TLS (10 s) + CONNACK (5 s)
    SystemTask::service();
    delay(COOP_LOOP_DELAY_MS);
}
```
Sửa tối thiểu (chỉ nhánh `SUPPORT_RTOS 0`): đăng ký TaskDevice là *recurrent scheduled function*; core 8266 3.1.2 gọi các hàm này ở **mọi** `yield()`/`delay()` (core_esp8266_main.cpp:123 `esp_suspend_within_cont()` → `run_scheduled_recurrent_functions()`), kể cả khi WiFiClientSecure/PubSubClient đang chờ mạng. TaskDevice không gọi `yield()` và không dùng EEPROM nên chạy lồng như vậy là an toàn.
```cpp
#if !SUPPORT_RTOS
#include <Schedule.h>
#endif

void setup()
{
    ...
#if !SUPPORT_RTOS
    // Outputs, button and auto OFF keep running while the network blocks.
    schedule_recurrent_function_us([]() {
        TaskDevice::service();
        return true;                       // giữ lại mãi
    }, DEVICE_TASK_PERIOD_MS * 1000UL);
#endif
}

void loop()
{
#if SUPPORT_RTOS
    vTaskDelay(delayTicks(RTOS_IDLE_LOOP_DELAY_MS));
#else
    TaskSensor::service();
    TaskNetwork::service();
    SystemTask::service();
    delay(COOP_LOOP_DELAY_MS);             // delay() cũng chạy TaskDevice qua recurrent function
#endif
}
```
Kết hợp giảm thời gian chặn trên 8266 (`DeviceIOT8266/timing.h`): `MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS 5`, `MQTT_SOCKET_TIMEOUT_SECONDS 3`. Cần thử trên phần cứng: rút cáp broker, giữ on-timer 10 s, kiểm tra bơm tắt đúng hạn.

---

## 4. Danh sách file cần sửa

| File | Mục |
|---|---|
| DeviceIOT/board_pins.h | #1 (DHT_PIN), #19 (`#error` VSPI/LoRa) |
| DeviceIOT/Memory.cpp + DeviceIOT8266/Memory.cpp (giữ giống hệt) | #2 (backend EEPROM 8266 RTOS), #14, #21 |
| DeviceIOT8266/EepromNvs.h (mới, chỉ 8266) | #2 |
| DeviceIOT8266/TaskSensor.cpp | #2 (`adc_read`), #10 |
| DeviceIOT8266/config_features.h | #2 (nếu chọn `#error`) |
| DeviceIOT8266/DeviceIOT8266.ino + DeviceIOT/DeviceIOT.ino (giữ giống hệt) | #3, #11 |
| DeviceIOT/timing.h | #4 (priority), #17, #22 |
| DeviceIOT8266/timing.h | #3 (timeout), #9 (stack) |
| DeviceIOT/SystemTask.cpp (+ bản 8266) | #5 (heartbeat), #6 (hoãn commit khi capture), #9 (HWM 8266) |
| DeviceIOT/TaskDevice.cpp, TaskSensor.cpp, TaskNetwork.cpp (+ bản 8266) | #5 (tăng heartbeat), #16, #17 |
| DeviceIOT/ScheduleEngine.cpp, Countdown.cpp, OnTimer.cpp, ThresholdControl.cpp (+ bản 8266) | #6 (giới hạn tần suất / retry), #13, #14 |
| DeviceIOT/ScheduleCore.h (+ bản 8266) | #12 |
| DeviceIOT/Sync.h (+ bản 8266) | #10 (làm tròn tick) |
| DeviceIOT/HighSpeedSampler.cpp / .h | #7, #18 |
| DeviceIOT/HighSpeedUdpSender.cpp (+ TaskNetwork.cpp nếu tách task UDP) | #8 |
| DeviceIOT8266/docs/BUILD_MODES.md | #20 |

Lưu ý: các file "identical in DeviceIOT and DeviceIOT8266" phải sửa đồng thời ở cả 2 thư mục (tools/check_shared_files.sh).

---

# Phần B

Phạm vi: TaskNetwork, NetworkWifi, NetworkMqtt/MqttTransport/MqttSecurity/MqttInternal/MqttPlatform, AsconSession/AsconAead128, CommandDispatcher/CommandHandlers/StatusReport/HighSpeedCommand, HttpServer/SetupPortal/DeviceHttpApi, LinkProbe, WifiProvisioning, OtaUpdater, NetworkRF, PlatformCompat, Common.cpp, Memory (khi gọi từ network), HighSpeedUdpSender (rebind). Đối chiếu `docs/Connectivity.md`.

Mọi kết luận về API đã được kiểm tra trên mã nguồn thật:
- ESP32 core 3.2.1 (`libraries/WebServer`, `Network`, `NetworkClientSecure`, `HTTPClient`, `Update`, `cores/esp32/Stream.cpp`) và `esp32-arduino-libs/idf-release_v5.4.../esp32/sdkconfig`.
- ESP8266 core 3.1.2 (`ESP8266WiFi/WiFiClientSecureBearSSL.cpp`, `WiFiClient.cpp`, `ESP8266WebServer`, `Stream.cpp`).
- esp8266RTOS 1.1.0 (`libraries/WiFiClientSecure`, `WebServer`, `cores/esp8266/Stream.cpp`, `esp32-hal-time.c`, `components/freertos/port/esp8266/.../portmacro.h`).
- PubSubClient 2.8, LoRa 0.8.0, ArduinoJson 7.0.3.

Các file chung (byte-identical) đã được phân tích cho cả ba runtime: ESP32 (FreeRTOS, 2 nhân), ESP8266 `SUPPORT_RTOS 0` (NON-OS, `loop()` hợp tác) và ESP8266 `SUPPORT_RTOS 1` (esp8266RTOSArduCore).

---

## 1. Bản đồ ngữ cảnh thực thi (cái gì chạy ở đâu)

### ESP32 (Arduino-ESP32 3.2.1 / IDF 5.4)
| Ngữ cảnh | Nhân / Priority / Stack | Chạy gì (phía network) |
|---|---|---|
| `loopTask` (setup) | core 1, prio 1 | `TaskNetwork::setup()`: đọc EEPROM, `WiFi.onEvent` đăng ký, `WiFi.begin`/`softAP`, `mqtt.begin()` (parse PEM, `setBufferSize`). Sau đó `loop()` chỉ `vTaskDelay(1000)`. |
| `TaskNetwork` | **core 0, prio 2**, 10000 B, `vTaskDelay(1 tick)` | Toàn bộ: `NetworkWifi::service` (WiFi.status/localIP poll), `LinkProbe` (lwIP qua `esp_netif_tcpip_exec`), `WebServer::handleClient` → handler SetupPortal/DeviceHttpApi → `handleLanCommand` → `mqtt::dispatch`; `PubSubClient::loop()` → callback `onMessage` → `dispatch` → handler → `TaskDevice::postCommand` (queue, chờ ≤50 ms), `ScheduleEngine` (entriesMutex), `Countdown` (timerMutex), `OnTimer`/`ThresholdControl`, `HighSpeedSampler::start/stop`; publish (TLS write); `high_speed_udp::service` (drain 8 gói/lượt), OTA, provisioning; ghi EEPROM (`/setup`, `/wifi`, nút, OTA, provisioning) và `ESP.restart()`. |
| `TaskDevice` / `SystemTask` | core 0, **prio 1** | Thấp hơn TaskNetwork trên cùng nhân → bị bỏ đói khi TaskNetwork spin. |
| `TaskSensor` | core 1, prio 3 | Không bị ảnh hưởng trực tiếp. |
| `arduino_events` | core 1 (`CONFIG_ARDUINO_EVENT_RUNNING_CORE=1`) | `onWifiEvent`, `onProvisioningEvent`: chỉ `AtomicU32`/`DirtyFlag`/`strlcpy` trong critical section → **an toàn**. |
| `tcpip_thread` | core 0, prio 18 | Callback DNS `onDnsFound` (chỉ atomic) → an toàn. `CONFIG_LWIP_TCPIP_CORE_LOCKING=y`, `CONFIG_LWIP_CHECK_THREAD_SAFETY=y`: `esp_netif_tcpip_exec` lấy `LOCK_TCPIP_CORE` và chạy hàm trong task gọi → các lệnh `etharp_*`, `dns_gethostbyname` **đúng ngữ cảnh**. |
| Task WDT | `CONFIG_ESP_TASK_WDT_TIMEOUT_S=5`, `CHECK_IDLE_TASK_CPU0=y`, `PANIC=y` | Chỉ IDLE0 được giám sát; không task nào của firmware đăng ký TWDT. **Bất kỳ vòng busy-wait ≥5 s của TaskNetwork (prio 2, core 0) → panic/reset.** |

### ESP8266 `SUPPORT_RTOS 0` (core 3.1.2, NON-OS)
- Một ngữ cảnh `cont` duy nhất: `loop()` gọi lần lượt TaskDevice → TaskSensor → TaskNetwork → SystemTask, `delay(2)`.
- Callback `WiFi.onStationMode*` và callback lwIP (DNS) chạy trong ngữ cảnh SDK *giữa các lần yield* → chỉ đếm atomic → an toàn; `CriticalSection` là no-op là đúng.
- Soft WDT ~3.2 s nếu `loop()` không yield. Các API chặn của core (BearSSL `_run_until`, `Stream::timedRead`, `esp_delay` trong connect/DNS) đều yield → **không reset**, nhưng **toàn bộ firmware đứng** trong lúc chặn.
- BearSSL dùng stack phụ (stack thunk) → stack `cont` 4 KB đủ.

### ESP8266 `SUPPORT_RTOS 1` (esp8266RTOSArduCore 1.1.0)
- `xTaskCreate`, **`StackType_t = uint8_t`** (portmacro.h:67) → `TASK_NETWORK_STACK_SIZE 4096` là **4096 byte**.
- TaskNetwork prio 2 (period 20 ms), TaskSensor prio 2, TaskDevice/SystemTask prio 1, loopTask prio 1.
- Không có Wi-Fi event handler (poll `WiFi.status()`), LinkProbe tắt (`arpSupported()=false`).
- Task WDT nuôi bởi idle (mặc định `ESP_TASK_WDT_TIMEOUT_15N` ≈ 26 s).
- `yield()` = `taskYIELD` → không nhường cho task priority thấp hơn.

### Tái nhập (re-entrancy) đã kiểm tra — OK
- Callback PubSubClient publish từ bên trong `loop()`: `dispatch()` gọi `deserializeJson(document, const char*, len)` → ArduinoJson 7 **copy** chuỗi, nên việc `publish()` ghi đè `PubSubClient::buffer` (chứa topic/payload) không làm hỏng lệnh; `msgId` của PUBACK được đọc **trước** callback (PubSubClient.cpp:400) → PUBACK đúng.
- `handleLanCommand` từ HTTP handler và `PubSubClient::loop()` chạy tuần tự trong cùng TaskNetwork (`serviceHttp` rồi `serviceMqtt`) → không chạy chồng.
- BearSSL `X509List`/`PrivateKey` (`unique_ptr`): `transport::begin()` luôn `closeConnection()` trước `load()`, và `apply()` gọi lại `setTrustAnchors/setClientECCert` trước mỗi `connect()` → không use-after-free. ESP32/RTOS: `setCACert(ca_.c_str())` chỉ dùng lúc handshake; `apply()` đặt lại con trỏ trước mỗi connect → không dangling.
- `setServer(state.settings.host, …)`, topic: con trỏ vào struct tĩnh → ổn định.
- LinkProbe ESP32 dùng `esp_netif_tcpip_exec` (đúng API IDF 5.4, esp_netif.h:1175) → an toàn luồng; NON-OS gọi trực tiếp từ `loop()` là đúng mô hình lwIP của core 8266.
- Ascon: kiểm tra biên `decryptHex` (`hexLength > 64`, chẵn), buffer `cipherLength+1`, so sánh tag hằng thời gian → OK (tính năng đang tắt: `ENABLE_ASCON_AEAD128 0`).

---

## 2. Bảng lỗi

| STT | File / Hàm | Vị trí lỗi (file:line) | Mô tả lỗi | Mức độ | Xác nhận/Rủi ro | Đề xuất |
|---|---|---|---|---|---|---|
| 1 | HttpServer.cpp `service()` → ESP32 `WebServer::handleClient` / `_parseRequest` | HttpServer.cpp:88; timing.h:17 (`TASK_NETWORK_PRIORITY 2`); DeviceIOT.ino:64 (core 0). Core: WebServer.cpp:433, Parsing.cpp:78-79, Stream.cpp:31-41, NetworkClient.cpp:372 (`recv MSG_DONTWAIT`) | Client gửi dòng request dở dang (không có `\r`) rồi giữ kết nối: `readStringUntil('\r')` rồi `readStringUntil('\n')` → `Stream::timedRead()` **busy-loop không yield** 2×5000 ms (`HTTP_MAX_SEND_WAIT`). TaskNetwork prio 2 chiếm core 0 ~10 s → IDLE0 không chạy → **TWDT 5 s panic → reset**; TaskDevice/SystemTask (prio 1) bị bỏ đói. Kẻ tấn công nhỏ giọt 1 byte/4.9 s → spin vô hạn. 8266 NON-OS: `timedRead` có `yield()` nên không reset nhưng `loop()` đứng 10 s (relay/nút/lịch đứng). 8266 RTOS: spin, prio-1 task bị đói 10 s. | CRITICAL | Xác nhận (mã nguồn); hiện tượng reset cần thử trên phần cứng (`nc` gửi `GET /`) | (a) Đưa TaskDevice lên priority > TaskNetwork trên core 0; (b) cấu hình lại TWDT: không giám sát IDLE0, đăng ký từng task + `esp_task_wdt_reset()` với timeout 15–20 s; (c) dài hạn: chuyển ESP32 sang `esp_http_server` (task riêng, recv có timeout ngủ) |
| 2 | MqttTransport.cpp `transport::connect()` → `PubSubClient::connect()` / `readByte()` | MqttTransport.cpp:297-299, 264; lib PubSubClient.cpp:257-264 (chờ CONNACK không yield), :288-296 (`yield()`) | Sau handshake TLS, PubSubClient chờ CONNACK bằng `while(!_client->available())` **không yield**; `NetworkClientSecure::available()` → `mbedtls_ssl_read` non-blocking (ssl_client.cpp:398) → spin tới `socketTimeout` = 5 s trên core 0 prio 2 → TWDT 5 s panic (vòng chờ ≥5000 ms ≥ timeout WDT). `readByte()` gọi `yield()` = `vPortYield` không nhường cho IDLE/prio 1. Broker chậm/treo CONNACK → vòng reset liên tục. 8266 NON-OS: `_run_until` có `optimistic_yield` → không reset nhưng `loop()` đứng 5 s. | HIGH | Rủi ro (vòng spin đã xác nhận; cần broker chậm để kích hoạt) | Bọc client bằng `YieldingClient` (available()==0 → `delay(1)`), giảm `MQTT_SOCKET_TIMEOUT_SECONDS` xuống 2–3 s; kết hợp mục 1(b) |
| 3 | MqttPlatform.h (ESP32) `TlsCredentials::apply()` | DeviceIOT/MqttPlatform.h:73 (`client.setTimeout(...)`); core NetworkClientSecure.cpp:33,148; NetworkClient.h:43; Stream.h:50 | `setTimeout()` chỉ đặt `Stream::_timeout`; `NetworkClient::_timeout` (che khuất, dùng cho TCP connect và `socket_timeout` của TLS) vẫn **30000 ms**. Mỗi lần connect tới broker không tới được: DNS (getaddrinfo) + **30 s TCP connect** + 10 s handshake; mỗi `publish` khi cửa sổ TCP đầy có thể chặn tới 30 s (`send_ssl_data`). Trong lúc đó HTTP/LAN, drain UDP tốc độ cao, health check đều đứng. Trái với docs/Connectivity.md ("bounded by the MQTT socket / TLS timeouts"). | HIGH | Xác nhận | Gọi `client.setConnectionTimeout(MQTT_SOCKET_TIMEOUT_SECONDS*1000)` (NetworkClient.cpp:353) |
| 4 | DeviceIOT8266/MqttPlatform.h (nhánh mbedTLS, `SUPPORT_RTOS 1`) `apply()` | DeviceIOT8266/MqttPlatform.h:144; RTOS lib WiFiClientSecure.h:77 (`int setTimeout(uint32_t){return 0;}`), WiFiClientSecure.cpp:38,127-129; ssl_client.cpp:80-89 | `client.setTimeout()` gọi vào **stub no-op** che khuất `Stream::setTimeout`; `setHandshakeTimeout()` bị bỏ (diff so với ESP32) → handshake timeout **120 s**, `_timeout=0` → SO_RCVTIMEO/SNDTIMEO 30 s, `lwip_connect` blocking không giới hạn. TaskNetwork có thể chặn ≥1–2 phút. | HIGH | Xác nhận | Gọi `setHandshakeTimeout(MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS)`; dùng lớp con override `connect(host,port)` → `connect(host,port,timeoutMs)` |
| 5 | MqttTransport.cpp `connect()` trên 8266 NON-OS | MqttTransport.cpp:297; DeviceIOT8266/MqttPlatform.h:110-111; core WiFiClient.cpp:133 (DNS dùng `_timeout`), ClientContext.h:147, WiFiClientSecureBearSSL.cpp:487 | Ở chế độ hợp tác, một lần connect chặn **toàn bộ** `loop()`: DNS ≤10 s + TCP ≤10 s + handshake BearSSL ≤10 s (ECDSA ~1–3 s CPU @80 MHz) + CONNACK ≤5 s ≈ 35 s. Khi broker mất, lặp lại theo backoff (2 s→60 s) → nút, relay, lịch, cảm biến đứng nhiều giây mỗi phút. Không reset WDT (có yield). | HIGH | Xác nhận (mã nguồn) | Chỉ connect khi DNS probe = Resolved; giảm timeout TCP/CONNACK; CPU 160 MHz; backoff min lớn hơn khi NON-OS |
| 6 | DeviceIOT8266/timing.h `TASK_NETWORK_STACK_SIZE` | DeviceIOT8266/timing.h:13; DeviceIOT.ino:64; RTOS portmacro.h:67 | Với esp8266RTOS, stack tính bằng **byte** → TaskNetwork chỉ 4096 B nhưng chạy handshake mbedTLS (x509/ECDSA) ngay trong task, cộng JsonDocument/String, WebServer parse, LoRa buffer 255 B. esp-mqtt của chính SDK mặc định 6144 B (components/mqtt/Kconfig:76). Nguy cơ **stack overflow** khi TLS connect. | HIGH | Rủi ro (đo `stack_hwm_units` trong telemetry) | Tăng lên 6144–8192 B; bật `configCHECK_FOR_STACK_OVERFLOW=2` |
| 7 | TaskNetwork.cpp `publishTelemetry()` (ESP32) | TaskNetwork.cpp:394-400; MqttTransport.cpp:362-365; timing.h:50 (`MQTT_PACKET_SIZE 1024` khi Ascon tắt) | Telemetry ESP32 (system + tasks + capture + `net` + timestamp/nonce) tối thiểu ≈ **1038 B** (đã tính với giá trị nhỏ nhất) > 1024 → `send()` từ chối ("payload too large"); PubSubClient còn cần 5+2+topic byte. Telemetry **không bao giờ được gửi**. 8266 không có khối `capture` → nhỏ hơn. | MEDIUM | Xác nhận (tính kích thước) | Tăng `MQTT_PAYLOAD_SIZE` lên 1536/2048 hoặc tách telemetry thành 2 message |
| 8 | DeviceHttpApi.cpp `handleLan()`, SetupPortal.cpp `requestData()` | DeviceHttpApi.cpp:146-148; SetupPortal.cpp:43-46, 94; core ESP32 Parsing.cpp:44-74, 208; 8266 Parsing-impl.h:38-41,160-165 | Giới hạn `LAN_REQUEST_MAX_LENGTH` / `SETUP_REQUEST_MAX_LENGTH` chỉ kiểm tra **sau khi** WebServer đã đọc toàn bộ body theo `Content-Length` (malloc/realloc trên ESP32, `String` grow trên 8266). POST với Content-Length lớn → cạn heap tạm thời → các cấp phát khác (TLS, JSON, task khác) thất bại. | MEDIUM | Rủi ro | Dùng `server.collectHeaders("Content-Length")`/`clientContentLength()` không đủ vì body đã đọc; giải pháp: handler raw/`esp_http_server` với giới hạn; tối thiểu: theo dõi `heap_min_free` |
| 9 | Đường restart: HttpServer.cpp `service()`, NetworkWifi.cpp `serviceRestartWatchdog()`, TaskNetwork.cpp `serviceNetworkButton()`/`runOtaOnce()`, WifiProvisioning.cpp | HttpServer.cpp:92; NetworkWifi.cpp:458; TaskNetwork.cpp:175, 190; WifiProvisioning.cpp:45, 57 | `ESP.restart()` từ TaskNetwork (prio 2) không giữ `eepromMutex`. Trên 8266 RTOS, nó có thể preempt SystemTask (prio 1) giữa erase và write sector EEPROM trong `Memory::writeBytes` (flush Countdown/OnTimer/Schedule) → mất cấu hình (Wi-Fi, chứng chỉ, lịch). ESP32 EEPROM dùng NVS (EEPROM.cpp:48 `nvs_open`) → nguyên tử, rủi ro thấp. NON-OS: tuần tự → an toàn. | MEDIUM | Rủi ro (8266 RTOS) | Thêm `Memory::restartSafely()` lấy `eepromMutex` rồi mới `ESP.restart()` |
| 10 | OtaUpdater.cpp `downloadAndFlash()` (ESP32) | OtaUpdater.cpp:100; core Updater.cpp:599, Stream.cpp:31-41, HTTPClient.h:44 | `Update.writeStream()` → `readBytes()` → `timedRead()` busy-spin không yield tới 5000 ms (`_tcpTimeout`) khi server chậm → TWDT 5 s panic (TaskNetwork prio 2 core 0) giữa chừng OTA (ảnh không bị kích hoạt nên không brick, nhưng OTA thất bại/lặp). Hiện `OTA_VERSION_URL ""` → tắt. | MEDIUM | Rủi ro | `http.setTimeout(2000)`; kết hợp mục 1(b) (TWDT theo task, timeout 15–20 s) |
| 11 | NetworkRF.cpp `sendData()` → `LoRa.endPacket()` | NetworkRF.cpp:59; lib LoRa.cpp:195-197; DeviceHttpApi.cpp:191 (`/lora` POST) | `endPacket()` chờ `IRQ_TX_DONE` **không timeout**. Bình thường chặn ~0.1–0.4 s (SF7, 255 B) trong HTTP handler; nếu module lỗi/SPI hỏng → vòng vô hạn: NON-OS `yield()` vẫn nuôi WDT → **treo vĩnh viễn không reset**; RTOS → prio-1 task đói tới khi task WDT (~26 s). | MEDIUM | Rủi ro | Dùng `endPacket(true)` (async) + poll `IRQ_TX_DONE` với timeout trong `service()`, hoặc giới hạn thời gian và `LoRa.idle()` khi hết hạn |
| 12 | MqttTransport.cpp `publishPlain/publishEncryptedText`, CommandDispatcher.cpp `LanSink`, DeviceHttpApi.cpp `handleLan` | MqttTransport.cpp:376-424; CommandDispatcher.cpp:75-108; DeviceHttpApi.cpp:146-177 | Mỗi message tạo nhiều `String` + `JsonDocument` tạm (serialize → deserialize lại → serialize; Ascon bật: hex 2× + bản sao trong doc + canonical HMAC ≈ 9× payload). Trên 8266 (BearSSL RX 2–4 KB + PubSubClient 1–2 KB cố định), đường LAN đỉnh ~10 KB → **phân mảnh heap** khi chạy dài. | MEDIUM | Rủi ro | `reserve()` trước khi nối; serialize thẳng vào buffer cố định (`serializeJson(doc, char*, size)`); bỏ vòng serialize→deserialize khi không cần; giám sát `heap_min_free_bytes`/max block |
| 13 | TaskNetwork.cpp `taskRun()` (ESP32) | TaskNetwork.cpp:471; timing.h:133 (`NETWORK_TASK_PERIOD_MS 1`) | Chu kỳ 1 tick: mỗi lượt gọi `WiFi.status()`+`localIP()` 2 lần, `accept()`, `mbedtls_ssl_read` (available), JSON check… → tải CPU core 0 đáng kể ở prio 2, cạnh tranh Wi-Fi/lwIP và TaskDevice. | LOW | Rủi ro (đo CPU) | Chỉ chạy 1 ms khi đang capture; ngoài ra 10–20 ms |
| 14 | TaskNetwork.cpp `publishTelemetry()` | TaskNetwork.cpp:386-388 | `statusDirty`/`sensorDirty` bị xoá **trước** khi publish thành công → publish lỗi làm mất cập nhật trạng thái tới lần thay đổi kế tiếp. | LOW | Xác nhận | Chỉ xoá cờ khi `mqtt.publish()` trả true |
| 15 | MqttTransport.cpp `service()` | MqttTransport.cpp:342-349 | "Dead connection" (`kDeadConnectionMs`) không bao giờ kích hoạt: `PubSubClient::loop()` trả true mọi lúc còn kết nối, `lastLoopOkMs` cập nhật mỗi lượt. Phát hiện mất kết nối chỉ dựa vào keepalive của PubSubClient (≤1.5×keepalive). | LOW | Xác nhận | Cập nhật `lastLoopOkMs` khi nhận gói (so sánh `state()`/PINGRESP) hoặc bỏ cơ chế cho rõ |
| 16 | Clock.h `startSync()` gọi từ 2 task | Clock.h:47-50; TaskNetwork.cpp:284; MqttTransport.cpp:212; SystemTask.cpp:166 (8266: :110) | Cờ `static bool started` không atomic, gọi từ TaskNetwork và SystemTask → có thể `configTime` 2 lần. ESP32: `configTime` lấy `LOCK_TCPIP_CORE` → vô hại. 8266 RTOS: `configTime` gọi `sntp_*` (raw lwIP) từ task ứng dụng **không khoá** (esp32-hal-time.c:52-63) → không an toàn luồng. | LOW | Rủi ro | Chỉ TaskNetwork gọi `startSync()`; SystemTask chỉ đọc `isValidNow()` |
| 17 | NetworkWifi.cpp `startAttempt()/processEvents()` | NetworkWifi.cpp:196-198, 304-306 | `seenDisconnected_`/`seenLostIp_` không đồng bộ lại khi bắt đầu attempt mới → event DISCONNECTED trễ (reason ≠ 8) của attempt trước có thể đánh hỏng attempt mới → tăng `consecutiveFailures_`, radio reset sớm. | LOW | Rủi ro | Trong `startAttempt()` gán `seenDisconnected_ = disconnectedEvents.load(); seenLostIp_ = lostIpEvents.load();` |
| 18 | WifiProvisioning.cpp `onProvisioningEvent()` | WifiProvisioning.cpp:65-67; core NetworkEvents.h:119 (`wifi_sta_config_t`) | `ssid[32]`/`password[64]` của `wifi_sta_config_t` không bắt buộc kết thúc `\0`; `strlcpy` đọc `strlen(src)` → đọc quá biên (trong struct) khi SSID 32 ký tự / pass 64 ký tự. Kết quả copy vẫn đúng độ dài, không ghi tràn. | LOW | Xác nhận (mã) | `memcpy` theo `strnlen(src, sizeof(src))` |
| 19 | HttpServer.cpp `start()` | HttpServer.cpp:59 | `new DeviceWebServer` (không `nothrow`) mỗi lần đổi lease/AP fallback → phân mảnh; OOM → abort. | LOW | Rủi ro | Tạo một lần, chỉ `close()/begin()` lại; hoặc `new (std::nothrow)` + kiểm tra |
| 20 | LinkProbe.cpp `runArpJob()` | LinkProbe.cpp:112 (`etharp_cleanup_netif`) | Xoá toàn bộ ARP cache mỗi 60 s (kể cả entry của broker/client LAN) → gói đang gửi bị xếp hàng/mất, tăng trễ. Ngữ cảnh lwIP đúng (đã xác minh). | LOW | Rủi ro | Chỉ xoá entry gateway và địa chỉ của mình (`etharp_remove_static_entry` không áp dụng; dùng `etharp_query` cho gateway) hoặc giảm tần suất |
| 21 | Memory.cpp với esp8266RTOS | Memory.cpp:3 (`#include <EEPROM.h>`) | esp8266RTOSArduCore 1.1.0 **không có thư viện EEPROM** (không tìm thấy `EEPROM*` trong gói) → build `SUPPORT_RTOS 1` cần xác minh (có thể không biên dịch, hoặc dùng bản EEPROM ngoài với semantics commit khác). | LOW | Rủi ro (build) | Kiểm tra build RTOS; nếu cần, cài đặt Memory trên NVS/`spi_flash` có commit nguyên tử |
| 22 | AsconSession.cpp `prepareKey()` / CommandDispatcher.cpp `LanSink::sendText` | AsconSession.cpp:132-136; CommandDispatcher.cpp:91 | Khi bật Ascon, khoá phiên chỉ có sau khi publish handshake qua MQTT → khi broker mất, `/update`, `/control`, `/lan` luôn trả lỗi (fail-closed), dù tài liệu coi LAN là đường dự phòng. Hiện Ascon tắt. | LOW | Xác nhận (thiết kế) | Ghi rõ trong docs/LanControl.md hoặc cho phép khoá phiên cục bộ cho LAN |

Tổng: **CRITICAL 1, HIGH 5, MEDIUM 6, LOW 10**.

---

## 3. Ví dụ mã cho CRITICAL / HIGH (sửa tối thiểu, giữ kiến trúc)

### #1 (CRITICAL) — HTTP client chậm làm TaskNetwork spin → TWDT reset (ESP32), đứng loop (8266)

Vấn đề (core ESP32, `Stream.cpp:31` + `Parsing.cpp:78`):
```cpp
// WebServer::_parseRequest — trong TaskNetwork (core 0, prio 2)
String req = client.readStringUntil('\r');   // timedRead(): do { c = read(); } while (millis()-start < 5000);
client.readStringUntil('\n');                // thêm 5 s nữa, KHÔNG yield → IDLE0 đói → TWDT panic
```
Sửa (giữ kiến trúc; DeviceIOT.ino + timing.h + mỗi `taskRun`):
```cpp
// timing.h (ESP32): điều khiển không bị network bỏ đói
#define TASK_DEVICE_PRIORITY 3   // > TASK_NETWORK_PRIORITY (2) trên core 0

// DeviceIOT.ino, setup(), trước createTask():
#if defined(ESP32)
#include <esp_task_wdt.h>
    const esp_task_wdt_config_t wdt = {
        .timeout_ms = 20000,          // > 2 x HTTP_MAX_SEND_WAIT, > TLS handshake
        .idle_core_mask = 0,          // không dựa vào IDLE0 nữa
        .trigger_panic = true,
    };
    esp_task_wdt_reconfigure(&wdt);
#endif

// TaskNetwork::taskRun (tương tự TaskDevice/SystemTask):
#if SUPPORT_RTOS
#if defined(ESP32)
    esp_task_wdt_add(nullptr);
#endif
    for (;;) {
        service();
#if defined(ESP32)
        esp_task_wdt_reset();
#endif
        vTaskDelay(delayTicks(NETWORK_TASK_PERIOD_MS));
    }
#endif
```
Kết quả: spin 10 s của WebServer không còn reset máy, TaskDevice vẫn chạy; task treo thật (> 20 s) vẫn bị WDT phát hiện. Kẻ tấn công nhỏ giọt vô hạn vẫn có thể gây reset sau 20 s → giải pháp triệt để là chuyển sang `esp_http_server` (ESP32) — ghi nhận cho giai đoạn sau.

### #2 (HIGH) — chờ CONNACK busy-loop trong PubSubClient

Vấn đề (PubSubClient.cpp:257):
```cpp
while (!_client->available()) {           // NetworkClientSecure::available() không chặn, không ngủ
    if (millis() - lastInActivity >= socketTimeout * 1000UL) { ... return false; }
}                                          // 5 s spin trên core 0 → TWDT 5 s
```
Sửa (MqttTransport.cpp — bọc client, không đụng thư viện):
```cpp
// Nhường CPU khi chưa có dữ liệu: các vòng chờ của PubSubClient (CONNACK,
// readByte) gọi available() liên tục.
class YieldingClient : public Client {
public:
    explicit YieldingClient(Client& inner) : inner_(inner) {}
    int available() override { const int n = inner_.available(); if (n <= 0) delay(1); return n; }
    int connect(IPAddress ip, uint16_t port) override { return inner_.connect(ip, port); }
    int connect(const char* host, uint16_t port) override { return inner_.connect(host, port); }
    size_t write(uint8_t b) override { return inner_.write(b); }
    size_t write(const uint8_t* buf, size_t size) override { return inner_.write(buf, size); }
    int read() override { return inner_.read(); }
    int read(uint8_t* buf, size_t size) override { return inner_.read(buf, size); }
    int peek() override { return inner_.peek(); }
    void flush() override { inner_.flush(); }
    void stop() override { inner_.stop(); }
    uint8_t connected() override { return inner_.connected(); }
    operator bool() override { return static_cast<bool>(inner_); }
private:
    Client& inner_;
};

struct TransportState {
    MqttSettings settings = {};
    mqtt_platform::SecureClient secureClient;
    YieldingClient yieldingClient{secureClient};
    PubSubClient client{yieldingClient};
    ...
};
// timing.h: #define MQTT_SOCKET_TIMEOUT_SECONDS 3
```
(Interface `Client` giống hệt nhau ở cả 3 core — đã kiểm tra Client.h.)

### #3 (HIGH) — ESP32: timeout TCP/TLS không được áp dụng

Vấn đề (DeviceIOT/MqttPlatform.h:73):
```cpp
client.setTimeout(MQTT_SOCKET_TIMEOUT_SECONDS * 1000UL);  // chỉ Stream::_timeout
// NetworkClientSecure::connect() dùng NetworkClient::_timeout = 30000 → TCP connect 30 s, ssl socket_timeout 30 s
```
Sửa:
```cpp
void apply(SecureClient& client)
{
    client.stop();
    client.setCACert(ca_.c_str());
    ...
    client.setHandshakeTimeout(MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS);
    client.setConnectionTimeout(MQTT_SOCKET_TIMEOUT_SECONDS * 1000UL);  // TCP connect + TLS read/write
    client.setTimeout(MQTT_SOCKET_TIMEOUT_SECONDS * 1000UL);            // Stream reads
}
```

### #4 (HIGH) — 8266 RTOS: `setTimeout` là stub, không có handshake timeout

Vấn đề (RTOS WiFiClientSecure.h:77 và DeviceIOT8266/MqttPlatform.h:144):
```cpp
int setTimeout(uint32_t seconds){ return 0; }      // trong thư viện: che khuất Stream::setTimeout
client.setTimeout(MQTT_SOCKET_TIMEOUT_SECONDS * 1000UL);  // → không làm gì; handshake_timeout = 120000
```
Sửa (DeviceIOT8266/MqttPlatform.h, nhánh `#else` mbedTLS):
```cpp
// connect(host, port) của PubSubClient không truyền timeout; lớp con truyền hộ.
class TimedSecureClient : public WiFiClientSecure {
public:
    using WiFiClientSecure::connect;
    int connect(const char* host, uint16_t port) override
    {
        return WiFiClientSecure::connect(host, port, MQTT_SOCKET_TIMEOUT_SECONDS * 1000);
    }
};
using SecureClient = TimedSecureClient;   // chỉ khi !ESP8266_NONOS_CORE

void apply(SecureClient& client)
{
    client.stop();
    client.setCACert(ca_.c_str());
    ...
    client.setHandshakeTimeout(MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS);
}
```
(`connect(host,port,timeout)` đặt `_timeout` → `handshake_timeout` và SO_RCVTIMEO/SNDTIMEO, WiFiClientSecure.cpp:114-129. `lwip_connect` vẫn blocking theo SYN retry của lwIP — chấp nhận, hoặc chỉ connect khi Wi-Fi online + DNS OK.)

### #5 (HIGH) — 8266 NON-OS: connect MQTT đóng băng `loop()` tới ~35 s

Vấn đề (TaskNetwork.cpp:325-328 → MqttTransport.cpp:297):
```cpp
mqtt.connect();   // DNS 10 s + TCP 10 s + TLS 10 s + CONNACK 5 s, trong loop() hợp tác
```
Sửa tối thiểu (TaskNetwork.cpp `serviceMqtt` + DeviceIOT8266/timing.h):
```cpp
#if defined(ESP32)
        const bool connectAllowed = !HighSpeedSampler::GetInstance().isSamplingActive();
#else
        // NON-OS: một connect chặn mọi module; chỉ thử khi host đã phân giải được.
        const bool connectAllowed = !link_probe::dnsSupported() || dnsHealth == link_probe::DnsState::Resolved;
#endif
```
```cpp
// DeviceIOT8266/timing.h
#define MQTT_SOCKET_TIMEOUT_SECONDS 3        // CONNACK
#define MQTT_TLS_HANDSHAKE_TIMEOUT_SECONDS 6 // BearSSL dùng chung cho TCP connect + handshake
#define MQTT_RECONNECT_BACKOFF_MIN_MS 10000UL
```
và build 160 MHz để handshake ECDSA < 1.5 s. (Lưu ý `dnsHealth` hiện chỉ cập nhật khi MQTT down — đúng thời điểm cần.)

### #6 (HIGH) — 8266 RTOS: stack TaskNetwork 4096 byte

Vấn đề:
```cpp
#define TASK_NETWORK_STACK_SIZE 4096   // StackType_t = uint8_t → 4096 BYTE, chạy mbedTLS handshake
```
Sửa (DeviceIOT8266/timing.h):
```cpp
#if SUPPORT_RTOS
#define TASK_NETWORK_STACK_SIZE 8192   // mbedTLS handshake + JSON + WebServer; SDK esp-mqtt dùng 6144
#else
#define TASK_NETWORK_STACK_SIZE 4096   // không dùng ở NON-OS
#endif
```
và kiểm tra `stack_hwm_units` của TaskNetwork trong telemetry sau một lần connect TLS (nên còn ≥1 KB).

---

## 4. Ghi chú liên biên (cho agent phía device/sensor/system)

- TaskNetwork (prio 2, core 0 trên ESP32) gọi vào: `TaskDevice::postCommand` (queue, chờ ≤ `COMMAND_QUEUE_TIMEOUT_MS` 50 ms), `TaskDevice::copyStatus` / `TaskSensor::copyLatest` (critical section, copy struct — ngắn, OK), `ScheduleEngine::add/update/remove/clear/listJson/addSettings` (`entriesMutex`, chờ vô hạn; có priority inheritance), `Countdown::*` (`timerMutex`), `OnTimer::set`, `ThresholdControl::set`, `HighSpeedSampler::startSampling/stopSampling/isSamplingActive`, `SystemTask::telemetryJson` (`snapshotMutex`), `SystemTask::setNetworkState` (atomic). Không thấy thứ tự khoá ngược → không phát hiện deadlock.
- EEPROM ghi **từ TaskNetwork**: `/setup` (`writeStrings` ~2.2 KB), `/wifi`, nút cấu hình (ESP32), OTA (`FW_VERSION`), provisioning. Lịch/countdown/on-timer được ghi trễ bởi SystemTask (`flush`), không từ callback MQTT → tốt. Trên ESP32, mỗi commit NVS tắt cache cả 2 nhân — cần agent phía sensor xác nhận ISR/HighSpeedSampler ở IRAM.
- `ESP.restart()` từ TaskNetwork không đồng bộ với flush EEPROM của SystemTask (mục #9).
- `startSync()` được gọi cả từ SystemTask (mục #16).
- Khi TaskNetwork spin (mục #1, #2, #10) TaskDevice/SystemTask trên core 0 bị bỏ đói tới 10 s — phía device nên xem lại priority.

---

## 5. Danh sách file cần sửa

| File | Mục |
|---|---|
| DeviceIOT/DeviceIOT.ino, DeviceIOT8266/DeviceIOT8266.ino (giữ identical, `#if defined(ESP32)`) | #1 (TWDT reconfigure) |
| DeviceIOT/TaskNetwork.cpp (+ TaskDevice.cpp, SystemTask.cpp: `esp_task_wdt_add/reset`) — file chung | #1, #5, #13, #14 |
| DeviceIOT/timing.h | #1 (TASK_DEVICE_PRIORITY), #2 (MQTT_SOCKET_TIMEOUT_SECONDS), #7 (MQTT_PAYLOAD_SIZE), #13 |
| DeviceIOT8266/timing.h | #2, #5 (timeouts, backoff), #6 (stack) |
| DeviceIOT/MqttTransport.cpp (chung) | #2 (YieldingClient), #15 |
| DeviceIOT/MqttPlatform.h | #3 |
| DeviceIOT8266/MqttPlatform.h | #4 |
| DeviceIOT/HttpServer.cpp (chung) | #9, #19 |
| DeviceIOT/Memory.h, Memory.cpp (chung) | #9 (`restartSafely()`), #21 |
| DeviceIOT/NetworkWifi.cpp (chung) | #9, #17 |
| DeviceIOT/OtaUpdater.cpp | #10 |
| DeviceIOT/NetworkRF.cpp (chung) | #11 |
| DeviceIOT/CommandDispatcher.cpp, DeviceHttpApi.cpp, SetupPortal.cpp (chung) | #8, #12, #22 |
| DeviceIOT/WifiProvisioning.cpp | #18 |
| DeviceIOT/Clock.h, SystemTask.cpp (cả hai) | #16 |
| DeviceIOT/LinkProbe.cpp (chung) | #20 |
| DeviceIOT/docs/Connectivity.md | cập nhật câu "Nothing in the network task blocks for more than a few milliseconds…" cho đúng thời gian chặn thực tế |

Nhắc lại: các file "identical in DeviceIOT and DeviceIOT8266" phải sửa đồng thời cả hai bản (tools/check_shared_files.sh).

---

# Trạng thái khắc phục (sau việc 3)

- Phần A: đã sửa tất cả, trừ A7 (ADS8866: hạ còn 50 kHz, mở SPI một lần mỗi phiên; chưa làm DMA/gptimer) và A8 (hàng đợi UDP tăng 24 -> 64 gói; chưa có task gửi UDP riêng) sửa một phần, A15 (DHT tắt ngắt 4-5 ms) giữ nguyên vì rủi ro thấp. A1 (DHT trên GPIO12) chưa đổi chân: có `#warning` và hướng dẫn, chờ quyết định phần cứng.
- Phần B: đã sửa tất cả, trừ B12 (phân mảnh heap 8266) và B19 (tạo lại web server khi đổi IP) sửa một phần, B20 (dọn bảng ARP mỗi 60 s) giữ nguyên vì lwIP không có lệnh xóa từng mục.
- Kiểm tra: biên dịch cú pháp ESP32 + ESP8266 (NON-OS) sạch, kể cả khi bật mọi cờ bảo mật; `make test` qua; file dùng chung giống hệt nhau. Chưa biên dịch được bản ESP8266 `SUPPORT_RTOS 1` (máy chưa có toolchain) và chưa thử trên phần cứng.
