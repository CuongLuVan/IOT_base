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

Broker hiện bật TLS, mTLS, ACL và replay protection, chỉ nghe MQTTS trên cổng `1885` (không mở listener MQTT không mã hóa cùng cổng). Broker dừng khởi động nếu không đọc được server key/certificate. Firmware bắt buộc TLS+mTLS; build sẽ thất bại nếu tắt một trong hai. Trước khi kết nối, firmware kiểm tra cấu hình MQTT, vùng PEM có null terminator trong giới hạn EEPROM và marker CA/client certificate/private key; nếu thiếu/sai định dạng, nó từ chối kết nối, không fallback sang MQTT thường hay `setInsecure()`. TLS handshake vẫn là bước xác nhận cuối cùng cho chuỗi CA, hostname/SAN, thời hạn chứng chỉ và cặp client certificate/private key.

Provision CA certificate, client certificate và private key riêng cho từng thiết bị vào EEPROM trước khi khởi động mạng. Host-post `/setup` nhận HTTP POST có JSON trong body (hoặc tham số form `data`) chứa cấu hình cùng ba trường `mqtt_ca_cert`, `mqtt_client_cert`, `mqtt_private_key`; handler kiểm tra marker PEM/kích thước, xóa ba trường PEM trước khi lưu JSON cấu hình thông thường, rồi ghi ba vùng EEPROM trong một lần commit. Mỗi trường phải có PEM certificate/private key không mã hóa bằng passphrase. Ví dụ body JSON:

```json
{
  "mqtt_host": "broker.example.local",
  "mqtt_port": 1885,
  "mqtt_client": "device1",
  "public_topic": "devices/device1/data",
  "subcribe_topic": "devices/device1/commands/#",
  "mqtt_ca_cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "mqtt_client_cert": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  "mqtt_private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
}
```

Gửi bằng HTTP `POST` với `Content-Type: application/json`; không đặt PEM trong query string hay URL. Cấu hình MQTT còn lại tiếp tục theo ví dụ bên dưới.

**Cảnh báo:** theo yêu cầu hiện tại, `/setup` chưa xác thực mật khẩu và truyền qua HTTP thường; private key có thể bị nghe lén hoặc thay thế bởi người có thể kết nối vào AP/host-post. AP `ESP_Config` hiện dùng mật khẩu mặc định `12345678`. Chỉ dùng để thử nghiệm trong môi trường cô lập; không dùng để provision thiết bị sản xuất. Trước khi triển khai thật, thêm xác thực provisioning riêng cho mỗi thiết bị và bảo vệ kênh truyền (ví dụ provisioning tại nhà máy qua USB/serial hoặc TLS có xác thực).

Đây là EEPROM giả lập trên flash, **không phải ROM bất biến**; firmware này không bật mã hóa dữ liệu lưu trữ. Không ghi PEM/private key vào log hoặc repository. Chứng chỉ phải là ECDSA P-256 (xem `mqttBroker/certs/CERTIFICATE_SETUP.md`). Các địa chỉ là `MTLS_CA_CERT_ADDRESS` (675, tối đa 703 ký tự), `MTLS_CLIENT_CERT_ADDRESS` (1379, tối đa 767) và `MTLS_PRIVATE_KEY_ADDRESS` (2147, tối đa 255); chứng chỉ RSA không vừa các vùng này. Layout đầy đủ ở `docs/Security.md`. Ghi bounded xóa phần đuôi slot cũ, giới hạn theo kích thước, và commit EEPROM; firmware sẽ từ chối kết nối nếu PEM thiếu/sai định dạng. Bật flash/NVS encryption và Secure Boot trong cấu hình sản xuất của ESP32 nếu cần bảo vệ bí mật khi thiết bị bị tháo hoặc đọc flash; việc đó cần cấu hình khóa/provision riêng theo đúng chip và quy trình sản xuất.

`mqtt_host` phải là DNS/IP mà ESP32 truy cập được và khớp SAN trong server certificate; không dùng `localhost` cho broker chạy trên máy khác. `mqtt_port` phải đúng cổng TLS của broker (`1885`), `mqtt_client` phải khớp chính xác `clientId` và fingerprint đã đăng ký tại `mqtt_device_certs.json`, topic publish không được chứa wildcard và phải được ACL cho phép. Server certificate hiện có SAN `localhost`, `127.0.0.1` và `103.1.238.175`; nếu broker chạy ở địa chỉ khác, thêm địa chỉ đó vào `mqttBroker/certs/pki.cnf` rồi cấp lại certificate. Không dùng chung private key giữa thiết bị.

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

Lệnh capture được gửi trên topic subscribe đã provision, thường là `devices/device1/commands/...`. Replay fields là metadata ngoài lệnh và không ảnh hưởng đến việc firmware parse `com`, `value`, `mode`, `udp_host` hay `udp_port`.

### Bắt đầu phiên

```json
{
  "com": 15,
  "value": 10000,
  "mode": 4,
  "udp_host": "192.168.1.50",
  "udp_port": 5005,
  "timestamp": 1710000000000,
  "nonce": "e.g. 16-or-more-random-hex-characters"
}
```

Hai giá trị cuối trong ví dụ chỉ minh họa định dạng; backend phải tạo lại `timestamp` từ đồng hồ đã đồng bộ và nonce ngẫu nhiên tại thời điểm gửi từng lệnh.

Lệnh thu mẫu là `com` = 15 (`COMMAND_TYPE_HIGH_SPEED_CAPTURE`), thay cho các lệnh chuỗi cũ `{"cmd":"capture.start|stop|status"}`. `value` = thời gian thu (ms, 1–60000), bắt buộc khi bắt đầu.

`mode` là số:

| mode | Luồng bật |
|---|---|
| `1` | ADC âm thanh, tốc độ theo `HS_AUDIO_ADC_SAMPLE_RATE_HZ` (trước đây `"adc"`) |
| `2` | ICM-42688-P, tốc độ theo `HS_ICM42688_SAMPLE_RATE_HZ` (trước đây `"imu"`) |
| `3` | ADS8866, tốc độ theo `HS_ADS8866_SAMPLE_RATE_HZ` (trước đây `"ads"`) |
| `4` | Cả ba luồng (trước đây `"all"`) |

`udp_host` là địa chỉ IPv4 của backend mà ESP32 có thể truy cập; `udp_port` phải từ 1 đến 65535.

### Dừng và hỏi trạng thái

```json
{"com":15,"value":0}
```

```json
{"com":15}
```

`value` = 0 dừng phiên; không có `value` chỉ hỏi trạng thái. Phản hồi được publish lên `public_topic` theo dạng chung `rc`/`rs` (thay `{"event":"capture.*"}` cũ):

```json
{"rc":15,"rs":0,"act":1}
{"rc":15,"rs":0,"act":0}
{"rc":15,"rs":2,"act":0}
{"rc":15,"rs":7,"act":1}
```

| `rs` | Ý nghĩa (lý do cũ) |
|---|---|
| `0` | thành công: đã bắt đầu, đã dừng hoặc trả trạng thái |
| `2` | không hợp lệ: `mode`, `udp_host` / `udp_port` hoặc `value` sai (`invalid_mode`, `invalid_udp_target`, `invalid_duration`) |
| `5` | chưa sẵn sàng: cảm biến / bộ lấy mẫu không dùng được hoặc không bắt đầu được (`sensor_or_sampler_unavailable`, `capture_start_failed`) |
| `6` | sai mật khẩu thiết bị (`pa`) |
| `7` | đang bận: đã có phiên đang chạy (`capture_busy`) |

`act` = 1 khi đang thu mẫu. Lý do chi tiết chỉ ghi ra log Serial. Phiên cũng tự dừng khi hết `value` ms.

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

Mở UDP socket trước khi gửi lệnh MQTT bắt đầu thu (`{"com":15,"value":...}`), tránh bỏ các datagram đầu phiên:

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

Mobile app chỉ cần publish lệnh MQTT và hiển thị phản hồi `{"rc":15,"rs","act"}`. Nếu app cần nhận dữ liệu mẫu trực tiếp, app phải mở UDP socket trên IP/port mà app gửi trong lệnh `{"com":15}`; nếu backend là đích UDP thì backend chịu trách nhiệm lưu trữ/chuyển tiếp dữ liệu.

## 6. Kiểm tra tích hợp

1. Cho backend bind UDP port trước, xác nhận firewall/router cho phép UDP từ ESP32.
2. Bắt đầu từng mode riêng, kiểm tra magic/version, kích thước và thứ tự byte.
3. Kiểm tra `sequence` và `dropped_samples` ở nhiều thời lượng; kiểm tra cả log serial `Capture finished`.
4. Chạy `all` trong điều kiện Wi-Fi thực tế và đối chiếu tốc độ nhận, số sequence thiếu, CPU/Wi-Fi stability.
5. Chỉ chấp nhận ngưỡng tốc độ/mất mẫu sau khi đo logic analyzer/oscilloscope tại GPIO/CNV và so sánh với số mẫu nhận được. UDP không cung cấp đảm bảo giao nhận.
