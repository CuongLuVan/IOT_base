# Điều khiển qua LAN

Dùng khi broker MQTT hoặc Internet lỗi nhưng mạng LAN vẫn chạy: gửi **đúng
câu lệnh MQTT** tới thiết bị bằng HTTP trong mạng nội bộ.

Bật/tắt bằng `ENABLE_LAN_CONTROL` trong `define_All.h` (mặc định bật).

## Yêu cầu

```
POST http://<ip thiết bị>/lan
Content-Type: application/json

{"data": <lệnh MQTT>}
```

`data` là nguyên câu lệnh MQTT: một object JSON, hoặc chuỗi chứa JSON đó.

```json
{"data":{"com":1,"value":1}}
{"data":{"cmd":"STATUS_GET"}}
{"data":{"com":5,"value":1800}}
{"data":{"com":4,"value":600}}
{"data":{"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600}}
```

## Trả lời

```json
{"ip":"192.168.1.20","data":[{"se":2,"va":"...","co":"1,0,0,12","set":[],"tim":1800,"cd":0,"ip":"192.168.1.20","rc":5,"rs":0}]}
```

- `data` là các bản tin thiết bị lẽ ra publish lên MQTT cho lệnh đó, cùng
  định dạng. Qua LAN chúng **không** được publish lên MQTT.
- `ip` là địa chỉ LAN hiện tại của thiết bị.

| HTTP | Khi nào |
|---|---|
| 200 | Lệnh đã chạy, `data` có ít nhất một bản tin |
| 400 | Body không phải `{"data":<lệnh>}` hoặc quá `LAN_REQUEST_MAX_LENGTH` |
| 422 | Không có bản tin trả lời: sai chữ ký / Ascon, hoặc không có lệnh đó. Lệnh lịch / hẹn giờ bị từ chối vẫn trả 200 với `rs` ≠ 0 |

## Cách hoạt động

- Lệnh đi vào **đúng hàm xử lý tin nhắn MQTT** (`MqttDataCallback` /
  `mqttCallback`): cùng giới hạn kích thước, cùng kiểm tra chữ ký
  (`ENABLE_MESSAGE_AUTHENTICATION`) và Ascon (`ENABLE_ASCON_AEAD128`), cùng các
  lệnh `com` (1, 2, 4, 5, 8..13), `STATUS_GET`, …
- Bản tin trả lời được gom vào phản hồi HTTP thay vì publish. Không thêm trường
  replay/chữ ký của broker; nếu bật Ascon thì vẫn được mã hóa như qua MQTT.
- Chạy trong TaskNetwork, cùng luồng với MQTT callback, nên không cần khóa
  thêm.
- `STATUS_GET` (cả qua MQTT) trả thêm `"ip"` để web_manager biết địa chỉ LAN
  khi còn kết nối MQTT.
- DeviceIOT: khi chỉ broker / Internet lỗi mà WiFi vẫn kết nối, thiết bị
  **không ngắt WiFi** nữa (trước đây ngắt và kết nối lại mỗi ~20 s), server
  HTTP được phục vụ cả khi MQTT mất, và các lần thử kết nối MQTT cách nhau
  `MQTT_RETRY_INTERVAL_MS` (5 s) để server LAN vẫn trả lời kịp.

## Bảo mật

Không có xác thực riêng cho LAN: ai trong cùng mạng LAN cũng gửi được lệnh
(giống endpoint `/control` có sẵn). Trên mạng LAN không tin cậy:

- bật `ENABLE_MESSAGE_AUTHENTICATION`: lệnh LAN phải có chữ ký HMAC như lệnh
  MQTT (web_manager tự ký khi có `MQTT_HMAC_SECRET`). Thiết bị không kiểm tra
  replay, nên một lệnh đã ký bị bắt được trên LAN có thể bị gửi lại;
- hoặc tắt `ENABLE_LAN_CONTROL`.

## web_manager

Trang điều khiển thiết bị có mục **Kết nối**: Tự động / MQTT / LAN, IP thiết
bị báo, và ô nhập IP thủ công. "Tự động" dùng MQTT khi broker và thiết bị đang
trả lời qua MQTT, ngược lại gửi qua LAN nếu đã biết IP. Máy chủ web_manager
phải nằm cùng mạng LAN với thiết bị; chỉ gửi tới IPv4 nội bộ (10.x,
172.16–31.x, 192.168.x), cổng 80.
