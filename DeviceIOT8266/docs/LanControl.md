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
{"data":{"com":2}}
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
| 408 | Header (và body tới `HTTP_PREBUFFER_MAX_LENGTH` byte) không đến đủ trong `HTTP_REQUEST_TIMEOUT_MS` (3 s); kết nối bị đóng |
| 413 | `Content-Length` lớn hơn `LAN_REQUEST_MAX_LENGTH`: từ chối trước khi đọc body |
| 431 | Header dài hơn `HTTP_HEADER_MAX_LENGTH` (1024 byte) |
| 422 | Không có bản tin trả lời: JSON sai, sai chữ ký / Ascon, hoặc `{"com":7}` khi bật Ascon (bắt tay luôn trả lời qua MQTT; tắt Ascon thì com 7 trả `rs` 2). Lệnh không tồn tại hoặc bị từ chối (sai trường, sai mật khẩu, lịch xung đột...) vẫn trả 200 với `rs` ≠ 0, ví dụ `[{"rc":99,"rs":2}]` |

## Cách hoạt động

- Lệnh đi vào **đúng hàm xử lý tin nhắn MQTT** (`mqtt::dispatch` trong
  `CommandDispatcher.cpp`): cùng giới hạn kích thước, cùng kiểm tra chữ ký
  (`ENABLE_MESSAGE_AUTHENTICATION`) và Ascon (`ENABLE_ASCON_AEAD128`), cùng các
  lệnh `com` (1, 2, 4, 5, 8..14; 15 chỉ DeviceIOT) — mọi lệnh đều là `{"com":<số>}`, không còn `"cmd"`
- Bản tin trả lời được gom vào phản hồi HTTP thay vì publish. Không thêm trường
  replay/chữ ký của broker; nếu bật Ascon thì vẫn được mã hóa như qua MQTT.
- Bản tin bắt tay Ascon (`{"rc":7,...}`, khi trả lời `{"com":7}` hoặc khi khóa
  đến hạn xoay trong lúc chạy lệnh LAN) luôn được publish lên broker, không
  nằm trong phản hồi LAN. Nếu broker không kết nối thì khóa mới không được
  công bố và trả lời LAN cần mã hóa bị bỏ (422).
- Vì vậy khi bật Ascon, LAN **không phải đường dự phòng** khi mất broker: khóa
  phiên chỉ có sau khi bản tin bắt tay được publish qua MQTT, nên nếu broker
  chưa từng kết nối từ lúc khởi động (hoặc khóa đến hạn xoay khi broker mất)
  thì `/update`, `/control`, `/lan` đều trả lỗi (fail-closed). Cần LAN dự
  phòng thì tắt `ENABLE_ASCON_AEAD128` và dùng mật khẩu lệnh.
- Chạy trong TaskNetwork, cùng luồng với MQTT callback, nên không cần khóa
  thêm.
- `{"com":2}` (cả qua MQTT) trả thêm `"ip"` để web_manager biết địa chỉ LAN
  khi còn kết nối MQTT.
- DeviceIOT (ESP32): khi chỉ broker / Internet lỗi mà WiFi vẫn kết nối, thiết bị
  **không ngắt WiFi** nữa (trước đây ngắt và kết nối lại mỗi ~20 s), server
  HTTP được phục vụ cả khi MQTT mất, và các lần thử kết nối MQTT cách nhau
  `MQTT_RETRY_INTERVAL_MS` (5 s) để server LAN vẫn trả lời kịp.
- DeviceIOT8266: server HTTP vốn đã chạy khi WiFi kết nối, kể cả khi MQTT mất,
  và kết nối lại MQTT đã được giãn bằng `MQTT_RECONNECT_DELAY_MS`.

## Bảo mật

Lệnh LAN cũng phải có `"pa"` = mật khẩu thiết bị (xem `Schedule.md`, mục Mật
khẩu lệnh); sai → `{"rc":<com>,"rs":6}`. web_manager gắn `pa` từ `mqtt_pass`.
Mật khẩu đi dạng chữ rõ trong HTTP trên LAN.

Ngoài mật khẩu lệnh (`pa`, gửi dạng chữ rõ) không có xác thực riêng cho LAN.
Trên mạng LAN không tin cậy:

- bật `ENABLE_MESSAGE_AUTHENTICATION`: lệnh LAN phải có chữ ký HMAC như lệnh
  MQTT. Thiết bị không kiểm tra
  replay, nên một lệnh đã ký bị bắt được trên LAN có thể bị gửi lại;
- hoặc tắt `ENABLE_LAN_CONTROL`.

## web_manager

Điều khiển LAN **không đi qua máy chủ web_manager**: trình duyệt trên máy
người dùng (cùng mạng LAN với thiết bị) gửi thẳng `POST http://<ip>/lan`, tự
dựng lệnh `{"com":...}` và tự tách bản tin trả lời (trạng thái, `set`, `tim`,
`cd`, danh sách lịch, mã `rs`). Máy chủ chỉ dùng cho MQTT.

- Mục **Kết nối** trên trang thiết bị: Tự động / MQTT / LAN, IP thiết bị báo
  và ô nhập IP thủ công (lưu trong trình duyệt). "Tự động" dùng MQTT khi máy
  chủ, broker và thiết bị đang trả lời qua MQTT (trong 60 s), ngược lại LAN.
- IP lấy từ trường `"ip"` thiết bị gửi qua MQTT (trả lời `{"com":2}`) hoặc trong trả
  lời LAN, lưu trong trình duyệt; danh sách thiết bị cũng được lưu để vẫn
  điều khiển được qua LAN khi không gọi được máy chủ.
- Thiết bị trả lời CORS (`Access-Control-Allow-Origin: *`) và preflight
  `OPTIONS /lan` (có `Access-Control-Allow-Private-Network: true` cho Chrome).
  Trang gửi `Content-Type: text/plain` để tránh preflight khi có thể.
- Nếu trang web_manager mở bằng **HTTPS**, trình duyệt có thể chặn gọi
  `http://` tới thiết bị (mixed content / truy cập mạng cục bộ): cần cho phép
  truy cập mạng cục bộ trong trình duyệt hoặc mở trang bằng HTTP trong LAN.
- Trình duyệt không có khóa HMAC: khi bật `ENABLE_MESSAGE_AUTHENTICATION`,
  lệnh LAN từ trang sẽ bị từ chối (422).
