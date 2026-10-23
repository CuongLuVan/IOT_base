# Giao thức thu mẫu tốc độ cao

Tài liệu này mô tả phần firmware ESP32 và giao diện ghép nối cho backend/mobile. MQTT chỉ dùng để điều khiển và nhận trạng thái; dữ liệu mẫu đi trực tiếp từ ESP32 tới backend bằng UDP.

Giám sát heap/task/network và telemetry `system.status` được mô tả trong [SystemTask.md](./SystemTask.md).

## 1. Phạm vi và giới hạn

Luồng được tách theo quyền sở hữu:

1. MQTT được nhận trong `TaskNetWork`; lệnh start/stop chuyển sang `TaskSensor` qua control queue một phần tử.
2. `TaskSensor` là nơi duy nhất đọc ADC/ICM/ADS trong phiên. Nó đóng gói mẫu, rồi gửi datagram đã hoàn tất vào packet queue nội bộ không chờ.
3. `TaskNetWork` là nơi duy nhất dùng UDP/Wi-Fi cho dữ liệu tốc độ cao. Mỗi vòng nó gửi tối đa 8 datagram, chạy vòng mạng mỗi tick FreeRTOS (thường 1 ms), và UART được đọc non-blocking.
4. Trong lúc thu tốc độ cao, các bước đọc cảm biến chậm PMS/DHT tạm ngưng; chúng tiếp tục sau phiên.

Task sensor chạy ưu tiên cao hơn task mạng và ghim core 1; task mạng ghim core 0. Packet queue có 24 datagram để hấp thụ burst ngắn. Mỗi datagram mang IP/port của phiên, nên thay đổi cấu hình phiên kế tiếp không đổi đích các gói đang chờ. Sensor task nhường một tick mỗi giây để idle task/watchdog trên core 1 được chạy; khoảng ngắt này có thể làm trễ mẫu và được tính vào `dropped_samples`.

Tần số lấy mẫu được cấu hình trong `define_All.h`:

| Define | Mặc định | Áp dụng |
|---|---:|---|
| `HS_AUDIO_ADC_SAMPLE_RATE_HZ` | 10000 Hz | ADC âm thanh trên `HS_ADC_PIN` |
| `HS_ICM42688_SAMPLE_RATE_HZ` | 32000 Hz | Cả accelerometer và gyroscope ICM-42688-P |
| `HS_ADS8866_SAMPLE_RATE_HZ` | 100000 Hz | ADC ADS8866; tối đa 100000 SPS |
| `SENSOR_TASK_INTERVAL_MS` | 1000 ms | Khoảng giữa các bước đọc chậm PMS/DHT; các bước luân phiên theo `SENSOR_READ_STEP_COUNT` |

Có thể đổi các define này trước khi build. ICM-42688-P chỉ hỗ trợ các ODR phần cứng tương ứng với 32000, 16000, 12500, 8000, 6250, 4000, 3125, 2000, 1000, 500, 200, 100, 50 hoặc 25 Hz; giá trị khác sẽ làm các mode `imu` và `all` không khả dụng. Tốc độ ADC âm thanh phải lớn hơn 0 và không vượt 1000000 Hz; ADS8866 phải trong khoảng 1–100000 Hz.

Phần thu hiện dùng lịch phần mềm theo `esp_timer_get_time()`, `analogRead()` và đọc SPI; **đây là best-effort, chưa phải đường DMA/hard-real-time và không cam kết đạt đủ tốc độ hoặc không mất mẫu**. Đặc biệt, việc đọc ICM qua thanh ghi trực tiếp không dùng FIFO. Thay đổi define đặt lại tốc độ mục tiêu, không tự đảm bảo phần cứng đạt tốc độ đó.

Firmware đếm các deadline bị trễ, mẫu bị bỏ do packet queue nội bộ đầy và mẫu thuộc datagram không gửi được khi Wi-Fi/socket lỗi; các bộ đếm này được đưa vào datagram tiếp theo cùng loại. Nếu lỗi xảy ra ở datagram cuối cùng mà không còn datagram sau đó, backend không thể nhận bộ đếm cuối; cần kiểm tra sequence và lưu ý phiên hiện không có gói end-of-session chứa tổng mẫu cuối. UDP không có xác nhận giao nhận; gói có thể mất, lặp hoặc đến sai thứ tự sau khi ESP32 gửi thành công. Nếu yêu cầu đo lường không mất mẫu là bắt buộc, cần đổi đường lấy mẫu sang DMA/FIFO đã kiểm thử và bổ sung ACK/retransmit hoặc lưu cục bộ trước khi xác nhận phiên.

Mỗi phiên được giới hạn tối đa 60 giây. Chỉ một phiên được chạy tại một thời điểm. Dữ liệu bắt đầu gửi ngay khi có gói đầy; phần còn lại được gửi khi phiên kết thúc.

## 2. Kết nối phần cứng mặc định

Các chân mặc định nằm trong `define_All.h` và dành cho ESP32-WROOM-32 DevKit V1. Kiểm tra sơ đồ board và xung đột chân trước khi đấu nối.

| Tín hiệu | ESP32 GPIO | Ghi chú |
|---|---:|---|
| ADC âm thanh nội ESP32 | 34 | ADC1, input-only; dữ liệu raw 12-bit |
| ICM SCK | 25 | SPI HSPI |
| ICM MISO | 26 | SPI HSPI |
| ICM MOSI | 27 | SPI HSPI |
| ICM CS | 33 | Active-low |
| ADS8866 SCLK | 18 | SPI VSPI |
| ADS8866 SDO | 19 | MISO |
| ADS8866 CNV | 21 | Xung bắt đầu chuyển đổi |

Nối chung GND, kiểm tra mức logic/nguồn theo datasheet của từng module, và đưa tín hiệu analog vào GPIO34 cùng đầu vào analog ADS8866 theo thiết kế mạch. ADS8866 không có MOSI trong luồng đọc này. Không đổi GPIO34 sang ADC2 khi Wi-Fi đang hoạt động.

ICM phải trả `WHO_AM_I = 0x47`; nếu không, firmware vẫn cho phép chế độ `adc` và `ads`, nhưng từ chối `imu` và `all`. ADS8866 không có bước nhận dạng thiết bị trong giao thức này.

## 3. Điều khiển MQTT

ESP32 nhận lệnh trên topic `subcribe_topic` đã cấu hình hiện có và gửi phản hồi trên `public_topic`. Backend/mobile cần dùng đúng topic theo cấu hình provisioning của thiết bị. Các payload đi qua cơ chế HMAC/Ascon hiện có của firmware nếu các tùy chọn tương ứng được bật.

### Bảo mật và phân quyền theo broker `MqttBroker1885.js`

Broker hiện bật TLS, mTLS, ACL và replay protection, chỉ nghe MQTTS trên cổng `1885` (không mở listener MQTT không mã hóa cùng cổng). Broker dừng khởi động nếu không đọc được server key/certificate. Firmware mặc định dùng TLS+mTLS; mỗi thiết bị phải được provision CA certificate, client certificate và private key vào EEPROM trước khi kết nối. PEM strings phải null-terminated tại `MTLS_CA_CERT_ADDRESS`, `MTLS_CLIENT_CERT_ADDRESS` và `MTLS_PRIVATE_KEY_ADDRESS`. `mqtt_host` phải khớp tên/IP nằm trong SAN của server certificate, `mqtt_port` phải là `1885`, và `mqtt_client` phải khớp chính xác `clientId` cùng fingerprint đã đăng ký tại `mqtt_device_certs.json`. Server certificate hiện chỉ có SAN `localhost` và `127.0.0.1`, nên chưa xác thực được broker truy cập từ ESP32 qua mạng; phải cấp lại server certificate có SAN đúng với DNS name hoặc IP thực tế đã provision. Không dùng chung private key giữa thiết bị.

Firmware chỉ kết nối sau khi đồng hồ đã đồng bộ NTP để xác thực chứng chỉ TLS. Mọi JSON publish của firmware được thêm `timestamp` dạng Unix epoch milliseconds và `nonce` ngẫu nhiên trước khi publish. Simulator publisher dùng ISO-8601 timestamp và UUID nonce; broker chấp nhận cả Unix milliseconds lẫn ISO-8601. JSON lệnh do backend/mobile publish cũng phải có hai trường này ở cấp cao nhất; timestamp phải là thời gian publish hiện tại, nằm trong replay window cấu hình broker (mặc định tối đa lệch 300 giây), nonce phải được tạo mới cho từng lệnh và không được tái sử dụng trên cùng client/topic trong cửa sổ chống replay.

Thiết lập firmware theo cùng contract với simulator `mqtt_publish_sensor_simulator.js`: `mqtt_client=device1`, `public_topic=devices/device1/data`, `subcribe_topic=devices/device1/commands/#`, cổng `1885`, CA `ca.crt`, client certificate/key của `device1`. `mqtt_user` và `mqtt_pwd` không dùng cho broker mTLS hiện tại; firmware kết nối bằng client ID và chứng chỉ. Ví dụ cấu hình provisioning:

```json
{
  "mqtt_host": "localhost",
  "mqtt_port": 1885,
  "mqtt_client": "device1",
  "mqtt_user": "",
  "mqtt_pwd": "",
  "public_topic": "devices/device1/data",
  "subcribe_topic": "devices/device1/commands/#"
}
```

Ví dụ trên chỉ phù hợp khi broker và client cùng máy; ESP32 không được cấu hình `localhost` trừ khi broker chạy ngay trên ESP32. Dùng DNS/IP thật có trong SAN của server certificate. `mqtt_subscribe_sensor_simulator1.js` mô phỏng client `device2`, dùng certificate `device2` và subscribe `devices/device1/data`, đúng với ACL hiện tại. Cả hai simulator dùng `mqtts://<host>:1885`, xác thực CA và client certificate, không dùng `setInsecure`/bỏ xác thực certificate.

ACL cho `device1` cho phép publish `devices/device1/data` và subscribe `devices/device1/commands/#`; `device2` chỉ subscribe data. Backend dùng `clientId=device_iot1`, publish lệnh tới `devices/device1/commands/...` và subscribe `devices/device1/data`. ACL và SHA-256 fingerprint certificate riêng của backend đã được thêm vào `mqtt_acl.json` và `mqtt_device_certs.json`. Certificate công khai nằm tại `mqttBroker/certs/device_iot1.crt`; private key đã mã hóa bằng passphrase ngẫu nhiên và passphrase được lưu ngoài Git trong thư mục session đã giới hạn quyền truy cập. Hai simulator hỗ trợ `MQTT_CLIENT_KEY_PASSPHRASE` cùng `MQTT_CLIENT_CERT`, `MQTT_CLIENT_KEY` để kiểm tra key mã hóa; đặt passphrase trong secret manager/environment, không commit vào `.env` hoặc repository. Chuyển cả certificate, private key và passphrase tới backend qua kênh quản lý secret an toàn; không đưa private key/passphrase vào log hoặc MQTT payload. Không dùng danh tính `device1` cho backend; không chia sẻ private key giữa các client.

Lệnh capture được gửi trên topic subscribe đã provision, thường là `devices/device1/commands/...`. Replay fields là metadata ngoài lệnh và không ảnh hưởng đến việc firmware parse `cmd`, `mode`, `udp_host`, `udp_port` hay `duration_ms`.

### Bắt đầu phiên

```json
{
  "cmd": "capture.start",
  "mode": "all",
  "udp_host": "192.168.1.50",
  "udp_port": 5005,
  "duration_ms": 10000,
  "timestamp": 1710000000000,
  "nonce": "e.g. 16-or-more-random-hex-characters"
}
```

Hai giá trị cuối trong ví dụ chỉ minh họa định dạng; backend phải tạo lại `timestamp` từ đồng hồ đã đồng bộ và nonce ngẫu nhiên tại thời điểm gửi từng lệnh.

`mode` nhận một trong các giá trị:

| mode | Luồng bật |
|---|---|
| `adc` | ADC âm thanh, tốc độ theo `HS_AUDIO_ADC_SAMPLE_RATE_HZ` |
| `imu` | ICM-42688-P, tốc độ theo `HS_ICM42688_SAMPLE_RATE_HZ` |
| `ads` | ADS8866, tốc độ theo `HS_ADS8866_SAMPLE_RATE_HZ` |
| `all` | Cả ba luồng |

`udp_host` là địa chỉ IPv4 của backend mà ESP32 có thể truy cập; `udp_port` phải từ 1 đến 65535. `duration_ms` là 1–60000; nếu bỏ qua, mặc định 10000 ms.

### Dừng và hỏi trạng thái

```json
{"cmd":"capture.stop"}
```

```json
{"cmd":"capture.status"}
```

Phản hồi được publish lên `public_topic`, ví dụ:

```json
{"event":"capture.started","active":true}
{"event":"capture.stopping","active":true}
{"event":"capture.status","active":false}
{"event":"capture.error","active":false,"reason":"invalid_udp_target"}
```

Lý do lỗi hiện có thể là `invalid_mode`, `invalid_udp_target`, `invalid_duration`, `capture_busy`, `sensor_or_sampler_unavailable` hoặc `capture_start_failed`. Phiên cũng tự dừng khi hết `duration_ms`.

## 4. Định dạng gói UDP

Mỗi datagram có header 28 byte và payload binary, toàn bộ số nguyên nhiều byte dùng **big-endian**. Gói không chứa JSON.

| Offset | Kích thước | Kiểu | Ý nghĩa |
|---:|---:|---|---|
| 0 | 2 | ASCII | Magic `HS` (`0x48 0x53`) |
| 2 | 1 | u8 | Version, hiện là `1` |
| 3 | 1 | u8 | Loại: `1` ADC, `2` IMU, `3` ADS8866 |
| 4 | 4 | u32 | `session_id`, giữ nguyên trong một phiên |
| 8 | 4 | u32 | `sequence`, tăng riêng cho từng loại gói, bắt đầu từ 0 |
| 12 | 8 | u64 | Thời điểm mẫu đầu tiên trong gói, microseconds kể từ khi ESP32 khởi động |
| 20 | 2 | u16 | Số mẫu trong payload |
| 22 | 2 | u16 | Số byte payload |
| 24 | 4 | u32 | Số mẫu deadline bị bỏ hoặc gói bị tràn hàng đợi cục bộ tích lũy trước datagram này, cùng loại |
| 28 | N | bytes | Mẫu liên tiếp, không padding |

Kích thước batch hiện tại: ADC 64 mẫu; IMU 16 mẫu; ADS8866 64 mẫu. Các datagram nhỏ hơn MTU Ethernet thông thường.

### Payload theo loại

* **ADC (`type=1`)**: mỗi mẫu là `u16` big-endian, giá trị raw 12-bit của `analogRead(GPIO34)`.
* **IMU (`type=2`)**: mỗi mẫu gồm 7 giá trị `i16` big-endian theo thứ tự: `temperature_raw`, `accel_x`, `accel_y`, `accel_z`, `gyro_x`, `gyro_y`, `gyro_z`. Các giá trị là raw register, không đổi sang đơn vị vật lý. Công thức nhiệt độ theo datasheet ICM-42688-P: `°C = temperature_raw / 132.48 + 25`.
* **ADS8866 (`type=3`)**: mỗi mẫu là `u16` big-endian, mã ADC 16-bit raw.

Backend nên tách phiên bằng `session_id`, theo dõi `sequence` riêng theo `type`, kiểm tra `payload_bytes == sample_count * bytes_per_sample`, và đánh dấu mất dữ liệu nếu sequence nhảy hoặc `dropped_samples > 0`. Timestamp là thời điểm phần mềm quan sát/lấy mẫu, không phải timestamp phần cứng đã hiệu chuẩn.

## 5. Ví dụ giải mã phía backend Node.js

Mở UDP socket trước khi gửi lệnh MQTT `capture.start`, tránh bỏ các datagram đầu phiên:

```js
const dgram = require("node:dgram");
const socket = dgram.createSocket("udp4");

socket.on("message", (packet, remote) => {
  if (packet.length < 28 || packet.toString("ascii", 0, 2) !== "HS") return;

  const version = packet.readUInt8(2);
  const type = packet.readUInt8(3);
  const sessionId = packet.readUInt32BE(4);
  const sequence = packet.readUInt32BE(8);
  const timestampUs = packet.readBigUInt64BE(12);
  const sampleCount = packet.readUInt16BE(20);
  const payloadBytes = packet.readUInt16BE(22);
  const droppedSamples = packet.readUInt32BE(24);
  const bytesPerSample = type === 2 ? 14 : 2;

  if (version !== 1 || packet.length !== 28 + payloadBytes ||
      payloadBytes !== sampleCount * bytesPerSample) {
    console.error("Invalid high-speed packet", remote);
    return;
  }

  const payload = packet.subarray(28);
  console.log({ type, sessionId, sequence, timestampUs, sampleCount, droppedSamples });
  // Persist payload together with the header fields; decode signed IMU values
  // using payload.readInt16BE(offset) and ADC values using readUInt16BE(offset).
});

socket.bind(5005, "0.0.0.0");
```

Mobile app chỉ cần publish lệnh MQTT và hiển thị `event` phản hồi. Nếu app cần nhận dữ liệu mẫu trực tiếp, app phải mở UDP socket trên IP/port mà app gửi trong `capture.start`; nếu backend là đích UDP thì backend chịu trách nhiệm lưu trữ/chuyển tiếp dữ liệu.

## 6. Kiểm tra tích hợp

1. Cho backend bind UDP port trước, xác nhận firewall/router cho phép UDP từ ESP32.
2. Bắt đầu từng mode riêng, kiểm tra magic/version, kích thước và thứ tự byte.
3. Kiểm tra `sequence` và `dropped_samples` ở nhiều thời lượng; kiểm tra cả log serial `Capture finished`.
4. Chạy `all` trong điều kiện Wi-Fi thực tế và đối chiếu tốc độ nhận, số sequence thiếu, CPU/Wi-Fi stability.
5. Chỉ chấp nhận ngưỡng tốc độ/mất mẫu sau khi đo logic analyzer/oscilloscope tại GPIO/CNV và so sánh với số mẫu nhận được. UDP không cung cấp đảm bảo giao nhận.
