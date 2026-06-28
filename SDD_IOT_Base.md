# Software Design Document (SDD)

## 1. Giới thiệu IoT cơ bản

### 1.1 IoT là gì?
IoT (Internet of Things) là cách kết nối các thiết bị vật lý với Internet để thu thập dữ liệu và điều khiển từ xa.

- Thiết bị có cảm biến, bộ xử lý và kết nối.
- Dữ liệu được gửi vào mạng hoặc đám mây.
- Người dùng hoặc hệ thống backend đọc dữ liệu và ra lệnh.

Ví dụ rất đơn giản:
- Cảm biến nhiệt độ gắn trong phòng, gửi giá trị lên mạng.
- Ứng dụng web nhận dữ liệu và hiển thị biểu đồ.
- Người dùng nhấn nút tắt/mở quạt từ xa.

### 1.2 Thành phần cơ bản của một hệ thống IoT

1. **Thiết bị cảm biến / điều khiển (Edge Device)**
   - Thường là module ESP32, Arduino, hoặc bo mạch tương tự.
   - Đọc giá trị từ cảm biến: nhiệt độ, độ ẩm, bụi, nút nhấn.
   - Điều khiển thiết bị: bật/tắt bơm, relay, đèn.

2. **Kênh truyền thông**
   - WiFi, MQTT, HTTP.
   - Đảm bảo dữ liệu truyền được an toàn và kịp thời.

3. **Máy chủ trung tâm (Server / Broker)**
   - Nhận thông tin từ thiết bị.
   - Lưu trữ lịch sử, xử lý trạng thái.
   - Cung cấp API cho giao diện và báo cáo.

4. **Ứng dụng hiển thị / điều khiển**
   - Web app, mobile app.
   - Hiển thị lịch sử sensor.
   - Gửi lệnh điều khiển.

### 1.3 Các luồng hoạt động cơ bản

Mô hình đơn giản của IoT:
- Thiết bị thu thập dữ liệu.
- Thiết bị gửi dữ liệu qua MQTT hoặc HTTP.
- Server tiếp nhận, lưu trữ hoặc phân tích.
- Người dùng tương tác qua web/app.
- Server truyền lệnh lại thiết bị.

Ví dụ thực tế:
- Cảm biến PM2.5 đo bụi mịn.
- Dữ liệu bụi gửi đến broker.
- Server phân tích nếu mức bụi cao.
- Ứng dụng thông báo hoặc tự động bật quạt.

### 1.4 IoT và dự án hiện tại

Dự án `IOT_base` là một hệ thống IoT hỗn hợp gồm:
- Firmware ESP32/Arduino trong thư mục `DeviceIOT/`
- Server Node.js và MQTT broker trong `mqttClient/`
- Frontend `admin/` và `web_manager/` phục vụ quản trị và hiển thị.

Điều quan trọng khi học IoT là hiểu rằng mỗi phần hoạt động cùng nhau:
- `DeviceIOT` là phần cứng.
- `mqttClient` là phần trung gian điều phối dữ liệu và lưu trữ.
- Các giao diện trình duyệt là nơi người dùng cuối tương tác.

## 2. Tổng quan project

### 2.1 Mục tiêu của project

Dự án này xây dựng một hệ thống IoT cơ bản cho việc:
- Đọc tín hiệu cảm biến môi trường.
- Điều khiển thiết bị qua lệnh từ xa.
- Lưu lịch sử và trạng thái thiết bị.
- Cho phép cấu hình thiết bị qua giao diện web tạm thời.

### 2.2 Các thành phần chính trong repository

1. `DeviceIOT/`
   - Firmware ESP32/Arduino.
   - Đọc cảm biến DHT11, cảm biến bụi PMS.
   - Kết nối WiFi, gửi dữ liệu MQTT.

2. `mqttClient/`
   - Server Node.js + MQTT broker Aedes.
   - API REST cho `history` và `status`.
   - Cấu hình MongoDB + MySQL.

3. `mqttBroker/`
   - File script đơn giản `MqttBroker1885.js`.
   - Dùng làm broker thử nghiệm nếu cần.

4. `admin/` và `web_manager/`
   - Frontend quản trị và web.
   - Không phải phần chính trong firmware, nhưng hỗ trợ giám sát.

### 2.3 Giải thích đơn giản từng thư mục

- `DeviceIOT/`: tương đương phần **thiết bị IoT**.
- `mqttClient/`: tương đương phần **server trung tâm + broker**.
- `mqttBroker/`: một broker đơn lẻ nếu cần chạy độc lập.
- `admin/`: giao diện web để quản trị người dùng, xem lịch sử.
- `web_manager/`: ứng dụng web lớn hơn cho quản lý tổng thể.

### 2.4 Mối quan hệ giữa các phần

`DeviceIOT` gửi dữ liệu đến broker thông qua MQTT.
- Server `mqttClient` xử lý đường dẫn MQTT.
- Server cũng cung cấp API web `GET /history`, `GET /status`.
- Data server có thể lưu vào MongoDB và MySQL.
- Frontend admin gọi API để hiển thị.

Trong thực tế, một thiết bị gửi dữ liệu 1 lần mỗi giây.
- Dữ liệu này có thể là nhiệt độ, độ ẩm, chỉ số bụi.
- Khi người dùng nhấn nút trong web, lệnh sẽ đi qua MQTT về `DeviceIOT`.

## 3. Kiến trúc hệ thống

### 3.1 Tổng quan kiến trúc

Dự án có thể phân thành 5 layer:

1. Thiết bị (Edge Device)
2. Kênh truyền thông (Communication Layer)
3. Broker / Server xử lý (Middleware)
4. Lớp lưu trữ và API
5. Giao diện người dùng

```
[DeviceIOT] -> [WiFi] -> [MQTT Broker/Server] -> [Database/API] -> [Frontend]
```

### 3.2 Layer 1: Edge Device

Đây là phần firmware chạy trên ESP32.
- Thư mục: `DeviceIOT/`
- Các module chính:
  - `DeviceIOT.ino`: entry point.
  - `TaskSensor.*`: đọc cảm biến.
  - `TaskDevice.*`: điều khiển relay nút.
  - `TaskNetWork.*`: WiFi, MQTT và web config.
  - `NetWork_Wifi.*`: quản lý kết nối WiFi, hosting web cấu hình, OTA.
  - `NetWork_Mqtt.*`: quản lý kết nối MQTT và gửi/nhận dữ liệu.

#### Giải thích dễ hiểu
Thiết bị giống như một robot nhỏ:
- Nó đọc nhiệt độ và độ ẩm.
- Nó đọc chỉ số bụi PM.
- Nó giữ trạng thái hiện tại của relay.
- Nó có thể nhận lệnh bật/tắt.

### 3.3 Layer 2: Communication Layer

Project dùng WiFi và MQTT.
- `NetWork_Wifi.cpp` khởi tạo WiFi, kiểm tra kết nối, hỗ trợ host AP để cấu hình.
- `NetWork_Mqtt.cpp` dùng `PubSubClient` để gửi và nhận bản tin MQTT.

#### Cụ thể
- `Settings.subcribe_topic`: topic thiết bị gửi dữ liệu.
- `MqttClient.connect(...)`: kết nối tới broker.
- `MqttDataCallback(...)`: callback khi nhận lệnh từ broker.

### 3.4 Layer 3: Broker / Middleware

Server Node.js trong `mqttClient/` chứa broker Aedes và API.

- `server.js`: khởi tạo Express + Aedes broker.
- `mqtt/index.js`: xử lý sự kiện MQTT client connect/disconnect.

Broker nhận MQTT message từ thiết bị.
- Có thể phát đi các client khác.
- Aedes hỗ trợ MQTT qua websocket.

### 3.5 Layer 4: Lưu trữ và API

Các file API trong `mqttClient/routes/` và `controllers/` cung cấp:
- `GET /history`
- `GET /history/:id`
- `POST /history`
- `GET /status`
- `PUT /status/:id`
- `POST /status`

Server dùng MongoDB và MySQL.
- `.env` chứa `APP_MONGO`, `DB_CLIENT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`.
- `config/express.js` cấu hình middleware.

### 3.6 Layer 5: Giao diện người dùng

Các thành phần frontend không phải là trọng tâm nhưng có thể dùng API để hiển thị.
- `admin/` chứa React app quản trị.
- `web_manager/` có các cấu trúc server quản lý khác.

### 3.7 Phân tầng trong firmware (DeviceIOT)

Trong `DeviceIOT/` có thể thấy 3 phần tương tự `core`, `commu`, `driver`:

- `core`: `TaskSensor`, `TaskDevice`, `TaskNetWork` là lõi xử lý.
- `commu`: `NetWork_Wifi`, `NetWork_Mqtt` chịu trách nhiệm giao tiếp.
- `driver`: Các driver cảm biến như DHT, PMS, UART, GPIO.

> Lưu ý: repository này không chứa thư mục `core/`, `commu/`, `driver/` theo đúng yêu cầu, nhưng các chức năng tương đương được triển khai trong `DeviceIOT/`.

## 4. Data flow chi tiết

### 4.1 Luồng dữ liệu chính trong firmware

Dữ liệu đi theo thứ tự sau:

1. `DeviceIOT.ino` chạy `setup()`.
2. `taskSensor.setup()` khởi tạo cảm biến.
3. `taskDevice.setup()` khởi tạo chân input/output.
4. `task_NetWork.setup()` khởi tạo WiFi + MQTT.
5. Vòng lặp `loop()` gọi `taskRun()` hoặc RTOS task.
6. `TaskSensor::taskRun()` đọc giá trị sensor từng giây.
7. `TaskNetWork::loopNetWork()` gửi dữ liệu qua MQTT nếu kết nối.
8. `TaskDevice::taskRun()` đọc nút nhấn và thay đổi relay.
9. Nếu có lệnh đến, `MqttDataCallback()` chuyển lệnh vào hàng đợi.

### 4.2 Ví dụ cụ thể: từ cảm biến đến server

1. `TaskSensor::readSensorTemp()` đọc `DHT.readTemperature()`.
2. `TaskSensor::readSensorHumi()` đọc `DHT.readHumidity()`.
3. `TaskSensor::readSensorDust()` đọc PMS.
4. `getInfoDevice(sensorValue, statusDevice)` tạo JSON:

```json
{"data":2,"va":"4500,2300,10,12,20,30,0","co":"1,0,0,0"}
```

5. `NetWork_Mqtt::sendMessageInfoPublish(...)` publishes JSON lên `Settings.subcribe_topic`.
6. Broker Aedes nhận bản tin.
7. Node server có thể lưu bản tin, cập nhật trạng thái.
8. Frontend gọi API để xem dữ liệu.

### 4.3 Từng bước truyền dữ liệu

#### 4.3.1 Thiết bị thu thập dữ liệu

- `TaskSensor::taskRun()` chạy mỗi giây.
- Mỗi lần có `sensorReadStep` từ 0 đến 3, nó chọn hàm đọc tương ứng.
- Dữ liệu được cập nhật vào `dataSensor`.
- Dữ liệu được lưu trong `MemoryData::GetInstance().sensorData_` hoặc gửi queue.

#### 4.3.2 Tạo payload JSON

`getInfoDevice()` tạo 2 trường:
- `va`: giá trị sensor.
- `co`: trạng thái thiết bị.

Ví dụ thực tế:
- `va` = "4500,2300,10,12,20,30,0"
  - tức là độ ẩm 45.00%, nhiệt độ 23.00°C, bụi 10, bụi PM2.5=12, PM10=20, PM1=30, control=0.
- `co` = "1,0,0,0"
  - thiết bị đang bật, chưa nhấn nút, chưa có sự kiện.

#### 4.3.3 Gửi dữ liệu lên MQTT

`sendMessageInfoPublish(...)` thực hiện:

```cpp
if (MqttClient.publish(Settings.subcribe_topic, p, 1)) {
    // thành công
}
```

- `Settings.subcribe_topic` là topic đã đọc từ EEPROM.
- QoS = 1 đảm bảo ít nhất 1 lần gửi.

#### 4.3.4 Broker xử lý

Broker Aedes trong `mqttClient/server.js` chạy cùng Express.
- Websocket MQTT được mở tại cổng `app.get('port')`.
- Các client MQTT có thể subscribe/publish.

### 4.4 Luồng điều khiển từ server đến thiết bị

1. Người dùng gửi lệnh qua web hoặc MQTT client.
2. Server publish message lên topic lệnh.
3. `NetWork_Mqtt::MqttDataCallback()` được gọi khi thiết bị nhận tin.
4. Lệnh được chuyển thành `DeviceCommand cmd`.
5. Nếu `cmd.commandType == COMMAND_TYPE_CONTROL` thì lệnh được gửi vào queue `deviceCommandQueue`.
6. `TaskDevice::taskRun()` đọc queue và thay đổi `control.device_port`.
7. Thiết bị bật/tắt relay.

### 4.5 Xử lý khi mất kết nối

`TaskNetWork.cpp` có nhiều hàm kiểm tra:
- `checkNetWorkInConnect()`
- `checkNetWorkDisconnect()`
- `checkNetWorkReConnect()`
- `checkNetWorkRealTimeServer()`
- `checkMQTTConnect()`

Nó cố gắng: 
- ping mạng
- reconnect MQTT
- restart WiFi nếu cần.

### 4.6 Luồng dữ liệu cấu hình WiFi

Khi thiết bị chưa có cấu hình, nó có thể vào nhiều chế độ:
- `WIFI_START_CONNECT`: kết nối WiFi bình thường.
- `WIFI_BLE_PROVISION`: cấu hình qua BLE.
- `WIFI_SMART_CONFIG`: cấu hình qua SmartConfig.
- `WIFI_BLE_SMART_CONFIG`: kết hợp BLE và SmartConfig.
- `WIFI_START_OTA`: cập nhật OTA.
- mặc định: host post mode dùng AP tạm thời.

## 5. Phân tích từng module trong code

### 5.1 Module `core` (tương đương)

Repository không có thư mục `core/`, nhưng phần tương đương là:
- `TaskSensor.*`
- `TaskDevice.*`
- `TaskNetWork.*`
- `MemoryData.h`
- `Common.*`

Đây là lõi xử lý chức năng thiết bị.

#### 5.1.1 `TaskSensor` - lõi đọc cảm biến

`TaskSensor.h` và `TaskSensor.cpp` quản lý các hành vi:
- `setup()`: khởi tạo DHT và Serial.
- `readSensorDust()`: đọc dữ liệu bụi từ cảm biến PMS.
- `readSensorTemp()`: đọc nhiệt độ.
- `readSensorHumi()`: đọc độ ẩm.
- `taskRun()`: chạy theo vòng lặp RTOS hoặc không RTOS.

Các bước cụ thể:
- Ban đầu `dataSensor` được đặt về 0.
- DHT bắt đầu với `dht.begin()`.
- `Serial1.begin(9600)` khởi tạo cổng UART cho PMS.
- Mỗi giây, `taskRun()` chọn hàm đọc dữ liệu theo `sensorReadStep`.

#### 5.1.2 `TaskDevice` - điều khiển thiết bị

`TaskDevice` quản lý:
- `setup()`: khởi tạo chân vào/ra.
- `readButton()`: đọc nút nhấn với debounce và longpress.
- `controlPump()`: điều khiển bơm.
- `controlDevice()`: điều khiển thiết bị khác.
- `taskRun()`: phát hiện thay đổi và xử lý lệnh.

Quan trọng:
- Nút nhấn được cấu hình `INPUT_PULLUP`.
- `buttonState` là trạng thái chân.
- Nếu nhấn lâu >= 3 giây thì toggle `device_port`.

#### 5.1.3 `TaskNetWork` - điều phối mạng

`TaskNetWork` là điểm trung gian giữa sensor/device và mạng.
- `setup()`: đọc chế độ WiFi, khởi tạo EEPROM, WiFi/MQTT.
- `loopNetWork()`: kiểm tra trạng thái và gọi các hàm reconnect.
- `taskRun()`: gọi `loopNetWork()` liên tục.

`TaskNetWork::setup()` chứa logic quan trọng:
- Đọc `modeStatus` từ EEPROM.
- Nếu `WIFI_START_CONNECT`, kết nối WiFi và MQTT.
- Nếu chế độ khác, chuyển sang cấu hình hoặc OTA.

### 5.2 Module `commu` (tương đương)

Repository cũng không có thư mục `commu/`, nhưng phần giao tiếp nằm trong:
- `NetWork_Wifi.*`
- `NetWork_Mqtt.*`

#### 5.2.1 `NetWork_Wifi` - giao tiếp WiFi và web config

Nhiệm vụ:
- Kết nối WiFi với AP hoặc STA.
- Khởi tạo web server để cấu hình.
- Quản lý OTA qua HTTP.

Các chức năng quan trọng:
- `startWebServer()`: cấu hình các route `/control`, `/update`.
- `startWebserverRoot()`: cấu hình route `/` và `/setup`.
- `handleSetUp()`: nhận dữ liệu cấu hình từ web và ghi vào EEPROM.
- `handleControl()`: nhận lệnh điều khiển từ web và chuyển vào queue.
- `setupHostPost()`: thiết lập chế độ access point để cấu hình.
- `setupOTA()`: kiểm tra phiên bản và tải firmware mới.

#### 5.2.2 `NetWork_Mqtt` - giao tiếp MQTT

Nhiệm vụ:
- Kết nối tới broker.
- Publish dữ liệu sensor.
- Subscribe và nhận lệnh.
- Reconnect khi mất kết nối.

Các chức năng quan trọng:
- `setupInfoMQTT()`: thiết lập callback và server.
- `sendMessageInfo()`: publish JSON.
- `MqttDataCallback()`: xử lý message nhận được.
- `MqttReconnect()`: cố gắng kết nối lại broker.

### 5.3 Module `driver` (tương đương)

Mặc dù không có `basedrv.go` và `genericdrv.go`, phần driver thực tế gồm:
- DHT sensor driver (`DHT.h`, `dht.readTemperature()`...
- PMS sensor driver (`PMS.h`, `pms.read(data)`).
- GPIO và UART driver thông qua `driver/uart.h`, `driver/gpio.h`.
- EEPROM/Memory driver trong `Memory.h` và `MemoryData.h`.

#### 5.3.1 Driver cảm biến DHT11

`DHT dht(DHTPIN, DHTTYPE)` khởi tạo cảm biến nhiệt độ/độ ẩm.
- `dht.readTemperature()` trả về độ C.
- `dht.readHumidity()` trả về độ ẩm %.

#### 5.3.2 Driver cảm biến bụi PMS

`PMS pms(Serial)` dùng UART để giao tiếp.
- Hàm `pms.read(data)` đọc dữ liệu cảm biến.
- Giải mã các giá trị PM1.0, PM2.5, PM10.

#### 5.3.3 Driver GPIO và relay

Trong `TaskDevice`:
- `pinMode(OUTPUT_PUMP, OUTPUT)` và `digitalWrite()` điều khiển.
- `digitalRead(BUTTON_PIN)` đọc nút nhấn.

#### 5.3.4 Driver EEPROM / Memory

`Memory` là lớp singleton lưu trữ thông tin cấu hình:
- `readChar()`, `writeChar()` cho chế độ.
- `writeString()` ghi JSON WiFi/MQTT.
- `readString()` đọc cấu hình từ EEPROM.

### 5.4 Phân tích các file phụ trợ

#### 5.4.1 `MemoryData.h`

Lớp singleton chứa các con trỏ dữ liệu dùng chung giữa task:
- `InfoSensor *sensorData_`
- `InfoDeviceControl *deviceStatus_`
- `DeviceCommand *deviceCommand_`

Nó cho phép các task chia sẻ trạng thái mà không cần truyền tham số.

#### 5.4.2 `Common.h` và `Common.cpp`

Định nghĩa cấu trúc dữ liệu chung và hàm `getInfoDevice(...)`.
- `InfoSensor`: giữ giá trị cảm biến.
- `InfoDeviceControl`: giữ trạng thái điều khiển.
- `DeviceCommand`: thông tin lệnh từ MQTT/Web.

Hàm `getInfoDevice()` tạo chuỗi JSON dùng cho MQTT và HTTP.

### 5.5 Mô tả các module server MQTT

Server Node.js trong `mqttClient/` chứa các loại module:
- `config/`: cấu hình Express, database, swagger.
- `routes/`: định nghĩa API.
- `controllers/`: xử lý logic API.
- `mqtt/`: xử lý broker Aedes.
- `app/`: nếu có thêm app logic.

#### 5.5.1 `server.js`

Khởi tạo:
- Express app.
- Kết nối Mongoose.
- Routes API.
- MQTT broker Aedes.
- Websocket stream for MQTT.

#### 5.5.2 `mqtt/index.js`

Xử lý sự kiện MQTT broker.
- `client` connect/disconnect.
- `published` event để debug.

#### 5.5.3 `routes/history.route.js`

Cung cấp API lịch sử.
- `GET /history`
- `GET /history/:id`
- `POST /history`
- `PUT /history/:id`
- `DELETE /history/:id`

#### 5.5.4 `routes/chat.route.js` và `controllers/chat.controller.js`

Đây là phần mở rộng nếu hệ thống dùng MQTT để chat hoặc gửi thông báo.
Nó không phải phần cốt lõi IoT nhưng cho thấy server có thể mở rộng được.

## 6. Giải thích từng function quan trọng

### 6.1 `setup()` trong `DeviceIOT.ino`

Đây là hàm khởi tạo duy nhất khi thiết bị bật lên.
Nó thực hiện:
- `Serial.begin(115200);`
- `taskDevice.setup();`
- `taskSensor.setup();`
- `task_NetWork.setup();`
- tạo RTOS tasks nếu `SUPPORT_RTOS`.

Giải thích cho người mới:
- `Serial.begin` để in log debug qua USB.
- `setup()` chỉ chạy một lần.
- `loop()` chạy mãi mãi.

### 6.2 `loop()` trong `DeviceIOT.ino`

Nếu `SUPPORT_RTOS` = false, `loop()` gọi tuần tự `taskRun()` của 3 module.
Nếu RTOS = true, mỗi module chạy độc lập.

Điều này giúp người mới hiểu:
- `setup()` chuẩn bị.
- `loop()` là vòng đời thiết bị.

### 6.3 `TaskSensor::taskRun(void * parameter)`

Hàm này là trái tim đọc cảm biến.
- Nó duy trì `sensorReadStep` từ 0 đến 3.
- Mỗi bước chọn một cảm biến khác nhau.
- Mỗi 1 giây, thiết bị cập nhật giá trị.

Ví dụ:
- Bước 0: đọc dữ liệu bụi.
- Bước 1: đọc nhiệt độ.
- Bước 2: đọc độ ẩm.

### 6.4 `TaskDevice::readButton()`

Xử lý debounce để tránh sai trạng thái khi nút bị rung.

Logic:
- So sánh `reading` hiện tại với lần đọc trước.
- Nếu khác, reset `lastDebounceTime`.
- Sau 50ms ổn định, quyết định trạng thái mới.
- Nếu nút nhấn lâu hơn 3 giây thì toggle trạng thái.

Cho người mới, đây là cách cơ bản để đọc một nút an toàn.

### 6.5 `NetWork_Wifi::handleSetUp()`

Hàm này xử lý khi người dùng gửi cấu hình WiFi qua web.

Nó thực hiện:
- `String data = webServer->arg("data");`
- `deserializeJson(jsonBuffer, data);`
- `Memory::GetInstance()->writeString(WIFI_SETUP_JSON,data);`
- `Memory::GetInstance()->writeChar(WIFI_MODE,WIFI_BLE_SMART_CONFIG);`
- `ESP.restart();`

Vì vậy, khi người dùng cấu hình xong, thiết bị ghi JSON cấu hình vào EEPROM và reset lại.

### 6.6 `NetWork_Wifi::handleControl()`

Hàm này nhận lệnh điều khiển từ HTTP.

Nó đọc:
- `cmd.commandType` từ `webServer->arg("com")`
- `cmd.commandValue` từ `webServer->arg("value")`

Sau đó đẩy lệnh vào queue.

Điều này cho phép điều khiển thiết bị từ trình duyệt.

### 6.7 `MqttDataCallback()` trong `NetWork_Mqtt.cpp`

Hàm này xử lý mọi message đến từ broker.

Nó làm:
- parse JSON payload.
- đọc `com` và `value`.
- Nếu `com == 0x02`, gửi phản hồi trạng thái thiết bị.
- Nếu `com == 0x01`, đẩy lệnh điều khiển.

Ví dụ message nhận được:
```json
{"com":1,"value":2}
```
Điều này có thể bật relay số 2.

### 6.8 `NetWork_Mqtt::sendMessageInfo(char * data)`

Hàm này gửi dữ liệu lên broker.

Giải thích: `publish(topic, data, 1)`.
- Topic dùng `Settings.subcribe_topic`.
- Dữ liệu là JSON được tạo bởi `getInfoDevice()`.

### 6.9 `server.js` trong `mqttClient/`

Hàm này là entry point server Node.js.

Nó thực hiện:
- `const app = require('./config/express.js');`
- `const routes = require('./routes/index.js');`
- Kết nối MongoDB.
- `app.use('/api', routes);`
- Tạo HTTP server và websocket MQTT.

Cho người mới:
- `Express` là framework web.
- `Aedes` là MQTT broker.

### 6.10 `mqtt/index.js`

Trong module này, broker Aedes lắng nghe:
- `client` kết nối.
- `clientDisconnect` ngắt kết nối.
- `published` khi message được publish.

Đây là nơi có thể mở rộng xử lý sự kiện MQTT.

## 7. Tutorial

### 7.1 Build project

#### 7.1.1 Build firmware `DeviceIOT`

1. Mở Arduino IDE hoặc PlatformIO.
2. Chọn board ESP32 tương ứng.
3. Mở file `e:\ManagerProject\IOT_base\DeviceIOT\DeviceIOT.ino`.
4. Đảm bảo thư viện có:
   - `PubSubClient`
   - `ArduinoJson`
   - `WiFi`
   - `DHT`
   - `PMS`
   - `WiFiProv` (nếu dùng provisioning)
5. Biên dịch (`Verify`).
6. Nạp (`Upload`) lên board.

Lưu ý: Project sử dụng ESP32 nên cần cài board ESP32 trong Arduino IDE.

#### 7.1.2 Build server Node.js

1. Mở terminal vào `e:\ManagerProject\IOT_base\mqttClient`.
2. Chạy `npm install`.
3. Đảm bảo MongoDB và MySQL đang chạy nếu cần.
4. Tùy chọn: cấu hình `.env` theo môi trường.

#### 7.1.3 Build frontend admin

Nếu muốn chạy `admin/` hoặc `web_manager/`, cần xem `package.json` tương ứng.
- `admin/` có thể dùng `npm install` và `npm start`.
- `web_manager/` có thể là Node app riêng.

### 7.2 Run project

#### 7.2.1 Chạy MQTT server

1. Vào `mqttClient/`.
2. Chạy `npm start`.
3. Kiểm tra console hiển thị `server listening on port 3002`.

#### 7.2.2 Kết nối thiết bị

1. Thiết bị ESP32 bật lên.
2. `TaskNetWork::setup()` đọc chế độ WiFi từ EEPROM.
3. Nếu có cấu hình, thiết bị kết nối WiFi.
4. Thiết bị khởi tạo MQTT và gửi dữ liệu.

#### 7.2.3 Kiểm tra log và dữ liệu

- Trên Arduino Serial Monitor xem log.
- Trên server, xem console Node.js.
- Dùng MQTT client để subscribe topic nếu muốn.

### 7.3 Thêm device mới

Trong hệ thống này, thêm device mới có thể hiểu theo hai cách:

#### 7.3.1 Thêm thiết bị vào firmware

Nếu muốn thêm một cảm biến hoặc relay:
1. Định nghĩa chân GPIO mới trong `TaskDevice.cpp`.
2. Khởi tạo `pinMode`.
3. Viết hàm `controlDeviceX()` và gọi trong `taskRun()`.
4. Mở rộng `InfoDeviceControl` nếu cần lưu trạng thái mới.
5. Mở rộng `getInfoDevice()` để gửi thêm thông tin.

Ví dụ:
```cpp
#define OUTPUT_DEVICE_2 25

void TaskDevice::controlDevice2() {
  if ((control.device_port | 0x04) == 0x04) {
    digitalWrite(OUTPUT_DEVICE_2, HIGH);
  } else {
    digitalWrite(OUTPUT_DEVICE_2, LOW);
  }
}
```

#### 7.3.2 Thêm thiết bị vào server

Nếu server muốn nhận thêm trạng thái mới:
1. Xây dựng model dữ liệu mới trong `mqttClient/app/models`.
2. Cập nhật controller tương ứng.
3. Thêm route trong `routes/index.js`.
4. Cập nhật frontend để hiển thị.

### 7.4 Ví dụ cấu hình WiFi/MQTT

Dữ liệu cấu hình được gửi tới route `/setup`.
- `WIFI_SETUP_JSON` lưu cấu hình MQTT/WiFi.
- Điền JSON tương tự:
```json
{
  "mqtt_host": "mqtt.airsense.vn",
  "mqtt_port": 1885,
  "mqtt_client": "esp32-device",
  "mqtt_user": "test",
  "mqtt_pwd": "testadmin",
  "public_topic": "device/data",
  "subcribe_topic": "device/command",
  "mqtt_grptopic": "device/group",
  "web_password": "1234"
}
```

### 7.5 Debug từng bước

- Nếu thiết bị không kết nối WiFi: kiểm tra SSID/Password, log Serial.
- Nếu không kết nối MQTT: kiểm tra broker, port, user/pass.
- Nếu không nhận lệnh: kiểm tra `MqttDataCallback()` và topic.

## 8. Ví dụ thực tế: sensor → server

### 8.1 Tình huống thực tế

Hệ thống giám sát chất lượng không khí.
- Sensor DHT11 đo nhiệt độ, độ ẩm.
- Sensor PMS đo bụi PM1.0/PM2.5/PM10.
- Thiết bị ESP32 gửi dữ liệu mọi giây.
- Server lưu lịch sử và hiển thị biểu đồ.

### 8.2 Luồng dữ liệu cụ thể

1. `TaskSensor` đọc `valueTemp` = 23.00°C.
2. `TaskSensor` đọc `valueHumi` = 45.00%.
3. `TaskSensor` đọc `valueDust_PM2_5` = 12.
4. `getInfoDevice()` tạo JSON.
5. `NetWork_Mqtt::sendMessageInfoPublish()` publish lên MQTT.

Payload gửi một ví dụ:
```json
{"data":2,"va":"4500,2300,10,12,20,30,0","co":"1,0,0,0"}
```

### 8.3 Phân tích payload

- `data`: chỉ số loại thông điệp.
- `va`: chuỗi chứa giá trị sensor.
   - 4500 → 45.00% độ ẩm.
   - 2300 → 23.00°C nhiệt độ.
   - 10 → giá trị bụi tổng.
   - 12 → PM2.5.
   - 20 → PM10.
   - 30 → PM1.
   - 0 → control value.
- `co`: trạng thái điều khiển.
   - 1 → thiết bị đang bật.
   - 0 → nút nhấn chưa tác động.
   - 0 → button_status.
   - 0 → count info.

### 8.4 Server tiếp nhận dữ liệu

Trong `mqttClient`, broker Aedes sẽ nhận bản tin.
- Nếu mở rộng, bạn có thể thêm listener để lưu vào MongoDB.
- Hiện tại server chỉ thiết lập broker và API.

### 8.5 Ứng dụng thực tế

Ví dụ một dashboard có thể:
- Hiển thị nhiệt độ/độ ẩm.
- Vẽ biểu đồ PM2.5 theo thời gian.
- Cảnh báo khi giá trị bụi vượt ngưỡng.
- Cho phép tắt/mở bơm từ xa.

## 9. Best practice

### 9.1 Thiết kế firmware

- Tách rõ `setup()` và `loop()`.
- Dùng task để chia nhỏ chức năng.
- Không xử lý nặng trong `loop()`.
- Dùng `queue` hoặc `MemoryData` để chia sẻ trạng thái.
- Đảm bảo những hàm I/O không block quá lâu.
- Kiểm tra lỗi parse JSON.

### 9.2 Cấu hình và lưu trữ

- Lưu cấu hình vào EEPROM.
- Khởi động lại thiết bị sau khi thay đổi cấu hình.
- Dùng JSON chuẩn để cấu hình WiFi/MQTT.

### 9.3 Kênh giao tiếp

- Sử dụng MQTT cho IoT realtime.
- Dùng QoS 1 hoặc 2 nếu cần độ tin cậy.
- Kiểm tra kết nối định kỳ.
- Giải quyết reconnect nhanh.

### 9.4 Server brokers và API

- Giữ broker đơn giản và nhẹ.
- Dùng `Express` để tách API khỏi broker.
- Tách `routes` và `controllers` rõ ràng.
- Cấu hình môi trường trong `.env`.

### 9.5 Quản lý lỗi

- In log chi tiết khi lỗi.
- Trên firmware, dùng `Serial.println()`.
- Trên Node, dùng `console.log()`.
- Ghi lại lỗi và trạng thái reconnect.

### 9.6 Bảo mật cơ bản

- Không để mật khẩu MQTT/DB cứng trong mã nguồn.
- Dùng `.env` để bảo mật.
- Nếu có thể, dùng TLS cho MQTT.
- Dùng cơ chế xác thực API nếu mở rộng.

### 9.7 Mở rộng module

- Nếu thêm cảm biến mới, giữ cấu trúc:
  - `TaskSensor` mở rộng bước đọc.
  - `InfoSensor` thêm trường.
  - `getInfoDevice()` mở rộng JSON.
- Nếu thêm device, mở rộng `InfoDeviceControl`.
- Nếu thêm API, viết route/controller mới.

## 10. Các lỗi thường gặp

### 10.1 Firmware không khởi động

- Kiểm tra board ESP32.
- Chọn đúng cổng COM.
- Đảm bảo chọn đúng loại board trong IDE.

### 10.2 Không kết nối WiFi

- Kiểm tra SSID/Password.
- Nếu thiết bị ở chế độ AP để cấu hình, mở điện thoại kết nối SSID `setup_now`.
- Kiểm tra log Serial có báo lỗi.

### 10.3 Không kết nối MQTT

- Kiểm tra broker đang chạy.
- Kiểm tra host/port trong JSON cấu hình.
- Kiểm tra user/pass.
- Nếu dùng `APP_MQTT` từ `.env`, đảm bảo broker có thể truy cập.

### 10.4 Không nhận lệnh điều khiển

- Kiểm tra topic publish/subscribe giống nhau.
- Kiểm tra `MqttDataCallback()` có parse JSON đúng.
- Kiểm tra `deviceCommandQueue` có nhận lệnh.

### 10.5 Dữ liệu sai định dạng JSON

- `getInfoDevice()` tạo chuỗi `va` và `co` bên trong JSON.
- Nếu format không đúng, server hoặc client sẽ parse sai.
- Luôn dùng `serializeJson()` từ ArduinoJson.

### 10.6 Queue bị đầy hoặc mất dữ liệu

- `xQueueSend()` có timeout 50 ms.
- Nếu hệ thống quá tải, có thể mất lệnh.
- Cần kiểm tra return value để biết đã gửi thành công.

### 10.7 Lỗi phần cứng cảm biến

- DHT11 có thể đọc sai nếu dây kém.
- PMS dùng UART cần dây TX/RX đúng.
- Kiểm tra nguồn cấp đủ 5V/3.3V.

### 10.8 Lỗi server Node.js

- `npm install` thất bại do quyền.
- MongoDB không chạy.
- `.env` sai cấu hình.

### 10.9 Lỗi frontend

- API trả lỗi 404 nếu route chưa khởi tạo.
- Nếu dùng `admin/`, cần kiểm tra cổng và đường dẫn.

## 11. Ghi chú đặc thù dự án

### 11.1 Không có Go trong repository

Mặc dù yêu cầu nhắc đến Golang, repository hiện tại không chứa file `.go`.
- Dự án chính là C++ cho ESP32 và Node.js cho server.
- Do đó, SDD này tập trung vào nội dung hiện có.

### 11.2 Mối tương quan với `core/`, `commu/`, `driver/`

Để phù hợp cấu trúc yêu cầu, ta có thể map như sau:
- `core/` tương đương `DeviceIOT/Task*.cpp`.
- `commu/` tương đương `DeviceIOT/NetWork_*`.
- `driver/` tương đương các thư viện cảm biến và `Memory`.

### 11.3 Hướng phát triển tiếp theo

- Tách plugin broker thành dịch vụ độc lập.
- Thêm xác thực MQTT.
- Lưu log sensor vào cơ sở dữ liệu.
- Xây dựng frontend dashboard đồ họa.
- Nâng cấp OTA tự động.

## 12. Kết luận

Dự án này là một ví dụ IoT kết hợp firmware ESP32 và server Node.js.
Nó cho phép người mới thấy được toàn bộ chuỗi:
- đọc sensor,
- gửi dữ liệu,
- điều khiển từ xa,
- xây dựng API.

Toàn bộ project vẫn còn nhiều chỗ cải tiến, nhưng cấu trúc cơ bản đã đủ để bắt đầu một hệ thống IoT.

## 13. Hướng dẫn debug firmware chi tiết

### 13.1 Chuẩn bị môi trường debug

Trước khi bắt đầu debug, bạn cần:
- Arduino IDE hoặc PlatformIO đã cài đặt.
- Board ESP32 được thêm vào.
- Cổng COM chính xác.
- Library cần thiết: `PubSubClient`, `ArduinoJson`, `DHT`, `PMS`, `WiFiProv`.

### 13.2 Các bước debug cơ bản

1. Mở `DeviceIOT.ino` trong Arduino IDE.
2. Chọn đúng board ESP32 ở `Tools > Board`.
3. Chọn cổng COM ở `Tools > Port`.
4. Mở Serial Monitor ở `115200` baud.
5. Xem log khi thiết bị khởi động.

### 13.3 Kiểm tra log trong `setup()`

Phần `setup()` in ra trạng thái khởi tạo. Nếu thiết bị không vào được `setup`, có thể do:
- Board chưa đọc được.
- Không cắm nguồn.
- Code lỗi biên dịch.

### 13.4 Kiểm tra WiFi

Trong `TaskNetWork::setup()`:
- `modeStatus = Memory::GetInstance()->readChar(MODE_WIFI_ADRESS);`
- `netWork_Wifi.connectWifi();`
- `netWork_Wifi.checkWifi()`.

Nếu `checkWifi()` trả về `WL_CONNECTED`, thiết bị đã kết nối thành công.

Nếu không, debug:
- Xem `Serial.println()` của `connectWifi()`.
- Kiểm tra SSID/Password lưu trong EEPROM.
- Nếu chế độ host post, thiết bị sẽ tạo AP để cấu hình.

### 13.5 Kiểm tra MQTT

Trong `TaskNetWork::setup()`:
- `netWork_Mqtt.getAllDataSetup();`
- `netWork_Mqtt.setupInfoMQTT();`
- `netWork_Mqtt.checkStatusMqtt();`

Nếu MQTT không connect:
- Kiểm tra broker có chạy không.
- Kiểm tra host/cổng trong cấu hình.
- Kiểm tra tài khoản MQTT.

### 13.6 Debug luồng dữ liệu cảm biến

- `TaskSensor::taskRun()` đọc giá trị sensor từng giây.
- Nếu `sensorReadStep` không tăng, có thể stuck trong `delay()`.
- Kiểm tra dữ liệu `valueTemp`, `valueHumi`, `valueDust_PM2_5`.

### 13.7 Debug điều khiển thiết bị

- `TaskDevice::readButton()` xử lý debounce.
- Nếu nút không hoạt động, kiểm tra chân `BUTTON_PIN`.
- Nếu relay không bật/tắt, kiểm tra chân `OUTPUT_PUMP` và `OUTPUT_DEVICE_1`.

### 13.8 Debug queue và lệnh MQTT

- `DeviceCommand cmd` được tạo trong `MqttDataCallback()`.
- Nếu `xQueueSend(deviceCommandQueue, &cmd, 50)` không thành công, queue có thể đầy.
- Kiểm tra `deviceCommandQueue` được tạo đúng cách.

## 14. Giải thích chi tiết `TaskNetWork.cpp`

### 14.1 File bao gồm những gì

`TaskNetWork.cpp` là trung tâm quản lý mạng và trạng thái.
Các file include:
- `NetWork_Wifi.h`
- `NetWork_Mqtt.h`
- `NetWork_config.h`
- `Memory.h`
- `driver/uart.h`
- `Common.h`
- `define_All.h`

Nó còn dùng `QueueHandle_t` cho RTOS.

### 14.2 `setupUART()`

Hàm khởi tạo UART cho việc debug và giao tiếp với các thiết bị ngoại vi.

```cpp
void setupUART(void){
  uart_config_t uart_config = {
    .baud_rate = 115200,
    .data_bits = UART_DATA_8_BITS,
    .parity    = UART_PARITY_DISABLE,
    .stop_bits = UART_STOP_BITS_1,
    .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
    .source_clk = UART_SCLK_APB,
  };
  uart_param_config(UART_NUM, &uart_config);
  uart_set_pin(UART_NUM, TXD_PIN, RXD_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
  uart_driver_install(UART_NUM, BUF_SIZE * 2, 0, 0, NULL, 0);
  const char* start_msg = "ESP32 UART0 đã khởi động!\n";
  uart_write_bytes(UART_NUM, start_msg, strlen(start_msg));
}
```

Giải thích:
- `UART_NUM_0` trên ESP32 là cổng UART chính.
- `TXD_PIN` và `RXD_PIN` xác định chân truyền nhận.
- `uart_driver_install` cài buffer RX.

### 14.3 `updateStatusUART()`

Hàm này đọc dữ liệu UART nếu có.

```cpp
void updateStatusUART(void){
  uint8_t data[BUF_SIZE];
  int len = uart_read_bytes(UART_NUM, data, BUF_SIZE, 100 / portTICK_PERIOD_MS);
  if (len > 0) {
    data[len] = '\0';
    Serial.print("Đã nhận: ");
    Serial.println((char*)data);
  }
}
```

Nó có thể dùng để giám sát dữ liệu đem về từ module ngoài.

### 14.4 `getRTCInfo()`

Hàm này tính toán thời gian từ `millis()` và cập nhật timestamp.
Nó đảm bảo không bị tràn số khi `millis()` vượt 32-bit.

### 14.5 `TaskNetWork::setup()`

Đây là phần quan trọng nhất.

Các bước thực hiện:
1. `Memory::GetInstance()->initEEPROM(2048);`
2. `modeStatus = Memory::GetInstance()->readChar(MODE_WIFI_ADRESS);`
3. Gọi các hàm kết nối WiFi/MQTT theo `modeStatus`.

Nếu `modeStatus == WIFI_START_CONNECT`:
- Kết nối WiFi.
- Lấy timestamp mạng.
- Bắt đầu web server.
- Tạo queue cho RTOS.
- Thiết lập MQTT.
- Gửi message `mqtt` lên broker.
- Gọi `setupUART()`.

Nếu `modeStatus == WIFI_BLE_PROVISION`:
- Bắt đầu provisioning BLE.

Nếu `modeStatus == WIFI_SMART_CONFIG`:
- Bắt đầu SmartConfig.

Nếu `modeStatus == WIFI_START_OTA`:
- Thiết lập OTA.

Nếu không có chế độ nào:
- Khởi tạo host AP tạm thời để cấu hình.

### 14.6 Các hàm check mạng

Trong file còn nhiều hàm kiểm tra mạng.
Những hàm này giúp thiết bị tự động phục hồi khi mất kết nối.

#### 14.6.1 `checkNetWorkInConnect()`

Hàm này kiểm tra:
- WiFi có kết nối không?
- MQTT có hoạt động không?
- Nếu không, ping mạng.
- Nếu ping thất bại nhiều lần, đặt state lỗi.

#### 14.6.2 `checkNetWorkDisconnect()`

Hàm này gọi `netWork_Wifi.disconnetWifi()` và đặt trạng thái.

#### 14.6.3 `checkNetWorkReConnect()`

Hàm này cố gắng kết nối lại WiFi sau 4 lần kiểm tra.
Nó cũng khởi động lại web server.

#### 14.6.4 `checkNetWorkRealTimeServer()`

Hàm này kiểm tra tình trạng kết nối với server thực tế.
Nếu WiFi mất, tăng đếm sai và chuyển về trạng thái lỗi.

#### 14.6.5 `checkMQTTConnect()`

Nó gọi `netWork_Mqtt.MqttReconnect()` để thử lại phí dây.

### 14.7 `checkButton()` và các chế độ cấu hình

`checkButton()` xử lý khi người dùng nhấn nút vật lý.
Nút nhấn có thể chuyển sang chế độ cấu hình.

### 14.8 `TaskNetWork::loopNetWork()`

Hàm này chạy trong vòng lặp:
- Kiểm tra `netWork_Wifi.checkWifi()`.
- Gọi `netWork_Mqtt.lisenMqtt()` để xử lý msg.
- Thực hiện kiểm tra reconnect.
- Gửi trạng thái đến broker nếu cần.

Nó là cầu nối giữa mạng và dữ liệu.

### 14.9 `TaskNetWork::taskRun(void * parameter)`

Trong RTOS, đây là hàm task độc lập.
Nó gọi `loopNetWork()` liên tục.

Nếu không RTOS, `loop()` chính của Arduino gọi `taskRun(NULL)`.

## 15. Giải thích chi tiết `TaskSensor.cpp`

### 15.1 Mục đích của `TaskSensor`

`TaskSensor` chịu trách nhiệm đọc dữ liệu từ cảm biến.
Nó tách riêng phần thu thập dữ liệu khỏi phần mạng và điều khiển.

### 15.2 `TaskSensor::setup()`

```cpp
void TaskSensor::setup(void){
    dataSensor.valueHumi =0;
    dataSensor.valueTemp =0;
    dataSensor.valueDust =0;
    dataSensor.valueDust_PM2_5 =0;
    dataSensor.valueDust_PM10 =0;
    dataSensor.valueDust_PM1 =0;
    dataSensor.valueControl =0;
    dht.begin();
    Serial1.begin(9600);
    ...
}
```

Nó:
- Reset lại các giá trị sensor.
- Khởi tạo DHT.
- Khởi tạo cổng Serial1 cho cảm biến PMS.
- Tạo mutex nếu dùng RTOS.

### 15.3 `TaskSensor::readSensorDust()`

Hàm đọc cảm biến bụi PMS. Nếu `pms.read(data)` trả về true, dữ liệu được ghi.

Sau đó, hàm chuyển `valueDust_PM2_5` thành `valueDust` bằng công thức.

### 15.4 `TaskSensor::readSensorTemp()` và `readSensorHumi()`

Mỗi hàm đọc một giá trị và nhân lên 100.
- `valueTemp = dht.readTemperature() * 100`
- `valueHumi = dht.readHumidity() * 100`

Vì vậy, giá trị `2300` tương đương `23.00`.

### 15.5 Cơ chế vòng lặp trong `taskRun()`

`taskRun()` dùng mảng hàm con:

```cpp
using SensorReadFn = void (*)();
static SensorReadFn readOps[4] = {
    TaskSensor::readSensor,
    TaskSensor::readSensorDust,
    TaskSensor::readSensorTemp,
    TaskSensor::readSensorHumi
};
```

Mỗi lần chạy, nó thực hiện một bước và sau đó chờ 1 giây.

Điều này phân tán tải đọc cảm biến thành 4 bước.

### 15.6 Gửi dữ liệu qua queue

Nếu dùng RTOS:
- `xQueueSend(sensorDataQueue, &dataSensor, 100)` gửi cấu trúc sensor vào queue.
- `MemoryData::GetInstance().sensorData_ = &dataSensor;` chia sẻ dữ liệu.

Nếu không dùng RTOS:
- Dữ liệu được gán trực tiếp vào `MemoryData::GetInstance().sensorData_`.

### 15.7 Lý do dùng mutex

Mutex bảo vệ `dataSensor` khi nhiều task cùng đọc/ghi.
Nó giảm khả năng bị xung đột bộ nhớ khi task khác cần dùng dữ liệu.

## 16. Giải thích chi tiết `TaskDevice.cpp`

### 16.1 Mục đích của `TaskDevice`

`TaskDevice` điều khiển các chân ra và đọc nút nhấn.
Nó đại diện cho phần actuators của hệ thống.

### 16.2 `TaskDevice::setup()`

```cpp
void TaskDevice::setup(void)
{
    control.device_port = 0x00;
    control.button_click = 0x00;
    control.button_status = 0x00;
    control.count_info = 0x00;
    pinMode(21, INPUT_PULLUP);
}
```

Phần này:
- Reset trạng thái.
- Cấu hình chân 21 làm `INPUT_PULLUP` cho nút.

### 16.3 `readButton()`

Hàm thực hiện debounce và long press.

Nếu nút nhấn đủ 3 giây, nó toggle `device_port`.

### 16.4 `controlPump()` và `controlDevice()`

Cả hai hàm điều khiển đầu ra.
- `OUTPUT_PUMP = 22`
- `OUTPUT_DEVICE_1 = 23`

Nếu `control.device_port | 0x01` bằng 1 thì bật bơm.
Nếu `control.device_port | 0x02` bằng 2 thì bật thiết bị 1.

### 16.5 `taskRun()`

Nó chạy liên tục trong RTOS.
- Gọi `readButton()`.
- Gọi `controlPump()`.
- Gọi `controlDevice()`.

Nếu `device_port` thay đổi, nó gửi trạng thái qua queue hoặc ghi vào `MemoryData`.

Nó cũng đọc lệnh `deviceCommandQueue` nếu có.

## 17. Giải thích chi tiết `NetWork_Wifi.cpp`

### 17.1 Mục đích

`NetWork_Wifi` quản lý WiFi, web server, OTA và các chế độ cấu hình.

### 17.2 Các route quan trọng

- `/control`
- `/update`
- `/`
- `/setup`

Nếu client truy cập `/setup`, thiết bị ghi cấu hình và khởi động lại.

### 17.3 `startWebServer()` vs `startWebserverRoot()`

- `startWebServer()`: dùng cho chế độ hoạt động đã cấu hình. Đăng ký route điều khiển.
- `startWebserverRoot()`: dùng cho giai đoạn cấu hình ban đầu.

### 17.4 `setupHostPost()`

Thiết lập ESP32 ở chế độ access point để cấu hình.
- SSID = `HOST_POST_INFO`.
- Thiết bị phát AP và chờ client kết nối.

### 17.5 `checkModeHostPost()`

Xác định xem thiết bị đang ở AP mode hay STA mode.
Nó sử dụng:
- `WiFi.getMode()`
- `WiFi.softAPSSID()`
- `WiFi.softAPgetStationNum()`

### 17.6 `setupOTA()`

Quy trình OTA:
1. Kết nối WiFi.
2. Gọi `http.begin(linkOTA_ESP_32)`.
3. Kiểm tra version server.
4. Tải file nhị phân.
5. Ghi firmware bằng `Update.writeStream()`.
6. Nếu thành công, restart.

### 17.7 `setupSmartConfig()` và `setupProvisioning()`

Mục đích cho phép cấu hình WiFi qua SmartConfig hoặc BLE.
Nếu không dùng, thiết bị sẽ dùng AP tạm.

## 18. Giải thích chi tiết `NetWork_Mqtt.cpp`

### 18.1 Mục đích `NetWork_Mqtt`

Quản lý kết nối MQTT và xử lý message.

### 18.2 Cấu trúc `Settings`

Lưu các tham số MQTT:
- `mqtt_host`
- `mqtt_port`
- `mqtt_client`
- `mqtt_user`
- `mqtt_pwd`
- `public_topic`
- `subcribe_topic`
- `mqtt_grptopic`
- `web_password`

### 18.3 `parseJsonToSettings()`

Đọc JSON cấu hình từ EEPROM và copy vào `Settings`.

### 18.4 `setupInfoMQTT()`

Thiết lập callback và server.
Nếu connect thành công, MQTT client sẵn sàng publish và subscribe.

### 18.5 `MqttDataCallback()`

Xử lý message đến.
Nếu `com == 2`: gửi trạng thái.
Nếu `com == 1`: đưa lệnh vào queue.

### 18.6 `MqttReconnect()`

Đóng kết nối cũ và thử reconnect.
Nếu thành công, gọi `connectMqtt()`.

### 18.7 `sendMessageInfo()` và `sendMessageInfoPublish()`

Cả hai hàm đều publish lên topic.
Nên dùng `sendMessageInfoPublish()` khi muốn publish với dữ liệu tạm tạo.

### 18.8 Cải thiện đề xuất

Trong mã hiện tại, `checkStatusMqtt()` trả về 0 cố định.
Trong phiên bản hoàn thiện, hàm này nên kiểm tra trạng thái `MqttClient.connected()`.

## 19. Giải thích chi tiết `Common.cpp` và `MemoryData.h`

### 19.1 `Common.cpp`

Hàm `getInfoDevice()` tạo JSON từ hai cấu trúc.

```cpp
jsonBufferData["data"] = 2;
String vaString = "\"" + ... + "\"";
jsonBufferData["va"] = vaString;
jsonBufferData["co"] = coString;
serializeJson(jsonBufferData, response);
```

Kết quả JSON có dạng:
```json
{
  "data":2,
  "va":"4500,2300,10,12,20,30,0",
  "co":"1,0,0,0"
}
```

### 19.2 `MemoryData.h`

Singleton dùng chung cho các task.

- `sensorData_`
- `deviceStatus_`
- `deviceCommand_`

Nó cung cấp một vùng nhớ chung để các module đọc/ghi.

### 19.3 Vì sao dùng Singleton

Singleton đảm bảo chỉ có một thể hiện duy nhất.
Điều này tránh việc trùng lặp dữ liệu.

## 20. Giải thích chi tiết server Node.js

### 20.1 `server.js`

Entry point của server Node.

Nó thực hiện:
- Kết nối MongoDB.
- Cấu hình API Express.
- Thiết lập MQTT broker Aedes.
- Lắng nghe cổng.

Nếu MongoDB không chạy, server vẫn khởi tạo nhưng một số API sẽ không hoạt động.

### 20.2 `config/express.js`

Cấu hình Express:
- `cors()`
- `bodyParser.json()`
- static files `public`
- port và host từ `.env`

### 20.3 `routes/index.js`

Tập hợp các route module:
- chat
- history
- comment
- history_comment
- cron

Tức là server không chỉ xử lý IoT, mà còn hỗ trợ chat và bình luận.

### 20.4 `.env` và cấu hình

Các biến quan trọng:
- `APP_MQTT`, `APP_MQTT_PORT`, `APP_MQTT_USER`, `APP_MQTT_PASS`
- `APP_MONGO`, `APP_MONGO_TABLE`
- `DB_CLIENT`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`

Nên dùng `.env.example` khi triển khai.

### 20.5 `mqtt/index.js`

Xử lý sự kiện broker Aedes.
Nó không lưu dữ liệu, chỉ ghi log.

### 20.6 `controllers/history.controller.js`

Đây là phần lưu và truy vấn lịch sử.
Ví dụ:
- `findAll()` lấy toàn bộ lịch sử.
- `create()` thêm lịch sử mới.

### 20.7 Mở rộng server cho IoT

Để server thực sự lưu dữ liệu IoT, cần:
- Thêm listener MQTT publish.
- Parse message.
- Lưu vào MongoDB.
- Cập nhật API `status`.

## 21. Bài tập thực hành cho người mới

### 21.1 Bài tập 1: Đọc và in log giá trị cảm biến

Mục tiêu: hiểu `TaskSensor`.

Thực hành:
1. Thêm `Serial.println()` trong `readSensorTemp()` và `readSensorHumi()`.
2. Biên dịch và nạp.
3. Mở Serial Monitor.
4. Kiểm tra giá trị in ra.

### 21.2 Bài tập 2: Thêm trường sensor mới

Giả sử muốn đọc một cảm biến mới.

Thực hành:
1. Thêm biến vào `InfoSensor`.
2. Thêm hàm đọc vào `TaskSensor`.
3. Mở rộng `getInfoDevice()` để gửi thêm giá trị.
4. Test lại.

### 21.3 Bài tập 3: Thêm API `status`

Mục tiêu: hiểu server Node.

Thực hành:
1. Tạo route mới trong `routes/index.js`.
2. Viết controller trả về mẫu JSON.
3. Dùng Postman kiểm tra `GET /api/status/test`.

### 21.4 Bài tập 4: Gửi lệnh điều khiển qua web

Mục tiêu: hiểu `NetWork_Wifi::handleControl()`.

Thực hành:
1. Gửi HTTP request đến `/control?com=1&value=1`.
2. Xem button trạng thái thiết bị.
3. Nếu bật relay, kiểm tra chân điều khiển.

### 21.5 Bài tập 5: Chạy broker độc lập

Thực hành:
1. Chạy `mqttBroker/MqttBroker1885.js` bằng Node.
2. Cấu hình thiết bị hoặc server dùng broker này.
3. Đảm bảo kết nối thành công.

## 22. Checklist triển khai và vận hành

### 22.1 Kiểm tra trước khi deploy

- [ ] Firmware biên dịch không lỗi.
- [ ] Board ESP32 chọn đúng.
- [ ] Library đầy đủ.
- [ ] Server Node cài `npm install` thành công.
- [ ] MongoDB/MySQL sẵn sàng.
- [ ] `.env` chứa đúng thông tin.
- [ ] Port không xung đột.

### 22.2 Vận hành thử

- [ ] Khởi động server Node.
- [ ] Kết nối broker Aedes.
- [ ] Kết nối thiết bị ESP32.
- [ ] Gửi dữ liệu sensor.
- [ ] Nhận lệnh điều khiển.
- [ ] Kiểm tra API.

### 22.3 Kiểm tra an toàn

- [ ] Không để mật khẩu mặc định trong code.
- [ ] Giới hạn truy cập API khi mở rộng.
- [ ] Ghi lại log lỗi.
- [ ] Backup cấu hình quan trọng.

## 23. Lời khuyên dành cho người mới

### 23.1 Đọc code theo module

- Bắt đầu từ `DeviceIOT.ino`.
- Tiếp theo `TaskSensor.cpp`, `TaskDevice.cpp`, `TaskNetWork.cpp`.
- Sau đó đọc `NetWork_Wifi.cpp`, `NetWork_Mqtt.cpp`.
- Cuối cùng xem server Node.

### 23.2 Chạy từng phần một

- Trước tiên, chỉ chạy firmware.
- Sau đó chạy server.
- Cuối cùng kiểm tra kết nối MQTT.

### 23.3 Luôn kiểm tra log

Log giúp bạn tìm ra nguyên nhân lỗi nhanh.
Nếu không hiểu, in thêm biến ra Serial hoặc console.

### 23.4 Tài liệu tham khảo

- Arduino ESP32 tutorial.
- MQTT cơ bản.
- ExpressJS và Node.js.
- MongoDB cơ bản.

---

## 24. Hướng dẫn học IoT cơ bản cho người mới

### 24.1 Tại sao IoT lại quan trọng?

IoT không chỉ là công nghệ. Nó là cầu nối giữa thế giới vật lý và thế giới số.

- Một cảm biến nhiệt độ trong nhà có thể giúp bạn điều chỉnh điều hòa.
- Một thiết bị đo chất lượng không khí có thể tự động bật quạt lọc.
- Một thiết bị đo từ xa cứu được mạng sống trong nhà máy.

IoT làm cho thiết bị thông minh hơn, giảm thao tác tay và tăng tự động hoá.

### 24.2 Ba câu hỏi người mới luôn hỏi

1. Thiết bị IoT có khác gì với máy tính?
   - Thiết bị IoT thường nhỏ, chuyên dụng, có cảm biến và giao tiếp nhẹ.
   - Máy tính có GUI, bộ nhớ lớn, chạy ứng dụng phức tạp.

2. MQTT là gì?
   - MQTT là một giao thức truyền tin nhẹ dành cho thiết bị kết nối.
   - Nó dùng cơ chế publish/subscribe để gửi và nhận tin.

3. Tại sao cần server?
   - Thiết bị gửi dữ liệu, nhưng server giúp lưu trữ, xử lý và hiển thị.
   - Nếu chỉ có nhiều thiết bị mà không có server, dữ liệu sẽ bị phân mảnh.

### 24.3 Mô hình IoT kiểu bậc thang

Hãy hình dung IoT như một toà nhà:
- Tầng trệt: cảm biến và thiết bị (Edge Device).
- Tầng 1: mạng và giao tiếp (WiFi/MQTT).
- Tầng 2: broker/server xử lý.
- Tầng 3: lưu trữ và API.
- Tầng thượng: giao diện người dùng.

Trong dự án này:
- `DeviceIOT/` = tầng trệt.
- `mqttClient/` = tầng 2 và 3.
- `admin/` = tầng thượng.

### 24.4 Các thuật ngữ cơ bản và ví dụ dễ hiểu

#### Sensor (cảm biến)
Là con mắt của hệ thống.

Ví dụ: DHT11 đo nhiệt độ, giống như nhiệt kế.

#### Actuator (bộ chấp hành)
Là bàn tay của hệ thống.

Ví dụ: relay bật/tắt bơm, giống như công tắc điện tự động.

#### Broker
Là người chuyển phát.

Ví dụ: giống như bưu tá nhận thư từ thiết bị và đem đến người nhận.

#### Topic
Là địa chỉ thư.

Ví dụ: `device/command` giống như đường dẫn nơi gửi lệnh.

#### Publish
Gửi tin.

Ví dụ: thiết bị gửi giá trị sensor lên broker.

#### Subscribe
Đăng ký nhận tin.

Ví dụ: thiết bị muốn nhận lệnh thì subscribe topic lệnh.

### 24.5 Học IoT theo các bước nhỏ

1. Bắt đầu bằng hiểu cảm biến và relay.
2. Sau đó học về mạng WiFi và cách kết nối ESP32.
3. Tiếp theo học MQTT, publish/subscribe.
4. Cuối cùng học server Node.js và API.

### 24.6 Ví dụ đơn giản bằng câu chuyện

Hãy tưởng tượng bạn có một cây hoa trong nhà.
- Cây cần nước khi đất khô.
- Bạn gắn cảm biến độ ẩm vào đất.
- Cảm biến gửi số liệu qua WiFi lên server.
- Server quyết định bật máy bơm tự động.

Trong dự án này, cảm biến bụi và nhiệt độ hoạt động tương tự.

## 25. Kiến trúc ESP32 và vòng đời ứng dụng

### 25.1 ESP32 là gì?

ESP32 là một bộ vi điều khiển (MCU) tích hợp WiFi và Bluetooth.

Nó rất phù hợp cho IoT vì:
- nhỏ gọn,
- tiêu thụ năng lượng thấp,
- có sẵn nhiều chân I/O,
- hỗ trợ nhiều giao thức.

### 25.2 Vòng đời chương trình Arduino

Một ứng dụng Arduino đơn giản gồm hai phần:
- `setup()`: chạy một lần khi bật thiết bị.
- `loop()`: chạy lặp lại mãi mãi.

Trong dự án này, `setup()` khởi tạo sensor, pin và kết nối.
`loop()` hoặc RTOS task đảm bảo hệ thống duy trì hoạt động.

### 25.3 RTOS và không RTOS

RTOS là hệ điều hành thời gian thực.
- Nếu `SUPPORT_RTOS = false`, toàn bộ chương trình chạy trong `loop()`.
- Nếu `SUPPORT_RTOS = true`, mỗi module chạy như một task riêng.

Ưu điểm RTOS:
- Mỗi module độc lập,
- Dễ mở rộng,
- Tốt cho hệ thống nhiều tác vụ.

Nhược điểm:
- Cần hiểu về queue và mutex.

### 25.4 Cấu trúc bộ nhớ và con trỏ

`MemoryData` là một singleton dùng chung.
Nó cho phép task khác xem dữ liệu sensor và lệnh điều khiển.

Ví dụ:
- `sensorData_` trỏ đến dữ liệu hiện tại.
- `deviceCommand_` trỏ đến lệnh MQTT nhận được.

### 25.5 Tại sao cần `Common.h`?

`Common.h` định nghĩa các cấu trúc tổng hợp sử dụng khắp hệ thống.
Nó giúp đồng bộ dữ liệu giữa các module.

### 25.6 Luồng dữ liệu từ cảm biến đến broker

1. Sensor đọc giá trị.
2. Dữ liệu lưu vào `dataSensor`.
3. `getInfoDevice()` xây JSON.
4. `sendMessageInfoPublish()` publish lên broker.

Đây là luồng dữ liệu quan trọng nhất.

## 26. Hiểu rõ MQTT dành cho người mới

### 26.1 MQTT là gì?

MQTT là giao thức truyền tin nhẹ.
- Dùng cho thiết bị giới hạn tài nguyên.
- Làm việc tốt trên kết nối yếu.

### 26.2 Publish/Subscribe là gì?

- `Publisher` gửi tin lên một `topic`.
- `Subscriber` nhận tin từ `topic`.
- Broker điều phối việc chuyển tin.

Aedes trong project là broker.

### 26.3 Topic là gì?

Topic giống như địa chỉ email.

Ví dụ:
- `device/command`
- `device/data`

Thiết bị có thể publish vào `device/data` và subscribe `device/command`.

### 26.4 QoS là gì?

QoS xác định mức độ tin cậy.
- QoS 0: gửi một lần, không đảm bảo.
- QoS 1: ít nhất một lần.
- QoS 2: chính xác một lần.

Project dùng QoS 1.

### 26.5 Retain và Clean Session

- `retain`: tin sẽ được giữ lại trên broker.
- `clean session`: xác định client có giữ session cũ không.

Trong `MqttClient.connect(...)`, project thiết lập các tham số này.

### 26.6 Tại sao MQTT phù hợp IoT?

- nhẹ,
- hiệu quả băng thông,
- hoạt động tốt với kết nối không ổn định.

### 26.7 So sánh MQTT với HTTP

- HTTP yêu cầu request/response.
- MQTT là push và subscribe.

Với IoT, MQTT tốt hơn vì thiết bị có thể gửi dữ liệu mà không cần server truy vấn liên tục.

## 27. Cấu trúc dữ liệu trong firmware

### 27.1 `InfoSensor`

Đây là cấu trúc chứa giá trị cảm biến.

```cpp
struct InfoSensor {
    int valueHumi;
    int valueTemp;
    int valueDust;
    int valueDust_PM2_5;
    int valueDust_PM10;
    int valueDust_PM1;
    int valueControl;
};
```

Giải thích:
- `valueHumi`: độ ẩm.
- `valueTemp`: nhiệt độ *100.
- `valueDust`: chỉ số bụi tổng.
- `valueDust_PM2_5`: bụi PM2.5.
- `valueDust_PM10`: bụi PM10.
- `valueDust_PM1`: bụi PM1.
- `valueControl`: giá trị từ thiết bị.

### 27.2 `InfoDeviceControl`

```cpp
struct InfoDeviceControl {
    uint8_t device_port;
    uint8_t button_click;
    uint8_t button_status;
    uint16_t count_info;
    uint8_t device_port_last;
};
```

Giải thích:
- `device_port`: trạng thái relay.
- `button_click`: trạng thái nút.
- `button_status`: trạng thái nút hiện tại.
- `count_info`: số lần thay đổi.
- `device_port_last`: giá trị cũ để so sánh.

### 27.3 `DeviceCommand`

```cpp
struct DeviceCommand {
    uint8_t commandType;
    uint8_t commandValue;
    uint16_t reserved;
};
```

Nó là lệnh nhận từ MQTT hoặc web.
- `commandType`: loại lệnh.
- `commandValue`: giá trị.
- `reserved`: dùng trạng thái nội bộ.

### 27.4 Lưu trữ cấu hình trong EEPROM

`Memory` là lớp đọc/ghi EEPROM.
Nó lưu:
- Chế độ WiFi.
- Dữ liệu JSON cấu hình.

Có nghĩa là thiết bị không cần cấu hình lại mỗi lần khởi động.

## 28. Triển khai môi trường server Node.js và MongoDB

### 28.1 Cài đặt Node.js

1. Tải Node.js từ trang chính thức.
2. Cài đặt Node.
3. Mở terminal trong `mqttClient/`.
4. Chạy `npm install`.

### 28.2 Kiểm tra MongoDB

Nếu dùng MongoDB:
- Cài MongoDB.
- Khởi động service.
- Kiểm tra bằng `mongo` hoặc `mongosh`.

`.env` dùng `APP_MONGO=mongodb://localhost`.

### 28.3 Cài đặt MySQL

Project cũng chứa cấu hình MySQL.
- Kiểm tra `DB_CLIENT=mysql`.
- Cài MySQL.
- Tạo database và user nếu cần.

### 28.4 Chạy server Node

Trong `mqttClient/`:
- `npm start`

Server sẽ sử dụng script `nodemon index.js`.
Nó tự động reload khi bạn chỉnh sửa code.

### 28.5 Kiểm tra broker Aedes

Aedes chạy cùng server.
- Nếu server khởi động, broker cũng sẵn sàng.
- Bạn có thể dùng MQTT client để connect qua websocket.

### 28.6 Xem log khi server khởi động

Server in:
- Kết nối MongoDB.
- Server listening port.

Nếu báo lỗi, kiểm tra:
- `.env`
- thư viện `npm install`.

## 29. Thuyết trình chi tiết `admin/` và `web_manager/`

### 29.1 `admin/`

Thư mục này chứa một ứng dụng frontend React.

Nó cung cấp giao diện quản trị:
- Hiển thị lịch sử.
- Quản lý trạng thái thiết bị.

### 29.2 `web_manager/`

Có vẻ là một server quản lý khác.
Nó chứa:
- `index.js`
- `knexfile.js`
- `package.json`
- `public/`, `server/`

Nó có thể dùng cho trang quản trị.

### 29.3 Tầm quan trọng của frontend

Frontend giúp người dùng tương tác với thiết bị mà không cần hiểu code.
Nó là phần cuối cùng của hệ thống IoT.

### 29.4 Cách frontend kết nối API

- Gọi `GET /api/history`.
- Gọi `POST /api/status`.
- Hiển thị dữ liệu và trạng thái.

Nếu muốn mở rộng, frontend có thể:
- Vẽ biểu đồ.
- Hiển thị bản đồ thiết bị.
- Báo cảnh báo.

## 30. Danh sách file quan trọng và chức năng

### 30.1 Firmware

- `DeviceIOT.ino`: entry point.
- `TaskNetWork.h/cpp`: quản lý mạng.
- `TaskSensor.h/cpp`: đọc cảm biến.
- `TaskDevice.h/cpp`: điều khiển.
- `NetWork_Wifi.h/cpp`: WiFi và web config.
- `NetWork_Mqtt.h/cpp`: MQTT.
- `Common.h/cpp`: các cấu trúc dữ liệu chung.
- `Memory.h`: lưu trữ EEPROM.
- `MemoryData.h`: chia sẻ dữ liệu giữa task.

### 30.2 Server Node

- `server.js`: entry point server.
- `config/express.js`: cấu hình Express.
- `routes/index.js`: router chính.
- `mqtt/index.js`: broker.
- `controllers/history.controller.js`: API lịch sử.
- `.env`: cấu hình môi trường.
- `package.json`: dependencies.

### 30.3 Tool phụ trợ

- `mqttBroker/MqttBroker1885.js`: broker độc lập thử nghiệm.
- `admin/`: frontend quản trị.
- `web_manager/`: phần mềm quản lý.

### 30.4 Tài liệu

- `DeviceIOT_API_Documentation.txt`.
- `README.md` trong `mqttClient/`.

## 31. Best practice chi tiết cho IoT production

### 31.1 Thiết kế firmware theo module

- `TaskSensor` chỉ lo đọc sensor.
- `TaskDevice` chỉ lo điều khiển.
- `TaskNetWork` chỉ lo mạng.

Điều này giúp bảo trì dễ dàng.

### 31.2 Dùng cấu hình linh hoạt

Không hardcode SSID, password, broker.
- Dùng EEPROM hoặc file cấu hình.
- Dùng `.env` cho server.

### 31.3 Ghi log nhất quán

- Firmware: `Serial.println()`.
- Server: `console.log()`.
- Ghi log lỗi và trạng thái.

### 31.4 Xử lý reconnect

- Giữ kết nối mạng ổn định.
- Nếu mất, thử reconnect sau khoảng thời gian.
- Không retry liên tục quá nhanh.

### 31.5 Bảo mật cơ bản

- Không lưu mật khẩu trong code.
- Dùng `.env`.
- Dùng xác thực MQTT nếu có thể.
- Lọc đầu vào JSON.

### 31.6 Quản lý dữ liệu

- Chỉ send dữ liệu cần thiết.
- Nếu sensor đọc quá nhanh, giảm tần suất.
- Nếu dữ liệu không đổi, có thể lọc.

### 31.7 Thiết kế API dễ dùng

- API REST nên rõ ràng.
- Dùng HTTP code đúng.
- Trả JSON chuẩn.

### 31.8 Kiểm thử

- Test firmware trên board thật.
- Test API bằng Postman.
- Test MQTT bằng MQTT client.

## 32. Glossary (bảng thuật ngữ)

- IoT: Internet of Things.
- MQTT: Message Queuing Telemetry Transport.
- Broker: Máy chủ trung gian chuyển tin.
- Topic: Đường dẫn dữ liệu MQTT.
- Publish: Gửi tin lên topic.
- Subscribe: Đăng ký nhận tin.
- ESP32: board vi điều khiển tích hợp WiFi.
- DHT11: cảm biến nhiệt độ và độ ẩm.
- PMS: cảm biến bụi mịn.
- RTOS: Real-Time Operating System.
- EEPROM: bộ nhớ lưu thông tin nhỏ trên thiết bị.
- API: Application Programming Interface.
- JSON: định dạng dữ liệu văn bản.
- QoS: Quality of Service trong MQTT.

---

## 33. Walkthrough chi tiết từng hàm trong firmware

Trong phần này, mỗi hàm sẽ được phân tích để bạn hiểu rõ luồng thực thi.

### 33.1 `DeviceIOT.ino` là entry point

`DeviceIOT.ino` chỉ có hai hàm chính:
- `setup()`
- `loop()`

Nó khởi tạo các module và khởi động logic chính.

#### 33.1.1 `setup()`

Mục tiêu:
- Khởi tạo serial debug.
- Khởi tạo các module device/sensor/network.
- Tạo task khi dùng RTOS.

Quy trình:
1. `Serial.begin(115200);` mở cổng debug.
2. Gọi `taskDevice.setup();` để cấu hình chân.
3. Gọi `taskSensor.setup();` để bật cảm biến.
4. Gọi `task_NetWork.setup();` để kết nối WiFi/MQTT.
5. Nếu `SUPPORT_RTOS == true`, tạo các task độc lập với `xTaskCreatePinnedToCore`.
6. Nếu không, mọi thứ được thực thi trong `loop()`.

Điều cần nhớ:
- `setup()` chỉ chạy một lần.
- Nếu có lỗi trong `setup()`, chương trình có thể không hoạt động.

#### 33.1.2 `loop()`

`loop()` chạy vô hạn.
Nó chọn cách thực thi tuỳ vào cấu hình RTOS.

- Nếu không dùng RTOS: gọi tuần tự `taskRun()` của từng module và `delay(10);`.
- Nếu dùng RTOS: chỉ dùng `delay(1000);` vì các task đã hoạt động độc lập.

### 33.2 `TaskNetWork::setup()`

Đây là hàm khởi tạo rất nặng.
Nó xử lý tất cả chế độ hoạt động của thiết bị.

Các bước quan trọng:
- `Memory::GetInstance()->initEEPROM(2048);`
- `modeStatus = Memory::GetInstance()->readChar(MODE_WIFI_ADRESS);`
- `pinMode(BUTTON_PIN, INPUT_PULLUP);`

Nếu `modeStatus == WIFI_START_CONNECT`:
- Kết nối WiFi.
- Kiểm tra nếu thành công thì lấy timestamp mạng.
- Bắt đầu web server.
- Tạo queue như `sensorDataQueue`.
- Setup MQTT.
- Gửi thông báo `mqtt`.
- Khởi tạo UART.

Nếu `modeStatus` khác:
- Chuyển sang provisioning hoặc SmartConfig.
- Hoặc setup host post để nhập cấu hình.

### 33.3 `TaskNetWork::loopNetWork()`

Hàm này là vòng lặp kiểm tra trạng thái.
Nó chạy liên tục.

Các hành động chính:
- Nếu thiết bị không ở chế độ host post và WiFi/MQTT không hoạt động, gọi `pingNetWork()`.
- Nếu có lỗi, reset `state` và `numberCheck`.
- Nếu MQTT đang hoạt động, có thể gửi dữ liệu định kỳ.

Hàm này giúp thiết bị luôn cố gắng ở trạng thái kết nối.

### 33.4 `TaskSensor::taskRun()`

Hàm này chạy vòng lặp thu thập dữ liệu.

Cơ chế:
- Dùng mảng hàm `readOps[4]`.
- Mỗi lần chạy, thực hiện 1 hàm đọc.
- Tăng `sensorReadStep`.
- Gửi dữ liệu lên queue hoặc cập nhật `MemoryData`.
- Delay 1 giây.

Ưu điểm của cách này:
- Giảm tắc nghẽn.
- Mỗi cảm biến được đọc độc lập.

### 33.5 `TaskDevice::taskRun()`

Hàm này kiểm soát thiết bị và lệnh.

Nó thực hiện:
- `readButton()` để đọc nút.
- `controlPump()` và `controlDevice()` để điều khiển chân output.
- Nếu trạng thái `device_port` thay đổi, gửi status.
- Nếu có lệnh trong queue, áp dụng lệnh.

Điều quan trọng:
- Nếu `deviceCommandQueue` không tồn tại, lệnh sẽ bị bỏ.
- Nếu không dùng RTOS, lệnh được lưu trong `MemoryData`.

### 33.6 `NetWork_Wifi::handleSetUp()`

Hàm này xử lý cấu hình WiFi/MQTT qua HTTP.
Nó:
- Đọc dữ liệu JSON từ `webServer->arg("data")`.
- Ghi vào EEPROM với `WIFI_SETUP_JSON`.
- Set `WIFI_MODE` sang `WIFI_BLE_SMART_CONFIG`.
- Trả về `{'data':true}`.
- Restart ESP.

Practical tip:
- Nếu server cấu hình không đúng, thiết bị sẽ không kết nối.

### 33.7 `NetWork_Wifi::handleControl()`

Hàm này nhận lệnh điều khiển từ HTTP.
Nó gán `cmd.commandType` và `cmd.commandValue`.

Nếu lệnh là `COMMAND_TYPE_CONTROL`, hàm sẽ đưa lệnh vào queue.

Sau đó trả về trạng thái hiện tại của thiết bị:
`getInfoDevice(sensorValue,statusDevice)`.

### 33.8 `NetWork_Mqtt::MqttDataCallback()`

Hàm xử lý MQTT message nhận vào.
Nó:
- Parse JSON.
- Xử lý theo `com`.
- Với `com == 2`: gửi phản hồi trạng thái.
- Với `com == 1`: enqueue lệnh.

Chú ý:
- Nếu JSON không hợp lệ, hàm sẽ in lỗi và bỏ qua.
- Đây là nút giao giữa mạng và thiết bị.

### 33.9 `NetWork_Mqtt::connectMqtt()`

Hàm này thiết lập MQTT connection.
Nó dùng `MqttClient.connect()` với client ID, credentials, topic.

Nếu thành công, nó gọi `sendMessageInfo("test")`.

### 33.10 `NetWork_Mqtt::MqttReconnect()`

Cách reconnect hiện tại:
- `EspClient.stop()`
- `EspClient.connect(Settings.mqtt_host, Settings.mqtt_port)`
- `this->connectMqtt()`

Lời khuyên:
- Cần kiểm tra trạng thái connect.
- Đặt lại socket khi cần.

## 34. Phân tích sâu `NetWork_Wifi.cpp` từng hàm

### 34.1 `setHeader()`

Hàm này gợi mở tiêu đề HTTP để tránh cache.

Cụ thể:
- `Cache-Control: no-cache, no-store, must-revalidate`
- `Pragma: no-cache`
- `Expires: -1`
- `Access-Control-Allow-Origin: *`

Nó giúp client luôn nhận dữ liệu mới.

### 34.2 `handleRoot()`

Xử lý request gốc `/`.
Nó đọc argument `data` và trả JSON đơn giản.

Đây là một endpoint kiểm tra.

### 34.3 `handleUpdate()`

Trả về `getInfoDevice(sensorValue,statusDevice)`.
Nó giúp front-end cập nhật trạng thái thiết bị.

### 34.4 `startWebServer()`

Tạo `WebServer(80)`.
Đăng ký:
- `/control`
- `/update`

Điều này là web API cho thiết bị đã cấu hình.

### 34.5 `startWebserverRoot()`

Tạo `WebServer(80)`.
Đăng ký:
- `/`
- `/setup`

Dùng khi thiết bị chưa có cấu hình.

### 34.6 `setupHostPost()`

Tạo điểm truy cập WiFi tạm.
Nó dùng SSID và password `HOST_POST_INFO`.

Khi thiết bị vào chế độ này,
người dùng có thể kết nối điện thoại để cấu hình.

### 34.7 `loopHostPost()`

Chỉ gọi `webServer->handleClient()`.
Nó xử lý các request đến web server.

### 34.8 `checkModeHostPost()`

Hàm này kiểm tra xem ESP32 đang chạy AP hay STA.
Nó dùng:
- `WiFi.getMode()`
- `WiFi.softAPSSID()`
- `WiFi.softAPgetStationNum()`

Nếu AP đang bật và SSID đúng, trả true.

### 34.9 `isVersionNewer()`

So sánh version hiện tại và server.
Nó phân tích `major.minor.patch`.

### 34.10 `setupOTA()` cụ thể

Quy trình cập nhật OTA:
1. Kiểm tra WiFi đã kết nối.
2. Tải file cấu hình version từ `linkOTA_ESP_32`.
3. So sánh version.
4. Tải file nhị phân nếu version server lớn hơn.
5. Ghi firmware bằng `Update.writeStream()`.
6. Nếu xong, restart.

### 34.11 `loopOTA()`

Hàm này có thể dùng để kiểm tra trạng thái OTA.
Nó chưa có nội dung trong file trích đọc, nhưng nên dùng để giám sát.

### 34.12 WiFi Provisioning và SmartConfig

Các hàm này giúp người dùng cấu hình WiFi mà không cần sửa code.
- BLE provisioning: cấu hình qua Bluetooth.
- SmartConfig: cấu hình qua app điện thoại.

Nó giúp thiết bị thân thiện hơn cho người dùng.

## 35. Mô tả danh sách lệnh và message MQTT

### 35.1 Cấu trúc message publish

Thiết bị gửi message dạng JSON có 3 trường chính:
- `data`
- `va`
- `co`

Ví dụ:
```json
{
  "data": 2,
  "va": "4500,2300,10,12,20,30,0",
  "co": "1,0,0,0"
}
```

### 35.2 Giải nghĩa `va`

`va` là chuỗi các giá trị sensor:
- `humidity`
- `temperature`
- `dust`
- `dust PM2.5`
- `dust PM10`
- `dust PM1`
- `control`

### 35.3 Giải nghĩa `co`

`co` là chuỗi trạng thái điều khiển:
- `device_port`
- `button_click`
- `button_status`
- `count_info`

### 35.4 Message điều khiển gửi tới thiết bị

Server hoặc client có thể gửi JSON dạng:
```json
{"com":1,"value":2}
```

Trong đó:
- `com=1` là lệnh điều khiển.
- `value=2` là giá trị.

Nếu `com=2`, thiết bị chỉ phản hồi trạng thái.

### 35.5 Topic tiêu biểu

Project dùng các topic như:
- `Settings.subcribe_topic`
- `Settings.public_topic`
- `Settings.mqtt_grptopic`

Thông thường:
- `public_topic` để publish dữ liệu.
- `subcribe_topic` để subscribe lệnh.

### 35.6 Lưu ý khi đặt topic

Topic nên rõ ràng và theo quy tắc:
- `device/<deviceId>/data`
- `device/<deviceId>/command`

Trong mã hiện tại, topic được chứa trong `Settings` đọc từ EEPROM.

## 36. Case Study: triển khai một thiết bị IoT mới

Giả sử bạn muốn xây dựng thiết bị mới dùng cùng kiến trúc này.

### 36.1 Bước 1: Xác định yêu cầu thiết bị

- Đọc cảm biến gì?
- Điều khiển gì?
- Kết nối qua MQTT hay HTTP?
- Cần cấu hình qua web không?

### 36.2 Bước 2: Thiết kế cấu trúc firmware

Dựa vào dự án hiện tại, ta có thể dùng:
- `TaskSensor` cho cảm biến.
- `TaskDevice` cho actuator.
- `TaskNetWork` cho mạng.

Tạo các file tương tự:
- `TaskSensorNew.h/cpp`
- `TaskDeviceNew.h/cpp`
- `TaskNetWorkNew.h/cpp`

### 36.3 Bước 3: Mở rộng `InfoSensor` và `InfoDeviceControl`

Nếu bạn thêm cảm biến mới, cập nhật cấu trúc.

Ví dụ:
```cpp
struct InfoSensor {
  int valueHumi;
  int valueTemp;
  int valueSoilMoisture;
  ...
};
```

### 36.4 Bước 4: Mở rộng `getInfoDevice()`

Thêm các trường mới vào JSON.

### 36.5 Bước 5: Thêm cấu hình mới vào EEPROM

Nếu cần thêm cấu hình cho cảm biến mới, mở rộng JSON cấu hình và `parseJsonToSettings()`.

### 36.6 Bước 6: Mở rộng server

- Cập nhật API `status` để nhận dữ liệu mới.
- Mở rộng model lưu trữ.
- Nếu cần, thêm route `POST /device/new`.

### 36.7 Bước 7: Kiểm thử

- Thử từng module độc lập.
- Thử gửi dữ liệu MQTT.
- Thử nhận lệnh điều khiển.
- Thử khởi động lại.

### 36.8 Bài học từ case study

- Luôn tách module rõ ràng.
- Test từng phần trước khi tích hợp.
- Lưu cấu hình riêng biệt.

## 37. FAQ cho người phát triển mới

### 37.1 Làm thế nào để biết thiết bị đã kết nối WiFi?

Kiểm tra log Serial:
- `WiFi connected`.
- `IP address`.

### 37.2 Làm sao biết MQTT đã kết nối?

Trong `NetWork_Mqtt::connectMqtt()`, nếu `MqttClient.connect()` thành công,
thiết bị đã kết nối.

### 37.3 Nếu thiết bị không xuất hiện trên broker thì sao?

- Kiểm tra host/port.
- Kiểm tra credentials.
- Kiểm tra topic.

### 37.4 Tại sao server không thấy dữ liệu từ thiết bị?

- Thiết bị có publish không?
- Broker có nhận không?
- Topic có đúng không?

### 37.5 Tôi có thể dùng broker khác thay Aedes không?

Có. Bạn có thể dùng Mosquitto hoặc HiveMQ.
Tuy nhiên server cần cập nhật cấu hình kết nối nếu dùng MQTT client phía server.

### 37.6 Làm sao thêm thiết bị vào frontend?

- Tạo API mới.
- Cập nhật giao diện để gọi API.
- Lưu trạng thái mới.

### 37.7 Tại sao JSON `va` và `co` lại là chuỗi?

Đó là cách mã hiện tại đóng gói nhiều giá trị vào một trường.
Nó không phải thiết kế tốt nhất.
Trong phiên bản tốt hơn, nên dùng JSON object rõ ràng.

Ví dụ tốt hơn:
```json
{
  "data": 2,
  "sensor": {
    "humidity": 45.00,
    "temperature": 23.00,
    "dust": 10,
    "pm2_5": 12
  },
  "control": {
    "device_port": 1,
    "button_click": 0
  }
}
```

### 37.8 Tôi nên làm gì nếu muốn bảo mật MQTT?

- Dùng TLS.
- Dùng username/password.
- Dùng ACL nếu broker hỗ trợ.

## 38. Mở rộng và nâng cấp dự án

### 38.1 Nâng cấp cấu trúc JSON

Hiện tại `va` và `co` là chuỗi.
Nâng cấp bằng cấu trúc JSON object.

### 38.2 Thêm xác thực API và MQTT

- Thêm JWT cho API.
- Thêm username/password cho MQTT.
- Nếu có thể, dùng TLS.

### 38.3 Lưu dữ liệu vào cơ sở dữ liệu IoT

Thêm các collection/table:
- `sensor_data`
- `device_status`
- `command_history`

### 38.4 Dashboard thời gian thực

Sử dụng Websocket hoặc MQTT Websocket để hiển thị dữ liệu trực tiếp.

### 38.5 Sử dụng cloud IoT

Nếu muốn scale, bạn có thể kết nối tới cloud MQTT broker hoặc IoT platform.

### 38.6 Giám sát và cảnh báo

Thêm logic cảnh báo khi:
- Nhiệt độ vượt ngưỡng.
- Bụi vượt ngưỡng.
- Thiết bị mất kết nối.

## 39. Kiến trúc mở rộng và bảo trì

### 39.1 Tách dịch vụ

Khi hệ thống lớn, nên tách:
- MQTT broker riêng.
- API server riêng.
- Database riêng.
- Frontend riêng.

### 39.2 Mô hình microservice

Server có thể chuyển sang microservice:
- Service nhận MQTT.
- Service lưu trữ.
- Service API.
- Service auth.

### 39.3 Quản lý config

Sử dụng dịch vụ config hoặc file YAML/JSON.
Tránh để cấu hình cứng trong code.

### 39.4 Kiểm tra tự động

Thiết lập test cho:
- Firmware.
- API.
- MQTT.

### 39.5 Nâng cấp firmware từ xa

OTA là chìa khoá.
- Cần có kênh tải an toàn.
- Cần rollback khi thất bại.

## 40. Tài liệu tham khảo và học thêm

### 40.1 Tài liệu IoT căn bản

- Arduino official docs.
- ESP32 programming tutorial.
- MQTT protocol guide.
- MQTT vs HTTP.

### 40.2 Tài liệu Node.js và Express

- ExpressJS docs.
- MongoDB docs.
- Mongoose docs.
- Aedes docs.

### 40.3 Tài liệu nâng cao

- RTOS trên ESP32.
- OTA update.
- Secure MQTT.
- Scalable backend.

---

## 41. Phân tích chi tiết `mqttClient` route và controller

Trong dự án `mqttClient/`, các route và controller là thành phần chính xử lý yêu cầu HTTP.

### 41.1 `routes/index.js`

File này đóng vai trò điều phối dịch vụ.
Nó tập hợp các module route:
- `chat.route.js`
- `history.route.js`
- `commentBlog.js`
- `historyCommentBlog.js`
- `cron.route.js`

Tại đây, tất cả API đều bắt đầu bằng `/api`.

### 41.2 `history.route.js`

Là route cơ bản nhất cho lịch sử.
Nó thường khai báo:
- `GET /` lấy toàn bộ lịch sử.
- `GET /:id` lấy lịch sử theo id.
- `POST /` tạo bản ghi mới.

Trong controller tương ứng, chức năng gồm:
- validate dữ liệu.
- gọi database.
- trả response.

### 41.3 `chat.route.js`

Đây là route mở rộng cho chức năng chat.
Nó có thể dùng MQTT để gửi/nhận tin nhắn.

Các route đặc thù có thể bao gồm:
- `GET /list`
- `POST /message`
- `PUT /status`

### 41.4 `commentBlog.js` và `historyCommentBlog.js`

Các route này phục vụ chức năng blog và comment.
Nếu bạn chỉ làm IoT, đây là phần mở rộng để kết hợp IoT với nội dung web.

### 41.5 `cron.route.js`

Dùng để điều khiển các tác vụ định kỳ.
Nó phục vụ việc chạy cron jobs.

### 41.6 Controller là nơi xử lý logic

`controllers/history.controller.js` chứa các hàm chính.
Với Express, một controller điển hình:
- nhận request.
- gọi model hoặc dịch vụ.
- trả response.

Đây là điểm quan trọng nhất nếu bạn muốn mở rộng backend để lưu dữ liệu IoT.

## 42. Thiết kế database trong dự án

### 42.1 MongoDB trong `.env`

`.env` sử dụng:
- `APP_MONGO=mongodb://localhost`
- `APP_MONGO_TABLE=chat`
- `APP_MONGO_CRON_TABLE=cron_data`

Điều này cho thấy dự án đã sẵn sàng lưu dữ liệu vào MongoDB.

MongoDB phù hợp để lưu dữ liệu IoT không cấu trúc.

### 42.2 MySQL trong `.env`

Cấu hình MySQL:
- `DB_CLIENT=mysql`
- `DB_HOST=...`
- `DB_USER=...`
- `DB_PASSWORD=...`
- `DB_NAME=chatbox_mqtt_test`

MySQL có thể dùng cho các bảng cấu trúc như `users`, `status`, `history`.

### 42.3 Khi nào dùng MongoDB và khi nào dùng MySQL?

- MongoDB: dữ liệu phi cấu trúc, log, lịch sử cảm biến.
- MySQL: dữ liệu quan trọng, tương quan, nhiều truy vấn JOIN.

Trong hệ thống IoT, thường dùng:
- MongoDB cho `sensor_data`.
- MySQL cho `device`, `user`, `permission`.

### 42.4 Mô hình dữ liệu IoT gợi ý

Một thiết kế mẫu cho dữ liệu cảm biến:

`device_status`:
- `device_id`
- `timestamp`
- `temperature`
- `humidity`
- `dust_pm2_5`
- `dust_pm10`
- `device_port`

`command_history`:
- `device_id`
- `timestamp`
- `command_type`
- `command_value`
- `status`

`device_config`:
- `device_id`
- `mqtt_host`
- `mqtt_topic`
- `wifi_ssid`
- `wifi_password`

### 42.5 Kết hợp data giữa MQTT và HTTP

Khi thiết bị publish dữ liệu, bạn có thể lưu trực tiếp vào MongoDB.
Khi client gọi API, bạn trả dữ liệu từ database.

Đây là luồng dữ liệu quan trọng để server thực sự hữu ích.

## 43. Kết nối frontend với backend

### 43.1 API REST trong `mqttClient`

Frontend `admin/` và `web_manager/` có thể gọi:
- `GET /api/history`
- `GET /api/status`
- `POST /api/history`
- `PUT /api/status/:id`

Các API này trả JSON.

### 43.2 Websocket và MQTT Websocket

Nếu cần hiển thị dữ liệu real-time, bạn có thể dùng MQTT Websocket.
Broker Aedes hỗ trợ websocket MQTT.

Frontend có thể subscribe trực tiếp topic MQTT.

### 43.3 Thiết kế giao diện dashboard

Dashboard IoT nên có:
- biểu đồ thời gian thực.
- thẻ trạng thái device.
- bảng lịch sử.
- nút điều khiển.

Frontend có thể gọi API để nhận dữ liệu lúc khởi động, sau đó dùng websocket để cập nhật.

### 43.4 Ví dụ API request

Gửi request lấy lịch sử:
```
GET http://localhost:3002/api/history
```

Gửi request tạo trạng thái mới:
```
POST http://localhost:3002/api/status
Body: { "device_id": "device01", "status": "on" }
```

### 43.5 Thiết kế mobile friendly

Frontend cần responsive.
- Dùng thẻ lớn.
- Màu sắc dễ đọc.
- Alerts rõ ràng.

## 44. Thống kê và báo cáo cho IoT

### 44.1 Báo cáo dữ liệu

Từ dữ liệu sensor, bạn có thể tạo:
- báo cáo theo ngày.
- báo cáo theo giờ.
- báo cáo quá ngưỡng.

Ví dụ:
- Nhiệt độ trung bình mỗi giờ.
- Số lần PM2.5 vượt ngưỡng.

### 44.2 Biểu đồ

Dashboard nên có:
- line chart cho nhiệt độ.
- bar chart cho độ ẩm.
- alert list khi giá trị nguy hiểm.

### 44.3 Báo cáo cảnh báo

Khi PM2.5 > 100:
- gởi cảnh báo.
- bật thiết bị lọc.

Khi nhiệt độ > 40:
- cảnh báo nóng.

### 44.4 Lưu dữ liệu lâu dài

Bạn cần lưu dữ liệu ít nhất 30 ngày.
Nên xóa cũ nếu database quá lớn.

## 45. Hướng dẫn xử lý lỗi dạng tình huống

### 45.1 Tình huống 1: Thiết bị không publish dữ liệu

Kiểm tra:
- Thiết bị có lên nguồn?
- Serial log có chạy không?
- `TaskSensor::taskRun()` có delay?
- `getInfoDevice()` có tạo JSON không?
- `MqttClient.publish()` có trả true?

### 45.2 Tình huống 2: Broker Aedes không nhận message

Kiểm tra:
- Server có chạy?
- Websocket có mở?
- Client connect tới đúng cổng?
- Topic có đúng không?

### 45.3 Tình huống 3: API trả lỗi 500

Kiểm tra:
- server console.
- database connection.
- hàm controller có throw error.

### 45.4 Tình huống 4: OTA thất bại

Kiểm tra:
- URL OTA đúng.
- file nhị phân tương thích.
- bộ nhớ flash đủ.
- kết nối WiFi ổn định.

### 45.5 Tình huống 5: Dữ liệu hiển thị trên dashboard sai

Kiểm tra:
- API trả dữ liệu đúng không?
- JSON parse trên frontend có lỗi?
- client xem đúng topic không?

## 46. Áp dụng các mô hình thiết kế trong IoT

### 46.1 Modularization

Luôn tách logic thành module:
- Sensor module.
- Actuator module.
- Network module.
- Storage module.

Project hiện tại đã tách khá tốt nhờ `TaskSensor`, `TaskDevice`, `TaskNetWork`.

### 46.2 Singleton pattern

`Memory` và `MemoryData` dùng Singleton.
Nó phù hợp khi bạn cần chỉ một thể hiện chung.

Nhưng nên cẩn thận với singleton trong test.

### 46.3 Observer pattern

MQTT publish/subscribe là một dạng Observer.
- Publisher không biết subscriber.
- Broker trung gian quản lý.

### 46.4 Command pattern

`DeviceCommand` là dạng command.
- Nó đóng gói kiểu lệnh và giá trị.
- TaskDevice xử lý command.

### 46.5 State machine

Thiết bị có trạng thái WiFi và MQTT.
- START_CONNECT
- BLE_PROVISION
- SMART_CONFIG
- OTA
- HOST_POST

Đây là một state machine đơn giản.

### 46.6 Layered architecture

Dự án chia thành các layer rõ ràng:
- Device layer.
- Communication layer.
- Server layer.
- Data layer.
- Presentation layer.

Đây là thiết kế tốt để mở rộng.

## 47. Checklist bảo trì cho dự án IoT

### 47.1 Kiểm tra hàng ngày

- Server Node chạy.
- Thiết bị kết nối.
- Dữ liệu mới xuất hiện.
- Không có lỗi 500.

### 47.2 Kiểm tra hàng tuần

- Dọn database cũ.
- Kiểm tra phiên bản firmware.
- Kiểm tra broker.

### 47.3 Kiểm tra hàng tháng

- Kiểm tra backup.
- Cập nhật dependencies Node.
- Kiểm tra bảo mật.

### 47.4 Kiểm tra sau nâng cấp

- Test firmware mới.
- Test API.
- Kiểm tra backward compatibility.

### 47.5 Kiểm tra phần cứng

- Kiểm tra dây nối cảm biến.
- Kiểm tra nguồn cấp.
- Kiểm tra cảm biến bị bẩn.

## 48. Phương pháp triển khai nâng cao

### 48.1 Triển khai server trên Docker

Bạn có thể đóng gói `mqttClient/` vào Docker.

Các bước:
- Tạo `Dockerfile`.
- Build image.
- Chạy container.

Ưu điểm:
- Triển khai nhanh.
- Dễ scale.

### 48.2 Triển khai MQTT broker độc lập

Thay vì Aedes nội bộ, bạn có thể dùng Mosquitto.

Cách:
- Cài Mosquitto.
- Cấu hình broker.
- Thay host trong firmware và server.

### 48.3 Thiết kế high-availability

- Dùng cluster broker.
- Dùng database replica.
- Dùng load balancer cho API.

### 48.4 Quản lý cấu hình với environment

Dùng biến môi trường cho tất cả cấu hình.
- `.env` cho local.
- Config service cho production.

### 48.5 Giám sát và alert

Thêm công cụ giám sát:
- Prometheus.
- Grafana.
- ELK stack.

Khi có lỗi, gửi cảnh báo email/SMS.

## 49. Hướng dẫn thêm cảm biến mới chi tiết

### 49.1 Bước 1: Xác định chân GPIO

Chọn chân I/O chưa dùng.
Ví dụ: `GPIO 32` cho cảm biến analog.

### 49.2 Bước 2: Cập nhật `InfoSensor`

Thêm trường mới, ví dụ `valueLight`.

### 49.3 Bước 3: Cập nhật `TaskSensor::setup()`

Khởi tạo cảm biến nếu cần.

### 49.4 Bước 4: Viết hàm đọc mới

Ví dụ:
```cpp
void TaskSensor::readSensorLight() {
    dataSensor.valueLight = analogRead(LIGHT_PIN);
}
```

### 49.5 Bước 5: Thêm vào mảng `readOps`

Nếu bạn dùng mảng 5 bước, mở rộng mảng.

### 49.6 Bước 6: Cập nhật `getInfoDevice()`

Mở rộng field `va` để chứa giá trị mới.

### 49.7 Bước 7: Thử nghiệm

- Nạp firmware.
- Xem giá trị log.
- Kiểm tra JSON gửi lên broker.

## 50. Hướng dẫn thêm command mới chi tiết

### 50.1 Bước 1: Cập nhật `DeviceCommand`

Thêm kiểu lệnh mới nếu cần.

### 50.2 Bước 2: Cập nhật `NetWork_Mqtt::MqttDataCallback()`

Xử lý `com` mới.

Ví dụ:
- `com = 3` yêu cầu reset thiết bị.

### 50.3 Bước 3: Cập nhật `TaskDevice::taskRun()`

Thực thi lệnh mới khi nhận.

### 50.4 Bước 4: Cập nhật web API

Nếu muốn gửi lệnh qua web, mở rộng `handleControl()`.

### 50.5 Bước 5: Thử nghiệm

Gửi JSON mới và xem hành vi thiết bị.

## 51. Kết luận mở rộng

Dự án này là một nền móng IoT thực tế với nhiều thành phần.
Nó vừa có phần firmware, vừa có phần server và cả frontend.

Nếu bạn là người mới, hãy đọc từng module một, thực hành từng bước, và sau đó mở rộng theo nhu cầu.

Đây là tài liệu đào tạo để bạn nắm được:
- kiến thức cơ bản về IoT,
- cách hoạt động của ESP32,
- cách sử dụng MQTT,
- cách xây dựng server Node.js,
- cách mở rộng và bảo trì.

Chúc bạn học tốt và xây dựng được hệ thống IoT của riêng mình!

---

## 52. Technical appendix: môi trường và lệnh hay dùng

### 52.1 Lệnh cài đặt Node.js

Trong `mqttClient/`:
- `npm install`
- `npm start`

Nếu muốn cài `nodemon` toàn cục:
- `npm install -g nodemon`

### 52.2 Lệnh khởi động MongoDB

Windows:
- Mở `services.msc` và bật `MongoDB`.

Linux/macOS:
- `sudo systemctl start mongod`
- `mongosh`

### 52.3 Kiểm tra port

- Server Node mặc định cổng 3002.
- MQTT broker Aedes chạy cùng HTTP server.

### 52.4 Quản lý file `.env`

Luôn giữ file `.env` ngoài hệ thống version control.
Nếu cần ví dụ, tạo `.env.example`.

### 52.5 Cài đặt Arduino Library

Các library cần thiết:
- `PubSubClient`
- `ArduinoJson`
- `DHT`
- `PMS`
- `WiFiProv`

Trong Arduino IDE: `Sketch > Include Library > Manage Libraries...`.

### 52.6 Kiểm tra phiên bản ESP32

Chọn đúng board trong Arduino IDE:
- `Tools > Board > ESP32 Dev Module`.
- `Tools > Flash Frequency`.
- `Tools > Upload Speed`.

## 53. Walkthrough `NetWork_Mqtt.cpp` từng khối

### 53.1 Thư viện và biến toàn cục

File bắt đầu với:
```cpp
#include "NetWork_Mqtt.h"
#include "NetWork_config.h"
#include "Common.h"
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <WiFiClient.h>
#include <StreamString.h>
#include "Memory.h"
#include "MemoryData.h"
#include "define_All.h"
```

Nó cho thấy module này phụ thuộc nhiều vào cả network và memory.

Các biến global:
- `WiFiClient EspClient`
- `PubSubClient MqttClient(EspClient)`
- `Settings` struct
- `StaticJsonDocument<512> jsonBufferMqtt`

### 53.2 Hàm `sendMessageInfoPublish(String data)`

Chuyển dữ liệu `String` sang `char*` rồi publish.

Điểm cần cải thiện:
- Cần `delete[]` sau khi dùng `new char[...]`.
- Hiện tại code gây leak bộ nhớ vì không giải phóng.

### 53.3 Callback MQTT

`MqttDataCallback(char* topic, byte* data, unsigned int data_len)`
- Chuyển payload thành `String`.
- Parse JSON qua `deserializeJson`.
- Nếu parse lỗi, in log.

Sau đó gán:
- `cmd.commandType`
- `cmd.commandValue`

Nếu `cmd.commandType == 0x02`, gửi trạng thái.
Nếu `cmd.commandType == 0x01`, xếp lệnh vào queue.

### 53.4 `parseJsonToSettings()`

Hàm này đọc cấu hình MQTT từ JSON.
Nó dùng `strlcpy()` để copy chuỗi vào struct.

Nếu JSON thiếu trường, vẫn dùng giá trị mặc định rỗng.

### 53.5 `setupInfoMQTT()`

Lấy payload JSON từ EEPROM với `Memory::GetInstance()->readString(WIFI_SETUP_JSON);`
Nếu parse thành công:
- `MqttClient.setCallback(MqttDataCallback);`
- `MqttClient.setServer(Settings.mqtt_host, Settings.mqtt_port);`
- `MqttClient.connect(...)`

Nếu connect thành công, module đã sẵn sàng.

### 53.6 `getAllDataSetup()`

Trong mã hiện tại, hàm rỗng.
Đây là nơi đáng lấp đầy khi cần đọc cấu hình từ EEPROM hoặc file.

### 53.7 `disconnetMqtt()`

Đơn giản gọi `MqttClient.disconnect();`.

### 53.8 `connectMqtt()`

Giống `setupInfoMQTT()` nhưng không read JSON lại.
Nó tái sử dụng `Settings` đã load sẵn.

### 53.9 `checkStatusMqtt()`

Trả về 0 cố định.
Đây là điểm cần fix:
- Thực sự nên trả `MqttClient.connected()`.
- Hoặc kiểm tra trạng thái session.

### 53.10 `sendMessageInfo(char * data)`

Publish trực tiếp `char*` lên topic.

Điều cần chú ý:
- Topic phải hợp lệ.
- Dữ liệu nên là JSON.

### 53.11 `MqttSubscribe(char *topic)`

Đăng ký topic và gọi `MqttClient.loop()`.

### 53.12 `lisenMqtt()`

Chỉ gọi `MqttClient.loop()`.
Nó xử lý callback.

### 53.13 `MqttReconnect()`

Thoát kết nối cũ, kết nối lại TCP, gọi `connectMqtt()`.

Điều cần cải tiến:
- Dùng backoff khi retry.
- Kiểm tra `MqttClient.connected()` trước.

## 54. Walkthrough `NetWork_Wifi.cpp` từng hàm

### 54.1 Thư viện

Các include:
- `WiFi.h`, `WiFiClient.h`, `WiFiServer.h`.
- `WebServer.h`, `DNSServer.h`.
- `ESPmDNS.h`.
- `HTTPClient.h`, `Update.h`.
- `WiFiProv.h`.

File này tích hợp nhiều tính năng WiFi.

### 54.2 Biến toàn cục

- `uint32_t ip_address[4]` làm IP tĩnh.
- `WebServer *webServer`.
- `jsonBuffer`.
- `ssid`, `password`.
- `enableSmartConfig`, `enableProvisioningBle`.

### 54.3 `setHeader()`

Như đã nói, để tránh cache.

### 54.4 `handleRoot()`

Trả `{'data':true}`.
Làm endpoint test.

### 54.5 `handleSetUp()`

Viết JSON cấu hình vào EEPROM và restart thiết bị.
Đây là cách thiết bị nhận cấu hình từ web.

### 54.6 `handleControl()`

Nhận lệnh điều khiển qua `webServer->arg("com")` và `webServer->arg("value")`.
- Nếu `COMMAND_TYPE_OTHER`: set `reserved = COMMAND_RESERVED_NONE`.
- Nếu `COMMAND_TYPE_CONTROL`: đẩy vào queue.

Sau đó gửi trạng thái hiện tại.

### 54.7 `handleUpdate()`

Trả trạng thái hiện tại dạng JSON.

### 54.8 Router web server

`startWebServer()` gắn 2 route:
- `/control`
- `/update`

`startWebserverRoot()` gắn 2 route:
- `/`
- `/setup`

Hai chế độ: cấu hình ban đầu và chế độ hoạt động.

### 54.9 `setupHostPost()`

Thiết lập ESP32 thành AP với SSID `HOST_POST_INFO`.

Điểm cần lưu ý:
- `WiFi.config(ip_address[0], ip_address[1], ip_address[2], ip_address[3]);`
- `WiFi.softAP(HOST_POST_INFO,HOST_POST_INFO);`

### 54.10 `loopHostPost()`

Chỉ xử lý client HTTP.

### 54.11 `checkModeHostPost()`

Kiểm tra mode AP và SSID.
Nếu thiết bị đang ở HostPost mode, trả true.

### 54.12 `isVersionNewer()`

So sánh version bằng cách phân tích major/minor/patch.

### 54.13 `setupOTA()`

Đây là hàm lớn nhất.
Nó thực hiện:
- GET file cấu hình version.
- parse JSON server.
- lấy `serverVersion` và `binUrl`.
- so sánh với `currentFirmwareVersion`.
- tải file nhị phân bằng HTTP.
- dùng `Update.writeStream()` ghi firmware.
- nếu thành công, `ESP.restart()`.

Điểm cần tối ưu:
- Cần kiểm tra timeout kỹ hơn.
- Nên xử lý rollback khi update thất bại.

### 54.14 `loopOTA()`

Trong mã hiện tại, nó chưa có nội dung.
Nó nên dùng để theo dõi tiến trình OTA.

### 54.15 `setupSmartConfig()` và `setupProvisioning()`

Các hàm này chuẩn bị thiết bị nhận cấu hình từ điện thoại.
Nó phù hợp cho sản phẩm thương mại.

### 54.16 `setup()`

Hàm khởi tạo chung cho WiFi subsystem.

### 54.17 `sysProvEvent()`

Xử lý sự kiện provisioning.

### 54.18 `startProvisioning()` và `setupProvisioning()`

Tiếp tục thiết lập BLE hoặc SmartConfig.

### 54.19 `loopProvisioning()`

Xử lý vòng lặp provisioning.

## 55. Walkthrough `TaskDevice.cpp` từng phần

### 55.1 Biến và hằng số

- `InfoDeviceControl control;`
- `OUTPUT_PUMP = 22`
- `OUTPUT_DEVICE_1 = 23`
- `BUTTON_PIN = 2`

### 55.2 `setup()`

Khởi tạo control về 0.
Cấu hình chân 21 làm input pullup.

### 55.3 `readButton()`

Cơ chế debounce:
- nếu giá trị đọc khác lần trước, reset thời gian.
- chờ 50ms.
- nếu vẫn khác, cập nhật trạng thái.
- nếu nhấn >= 3000ms, toggle device_port.

Điều này giúp tránh báo sai khi nút bị rung.

### 55.4 `controlPump()`

Nếu `device_port | 0x01 == 1`, bật bơm.
Phép toán OR ở đây hơi lạ; vì thực tế:
- nếu `device_port` đã 1, điều kiện đúng.
- nếu `device_port` là 0, điều kiện là 1? cần kiểm tra kỹ.

Điểm cải tiến:
- nên dùng `if (control.device_port & 0x01)` để kiểm tra bit.

### 55.5 `controlDevice()`

Tương tự `controlPump()` nhưng cho chân `OUTPUT_DEVICE_1`.

### 55.6 `taskRun()`

Trong vòng lặp:
- đọc button.
- điều khiển thiết bị.
- nếu `device_port` thay đổi, cập nhật.
- nếu dùng RTOS, gửi status hoặc nhận lệnh.

### 55.7 Cần cải tiến

- Hàm hiện tại không có delay.
- Nếu chạy không RTOS, node có thể chiếm CPU.
- Nên thêm `delay(10)` trong vòng lặp nếu không dùng RTOS.

## 56. Walkthrough `TaskSensor.cpp` từng phần

### 56.1 Các hằng số và biến toàn cục

- `DHT dht(DHTPIN, DHTTYPE);`
- `PMS pms(Serial);`
- `PMS::DATA data;`
- `InfoSensor dataSensor;`

### 56.2 `setup()`

Khởi tạo giá trị về 0.
DHT begin.
Serial1 begin 9600 cho PMS.
Tạo mutex nếu dùng RTOS.

### 56.3 `readSensorDust()`

Đọc dữ liệu PMS.
Nếu đọc thành công, gán giá trị PM.

Công thức tính `valueDust` dựa vào `valueDust_PM2_5`.

### 56.4 `readSensorTemp()` và `readSensorHumi()`

Cần chú ý:
- nếu DHT không đọc được, giá trị có thể lỗi.
- Nên kiểm tra `isnan()` nếu dùng DHT library phiên bản khác.

### 56.5 `taskRun()`

Chạy vĩnh viễn.
Nếu dùng RTOS:
- lấy mutex.
- gửi vào queue.
- update `MemoryData`.
- `vTaskDelay(1000 / portTICK_PERIOD_MS)`.

Nếu không RTOS:
- cập nhật `MemoryData`.
- `delay(1000)`.

### 56.6 Cải tiến nên áp dụng

- Nếu cảm biến không đổi nhiều, có thể giảm tần suất publish.
- Có thể thêm filter hoặc bình quân để giảm nhiễu.

## 57. Walkthrough server Node.js & data flow

### 57.1 `server.js` chi tiết hơn

Phần khởi tạo gồm:
- Express app.
- Routes API.
- MongoDB connection.
- Aedes broker + websocket.

Nếu MongoDB lỗi, server log lỗi và có thể dừng.

### 57.2 `config/express.js`

Cấu hình middleware: CORS, bodyParser.
Đặt static files.

### 57.3 `routes/index.js`

Gọi `router.use("/chat", chatRoutes);` v.v.
Nó làm API phân lớp.

### 57.4 Event broker Aedes

`mqtt/index.js` đăng ký sự kiện:
- `client`
- `clientDisconnect`
- `published`

Nên bổ sung xử lý:
- lưu log message.
- publish tới database.

### 57.5 Data flow từ MQTT đến API

1. Thiết bị publish message.
2. Broker nhận và xử lý.
3. Server có thể lưu vào DB.
4. API trả dữ liệu khi frontend yêu cầu.

Trong phiên bản hiện tại, phần 3 chưa được cụ thể.
Đây là điểm cần bổ sung khi mở rộng hệ thống.

### 57.6 Mô hình API

Express bộ route giúp tách:
- logic xử lý,
- logic database,
- logic route.

Điều này giúp dễ bảo trì.

## 58. Training workbook: 20 bài tập nâng cao

### 58.1 Bài tập 1: Thêm log trạng thái MQTT

Yêu cầu:
- In log khi MQTT connect thành công.
- In log khi broker publish message.

Hướng dẫn:
- Mở `NetWork_Mqtt.cpp`.
- Thêm `Serial.println("MQTT connected")` sau `connect()`.
- Thêm log trong `MqttDataCallback()`.

### 58.2 Bài tập 2: Fix leak bộ nhớ trong `sendMessageInfoPublish()`

Vấn đề:
- `new char[...]` nhưng không `delete[]`.

Sửa:
```cpp
char *p = new char[data.length() + 1];
strcpy(p, data.c_str());
if (MqttClient.publish(Settings.subcribe_topic, p, 1)) {
}
delete[] p;
```

### 58.3 Bài tập 3: Thêm timeout kết nối MQTT

Yêu cầu:
- Nếu không kết nối vài lần, khởi động lại thiết bị.

Hướng dẫn:
- Trong `MqttReconnect()`, đếm số lần thất bại.
- Nếu > 5, gọi `ESP.restart()`.

### 58.4 Bài tập 4: Thêm API `GET /api/status/device/:id`

Yêu cầu:
- Tạo route mới.
- Controller trả status của device theo id.

### 58.5 Bài tập 5: Thêm model MongoDB cho `sensor_data`

Yêu cầu:
- Tạo file `app/models/SensorData.model.js`.
- Schema gồm `device_id`, `temperature`, `humidity`, `created_at`.
- Lưu message MQTT vào collection.

### 58.6 Bài tập 6: Đọc nút nhấn bằng debounce bằng `millis()`

Yêu cầu:
- Hiểu cách `readButton()` hoạt động.
- Thêm `Serial.println()` để debug thời gian nhấn.

### 58.7 Bài tập 7: Cải thiện validation JSON

Yêu cầu:
- Tránh parse JSON lỗi làm crash.
- Thêm kiểm tra dữ liệu hợp lệ.

### 58.8 Bài tập 8: Thêm trường `device_name` vào payload

Yêu cầu:
- Mở rộng JSON gửi lên MQTT.
- Hiển thị trên dashboard.

### 58.9 Bài tập 9: Thêm API `POST /api/history/search`

Yêu cầu:
- Cho phép tìm lịch sử theo thời gian.

### 58.10 Bài tập 10: Thêm chế độ test fake sensor

Yêu cầu:
- Khi `USE_FAKE_SENSOR == true`, gửi dữ liệu ngẫu nhiên.
- Dùng cho test khi không có phần cứng.

### 58.11 Bài tập 11: Thêm retry backoff

Yêu cầu:
- Khi `connectWifi()` không thành, retry sau 5s, 10s, 20s.

### 58.12 Bài tập 12: Thêm chế độ sleep

Yêu cầu:
- Khi không cần gửi dữ liệu thường xuyên, đưa ESP32 vào chế độ sleep.

### 58.13 Bài tập 13: Tách file cấu hình MQTT ra `settings.json`

Yêu cầu:
- Lưu cấu hình vào file JSON.
- Đọc file thay vì đọc chuỗi JSON.

### 58.14 Bài tập 14: Thêm check `sensorData_` null

Yêu cầu:
- Tránh dereference `MemoryData::GetInstance().sensorData_` nếu null.

### 58.15 Bài tập 15: Thêm tính năng test OTA local

Yêu cầu:
- Cấu hình `linkOTA_ESP_32` thành local server.
- Thử update firmware.

### 58.16 Bài tập 16: Thêm lệnh reset từ web

Yêu cầu:
- `POST /control?com=3&value=0`
- reset thiết bị.

### 58.17 Bài tập 17: Thêm bảo mật cho route `/setup`

Yêu cầu:
- Yêu cầu password trước khi ghi cấu hình.

### 58.18 Bài tập 18: Lưu lại timestamp của mỗi sensor

Yêu cầu:
- Thêm trường `timestamp`.
- Trả về khi gọi API.

### 58.19 Bài tập 19: Thêm trạng thái online/offline trên dashboard

Yêu cầu:
- Cập nhật status khi thiết bị kết nối MQTT.

### 58.20 Bài tập 20: Viết hướng dẫn developer

Yêu cầu:
- Viết tài liệu README chi tiết.
- Bao gồm các bước cài đặt, chạy, test.

## 59. Glossary mở rộng

### 59.1 ESP32

Bộ vi điều khiển tích hợp WiFi/Bluetooth.

### 59.2 Node.js

Môi trường chạy JavaScript phía server.

### 59.3 Express

Framework web cho Node.js.

### 59.4 Aedes

MQTT broker nhẹ viết bằng Node.js.

### 59.5 MQTT

Giao thức publish/subscribe.

### 59.6 JSON

Định dạng dữ liệu văn bản.

### 59.7 EEPROM

Bộ nhớ lưu trữ trên board.

### 59.8 RTOS

Hệ điều hành thời gian thực.

### 59.9 API

Giao diện lập trình ứng dụng.

### 59.10 HTTP

Giao thức truyền tải siêu văn bản.

## 60. Kết luận cuối cùng

Tài liệu này hiện nay đã trình bày toàn bộ:
- Kiến thức IoT cơ bản.
- Tổng quan dự án `IOT_base`.
- Kiến trúc hệ thống.
- Data flow chi tiết.
- Phân tích module và function.
- Tutorial build/run.
- Case study và best practice.
- Hướng dẫn triển khai và mở rộng.

Bạn có thể dùng tài liệu này làm cơ sở để đào tạo người mới trong nhóm.
Nó cũng phù hợp làm tài liệu tham khảo cho developer bảo trì và mở rộng hệ thống.

---

## 61. Kiến trúc mở rộng: từ prototype tới production

Một hệ thống IoT khi chỉ có 1-2 thiết bị thường khá đơn giản. Khi quay sang production, bạn cần thay đổi nhiều thứ. Đây là hướng dẫn giúp bạn chuyển đổi từ prototype thô sang kiến trúc thực tế.

### 61.1 Từ prototype tới architecture thực tế

Trong giai đoạn prototype, bạn thường thiết kế mọi thứ trong cùng một repository. Thiết bị và server cùng chạy bên nhau, database có thể local. Tuy nhiên production yêu cầu:
- dịch vụ tách biệt,
- cấu hình rõ ràng,
- giám sát,
- khả năng mở rộng.

Điều này có nghĩa bạn nên tách:
- broker MQTT thành dịch vụ riêng,
- API server thành dịch vụ riêng,
- database thành cluster riêng,
- frontend thành ứng dụng riêng.

### 61.2 Thiết kế microservice cho IoT

Microservice cho phép bạn chia nhỏ hệ thống thành các thành phần độc lập. Với IoT, bạn có thể xây:
- service nhận MQTT,
- service xử lý business logic,
- service lưu trữ data,
- service API,
- service xác thực.

Mỗi service có thể deploy độc lập. Thậm chí một service có thể scale riêng nếu cần.

### 61.3 Broker MQTT tách riêng

Trong project hiện tại, broker Aedes chạy cùng Express. Đó là hợp lý cho phát triển. Nhưng trong production, broker nên chạy riêng biệt. Lý do:
- hiệu suất tốt hơn,
- dễ cấu hình bảo mật,
- ít phụ thuộc vào web server,
- có thể dùng các broker chuyên dụng như Mosquitto, EMQX.

Bạn chỉ cần dùng một broker và sửa firmware/Node config để connect tới broker mới.

### 61.4 API server và dữ liệu

API server nên được xây dựng rõ ràng. Nó nhận request từ frontend, xử lý logic nghiệp vụ, và truy vấn database. Nếu server bị nghẽn, toàn bộ dashboard và quản trị đều ảnh hưởng.

Trong sản phẩm lớn, bạn nên:
- dùng cache cho các request nặng,
- phân chia route theo domain,
- tách service xử lý khác biệt.

### 61.5 Database production

Database đơn giản có thể đủ cho prototype. Nhưng trong production, bạn phải quan tâm đến:
- backup,
- replication,
- sharding,
- chỉ mục,
- chính sách xóa dữ liệu.

Ví dụ, dữ liệu cảm biến 1 giây một bản ghi sẽ tăng rất nhanh. Bạn cần logic xóa dần hoặc lưu ra cold storage.

### 61.6 Giám sát và logging

Production cần giám sát. Cần biết:
- thiết bị nào offline,
- broker có hoạt động,
- API có lỗi,
- data có trễ.

Các hệ thống giám sát như Prometheus và Grafana rất phù hợp. Bạn cũng có thể dùng ELK cho log.

### 61.7 Tự động deploy

CI/CD là cần thiết. Mỗi khi có thay đổi firmware hoặc server, bạn nên có pipeline tự động:
- build,
- test,
- deploy.

Với firmware, bạn có thể dùng PlatformIO hoặc Arduino CLI trong pipeline.
Với server, bạn có thể build Docker image và deploy.

### 61.8 Quản lý thiết bị

Khi số lượng thiết bị lớn, bạn cần hệ thống quản lý thiết bị (device management). Các chức năng bao gồm:
- thiết bị đăng ký,
- version firmware,
- cấu hình tập trung,
- trạng thái online/offline.

Đây là bước tiến lớn so với prototype.

### 61.9 Chuẩn hoá dữ liệu

Prototype thường gửi JSON đơn giản như `va` và `co` trong chuỗi. Production cần chuẩn hoá dữ liệu rõ ràng. Ví dụ:
```json
{
  "device_id": "device01",
  "timestamp": 1680000000,
  "sensors": {
    "temperature": 23.0,
    "humidity": 45.0,
    "dust_pm2_5": 12,
    "dust_pm10": 20
  },
  "status": {
    "relay": 1,
    "button": 0
  }
}
```

Dữ liệu chuẩn giúp:
- lưu trữ dễ dàng,
- truy vấn dễ dàng,
- kiểm soát dữ liệu tốt hơn.

### 61.10 Document system architecture

Cuối cùng, khi dự án lớn, tài liệu phải đầy đủ. Mỗi service, mỗi file cấu hình, mỗi API cần được mô tả. Đây là lý do SDD quan trọng. Nó không chỉ là văn bản, mà là hướng dẫn cho team.

## 62. Test plan cho IoT project

Một dự án IoT cần test đa tầng: firmware, communication, backend, frontend. Dưới đây là kế hoạch test cần thiết.

### 62.1 Test firmware

Bạn nên xây dựng các test sau:
- test unit cho hàm xử lý JSON,
- test integration cho task sensor,
- test hardware nếu có jig kiểm thử.

Vì firmware tương tác phần cứng, bạn nên dùng gói test giả lập hoặc logic mềm. Ví dụ, nếu không có cảm biến, dùng giá trị fake.

### 62.2 Test MQTT

Kiểm tra:
- thiết bị có connect được broker không,
- publish/subscribe có đúng topic không,
- dữ liệu gửi/nhận có đúng cấu trúc.

Dùng MQTT client như `mqtt.fx`, `MQTT Explorer` hoặc script Python để kiểm thử.

### 62.3 Test server API

Dùng Postman hoặc Insomnia để test các endpoint.
- `GET /api/history`
- `GET /api/status`
- `POST /api/status`
- `POST /api/history`

Quan trọng:
- kiểm tra status code.
- kiểm tra JSON trả về.
- kiểm tra lỗi khi input sai.

### 62.4 Test database

Test dữ liệu thực sự được insert và query.
- MongoDB collection có bản ghi.
- MySQL table có dữ liệu.
- Dữ liệu không bị trùng.

### 62.5 Test frontend

Test giao diện hiển thị đúng.
- dashboard hiển thị cập nhật.
- điều khiển gửi lệnh thành công.

### 62.6 Test hiệu suất

Khi số thiết bị tăng, bạn cần test:
- broker có chịu tải không,
- server API có chịu được nhiều request không,
- database có trả lời nhanh không.

### 62.7 Test bảo mật

Kiểm tra:
- API có xác thực không,
- người dùng không thể truy cập trái phép,
- input được validate.

### 62.8 Test OTA

Test quy trình cập nhật firmware:
- server cung cấp file bin,
- thiết bị tải và cập nhật,
- nếu thất bại, rollback.

### 62.9 Test offline scenario

Test khi:
- WiFi mất,
- broker mất,
- thiết bị offline.

Thiết bị nên xử lý graceful.

### 62.10 Test deploy

Test deploy server và frontend sau khi thay đổi code.

## 63. Bảo mật cho IoT project

IoT rất nhạy cảm với bảo mật. Một thiết bị không bảo mật có thể bị tấn công, gây hại.

### 63.1 Bảo mật kết nối WiFi

- Dùng WPA2 hoặc WPA3.
- Không để SSID/Public password mặc định.
- Nếu có provisioning, xác thực người dùng trước khi cấu hình.

### 63.2 Bảo mật MQTT

- Dùng username/password.
- Nếu có thể, dùng TLS.
- Cấp phép ACL để chỉ cho phép topic cần thiết.

### 63.3 Bảo mật API

- Dùng JWT hoặc OAuth.
- Xác thực tất cả request quan trọng.
- Giới hạn rate limit nếu cần.

### 63.4 Bảo mật dữ liệu lưu trữ

- Mã hoá dữ liệu nhạy cảm trong database.
- Không lưu password thô.
- Nếu dùng MongoDB, bật authentication.

### 63.5 Bảo mật firmware

- Không để mã nguồn firmware dễ bị sao chép.
- Bảo vệ OTA khỏi tải file không hợp lệ.
- Dùng chữ ký số nếu có thể.

### 63.6 Bảo mật phần cứng

- Kiểm soát ai có thể truy cập thiết bị vật lý.
- Đảm bảo cổng USB không bị lạm dụng.
- Đặt vỏ bảo vệ để tránh truy cập trái phép.

### 63.7 Bảo mật logs

- Không ghi credential vào log.
- Chỉ log thông tin cần thiết.
- Bảo vệ log nếu chứa dữ liệu nhạy cảm.

### 63.8 An ninh mạng

- Dùng mạng riêng cho thiết bị IoT.
- Tách VLAN cho IoT với hệ thống khác.
- Dùng firewall để giới hạn kết nối.

### 63.9 Quản lý patch

- Theo dõi bản vá firmware.
- Cập nhật thư viện Node.js.
- Cập nhật OS cho server.

### 63.10 Chuẩn bị khi sự cố

- Có kế hoạch khôi phục.
- Có backup cấu hình.
- Có cách cô lập thiết bị bị tấn công.

## 64. Thiết kế UI/UX cho dashboard IoT

Dashboard là nơi người dùng thấy hiệu quả của hệ thống. Thiết kế UI/UX cần rõ ràng và dễ hiểu.

### 64.1 Nguyên tắc trực quan

- Thông tin quan trọng cần nổi bật.
- Giá trị sensor nên hiển thị lớn.
- Cảnh báo cần màu đỏ.

### 64.2 Biểu đồ cần thiết

- Temperature vs Time.
- Humidity vs Time.
- Dust vs Time.
- Device status timeline.

### 64.3 Điều khiển trực tiếp

- Nút bật/tắt.
- Chế độ tự động/manual.
- Cập nhật ngay khi user thay đổi.

### 64.4 Phản hồi nhanh

Khi user bấm lệnh, dashboard cần hiện trạng thái:
- lệnh đã gửi,
- đang thực hiện,
- thành công/thất bại.

### 64.5 Cảnh báo và notification

- Khi sensor vượt ngưỡng.
- Khi thiết bị offline.
- Khi firmware cần update.

### 64.6 Responsive design

Dashboard nên chạy tốt trên desktop và mobile.

## 65. Tài liệu tham khảo thêm

Cuối cùng, bạn nên tham khảo thêm những nguồn sau để nắm vững hơn:

- Arduino ESP32 documentation.
- PubSubClient examples.
- ArduinoJson guide.
- MQTT protocol specification.
- ExpressJS tutorial.
- Aedes MQTT broker docs.
- MongoDB và Mongoose docs.

---

## 66. Data modeling và schema chi tiết

Đối với hệ thống IoT, cách bạn thiết kế schema ảnh hưởng trực tiếp tới hiệu suất và khả năng mở rộng. Dưới đây là hướng dẫn chi tiết.

### 66.1 Thiết kế schema cho sensor data

Sensor data thường có khối lượng lớn và được ghi liên tục. Vì vậy schema nên nhẹ và chỉ chứa các trường cần thiết.

Một schema mẫu cho MongoDB:
```js
const SensorDataSchema = new mongoose.Schema({
  deviceId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  temperature: Number,
  humidity: Number,
  dust: Number,
  pm2_5: Number,
  pm10: Number,
  pm1: Number,
  status: {
    relay: Number,
    button: Number,
    mode: String
  }
});
```

Lợi ích:
- `timestamp` indexed để truy vấn nhanh theo khoảng thời gian.
- `deviceId` dễ phân loại thiết bị.
- Dữ liệu nested `status` chứa trạng thái điều khiển.

### 66.2 Thiết kế schema cho command history

Command history giúp bạn audit các lệnh đã gửi đến thiết bị.

Một schema mẫu:
```js
const CommandHistorySchema = new mongoose.Schema({
  deviceId: String,
  commandType: Number,
  commandValue: Number,
  requestedBy: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});
```

Cần lưu: người gửi lệnh, thời gian, trạng thái thực thi.

### 66.3 Thiết kế schema cho device config

Device config lưu thông tin cấu hình và metadata.

Schema mẫu:
```js
const DeviceConfigSchema = new mongoose.Schema({
  deviceId: String,
  mqttHost: String,
  mqttPort: Number,
  mqttTopic: String,
  wifiSSID: String,
  wifiPassword: String,
  firmwareVersion: String,
  lastSeen: Date
});
```

Lưu trữ cấu hình này giúp bạn quản lý thiết bị và deploy OTA.

### 66.4 Thiết kế schema cho user và quyền

Nếu hệ thống có nhiều người dùng, bạn cần model user.

Schema mẫu:
```js
const UserSchema = new mongoose.Schema({
  username: String,
  passwordHash: String,
  role: { type: String, default: 'operator' },
  createdAt: { type: Date, default: Date.now }
});
```

Nên dùng `bcrypt` để hash password, không lưu thô.

### 66.5 Chỉ mục và tối ưu truy vấn

Các trường nên index:
- `timestamp`
- `deviceId`
- `status`

Index giúp truy vấn lịch sử nhanh hơn.

### 66.6 Lưu trữ dữ liệu cũ

Khi dữ liệu IoT tăng nhanh, cần xóa hoặc archive dữ liệu cũ.
Có thể dùng:
- rolling collection,
- chuyển dữ liệu vào cold storage,
- giữ dữ liệu 30 ngày.

## 67. Phiên bản và release process

Để giữ cho dự án ổn định, bạn cần quy trình release rõ ràng.

### 67.1 Quản lý version firmware

Firmware nên có version rõ ràng. Có thể lưu version trong `VERSION_OTA`.

Mỗi lần deploy firmware mới:
- tăng version,
- cập nhật config OTA,
- test kỹ.

### 67.2 Quản lý version server

Server Node nên dùng semantic versioning:
- `1.0.0`,
- `1.1.0`,
- `2.0.0`.

Tạo tag git cho mỗi release.

### 67.3 Quy trình release ví dụ

1. Tạo branch feature.
2. Code và test.
3. Merge vào branch `develop`.
4. Test tổng thể.
5. Merge vào `main`.
6. Tạo tag release.
7. Deploy.

### 67.4 Release notes

Mỗi release cần ghi rõ:
- thay đổi gì,
- bug fix,
- cải tiến,
- cách khai thác.

### 67.5 Rollback

Luôn chuẩn bị kế hoạch rollback nếu release thất bại.

## 68. Onboarding checklist cho developer mới

Khi một developer mới vào dự án, đây là checklist cần có.

### 68.1 Chuẩn bị môi trường

- Clone repository.
- Cài Node.js.
- Cài Arduino IDE/PlatformIO.
- Cài MongoDB hoặc MySQL.
- Copy `.env.example` thành `.env`.

### 68.2 Tìm hiểu cấu trúc

- `DeviceIOT/`: firmware.
- `mqttClient/`: server.
- `mqttBroker/`: broker demo.
- `admin/`: frontend.

### 68.3 Chạy thử dự án đơn giản

- Nạp firmware mẫu.
- Khởi chạy server.
- Kiểm tra API `/u`.
- Kiểm tra broker hoạt động.

### 68.4 Hiểu các module chính

- `TaskSensor`.
- `TaskDevice`.
- `TaskNetWork`.
- `NetWork_Wifi`.
- `NetWork_Mqtt`.
- `server.js`.

### 68.5 Đọc tài liệu hiên tại

- SDD này.
- README trong `mqttClient/`.
- `DeviceIOT_API_Documentation.txt`.

### 68.6 Thực hành bài tập ngắn

- Thêm log.
- Chạy một request API.
- Kiểm thử một lệnh điều khiển.

## 69. Performance và scaling scenario

Một dự án IoT từ prototype nếu mở rộng lên hàng trăm thiết bị sẽ lộ yếu điểm. Dưới đây là các kịch bản.

### 69.1 Khoảng 10-20 thiết bị

- Broker Aedes nội bộ vẫn ổn.
- Server Node đơn có thể xử lý.
- Database local đủ dùng.

### 69.2 Khoảng 100 thiết bị

- Cần tối ưu broker.
- Cần kiểm tra throughput MQTT.
- Cần dùng database chịu tải.
- Cần giám sát độ trễ.

### 69.3 Hơn 500 thiết bị

- Cần broker chuyên nghiệp.
- Nên tách API và broker.
- Nên dùng queue cho xử lý dữ liệu.
- Nên dùng caching.

### 69.4 Kích thước dữ liệu

Nếu một thiết bị gửi dữ liệu mỗi giây:
- 86400 bản ghi/ngày.
- 30 thiết bị -> 2.5 triệu bản ghi.

Do đó cần chiến lược lưu trữ:
- giảm tần suất,
- xóa cũ,
- archive.

### 69.5 Tối ưu MQTT

- Dùng QoS phù hợp.
- Dùng retained messages khi cần.
- Tách topic theo device.
- Giảm payload nếu có thể.

### 69.6 Tối ưu server

- Dùng connection pool cho DB.
- Dùng load balancer nếu có nhiều request.
- Dùng cache cho dữ liệu không thay đổi nhanh.

## 70. Training plan cho team

Nếu bạn dùng tài liệu này để đào tạo, đây là kế hoạch học 4 tuần.

### 70.1 Tuần 1: Khái niệm và setup

- Học IoT cơ bản.
- Cài đặt môi trường.
- Hiểu cấu trúc repository.
- Chạy server và firmware mẫu.

### 70.2 Tuần 2: Firmware và mạng

- Đọc `TaskSensor`.
- Đọc `TaskDevice`.
- Hiểu `NetWork_Wifi`.
- Hiểu `NetWork_Mqtt`.
- Bài tập: thêm cảm biến.

### 70.3 Tuần 3: Server và API

- Hiểu `server.js`.
- Hiểu route/controller.
- Dựng API test.
- Bài tập: thêm API status.

### 70.4 Tuần 4: Mở rộng và production

- Thiết kế schema.
- Test và debug.
- Bảo mật cơ bản.
- Release và deploy.

### 70.5 Feedback và cải tiến

Sau mỗi tuần, review kết quả. Điều chỉnh tài liệu nếu cần.

## 71. Mô tả chi tiết các file config và biến môi trường

### 71.1 `.env` trong `mqttClient`

Các biến quan trọng:
- `APP_PORT`
- `APP_HOST`
- `APP_MQTT`
- `APP_MONGO`
- `DB_CLIENT`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Nếu bạn chạy server ở môi trường khác, chỉ chỉnh `.env`.

### 71.2 `package.json`

Dependencies quan trọng:
- `aedes`
- `axios`
- `bcrypt`
- `body-parser`
- `cors`
- `dotenv`
- `express`
- `mongoose`
- `mqtt`
- `mysql`
- `swagger-jsdoc`

Lưu ý: phiên bản Node nên tương thích với dependencies.

### 71.3 `mqttClient/config/express.js`

Dùng `cors` để cho phép frontend từ domain khác truy cập. Điều này cần nếu bạn chạy dashboard trên domain khác.

### 71.4 `DeviceIOT/define_All.h`

Chứa các hằng số quan trọng:
- `MODE_WIFI_ADRESS`
- `SUPPORT_RTOS`
- `COMMAND_TYPE_CONTROL`
- `COMMAND_RESERVED_CONTROL`

Nếu bạn cần thêm chế độ, có thể định nghĩa ở đây.

### 71.5 `NetWork_config.h`

Trong repo hiện tại, file này chỉ chứa `PROJECT`.
Bạn có thể mở rộng để chứa các URL OTA và SSID mặc định.

## 72. Final summary và next steps

Tài liệu này đã giải thích dự án từ nhiều góc nhìn: kỹ thuật, kiến trúc, triển khai, test, bảo mật và mở rộng. Nếu bạn muốn tiếp tục công việc, hãy thực hiện các bước sau:

1. Đọc lại phần `DeviceIOT/` và nắm vững luồng cảm biến, điều khiển, mạng.
2. Chạy server `mqttClient/` và thử các API sample.
3. Thực hiện bài tập 1-20 trong phần workbook.
4. Nâng cấp payload JSON cho chuẩn hoá.
5. Tách broker MQTT ra một dịch vụ riêng.
6. Bổ sung logging và giám sát.
7. Chuẩn bị release plan cho firmware và server.

Nếu bạn đang đào tạo người khác, hãy dùng phần `Training plan` làm khung chương trình. Tài liệu này sẽ giúp team mới nhanh chóng nắm bắt tất cả khía cạnh của một hệ thống IoT thực tế.

---

**File tạo:** `e:\ManagerProject\IOT_base\SDD_IOT_Base.md`

