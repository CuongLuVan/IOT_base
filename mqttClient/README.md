Danh sách API
1. Lịch sử

- GET   /history    Lấy tất cả lịch sử
- GET   /history/<id>    Lấy lịch sử của thiết bị theo ID
- POST  /history    Thêm lịch sử mới



2. Status: bao gồm âm lượng, trạng thái hiện tại (play/stop), baudrate,....

- GET   /status     Lấy trạng thái hiện tại của tất cả thiết bị
- GET   /status/<id>Lấy trạng thái của thiết bị theo ID
- PUT   /status/<id>Cập nhật trạng thái của thiết bị
- POST  /status     Tạo và lưu thông tin trạng thái của thiết bị mới

3. MQTT
Cấu trúc nhận dữ liệu: 
+ topic: return_status
+ message: [idthietbi]_[tukhoa]=[value]. ví dụ: ABCA_vol=100

Khi nhận được bản tin có cấu trúc như trên thì sẽ được tạo/cập nhật vào status, history tương ứng

4. Ghi dữ liệu MQTT vào MongoDB (LissenAndReply.js)

Chạy: node LissenAndReply.js

Kết nối tới mqttBroker/MqttBroker1885.js bằng MQTTS + mTLS với chứng chỉ ECDSA P-256 của clientId
iot_data_logger (đã đăng ký trong mqtt_device_certs.json và mqtt_acl.json). Cấu hình trong .env:

MQTT_HOST=103.1.238.175
MQTT_PORT=2885
MQTT_CLIENT_ID=iot_data_logger
MQTT_CERTS=../mqttBroker/certs                (ca.crt, iot_data_logger.crt, iot_data_logger.key)
MQTT_CA_CERT= / MQTT_CLIENT_CERT= / MQTT_CLIENT_KEY=   (tùy chọn, đường dẫn riêng)
MQTT_SUBSCRIBE_TOPICS=pub_c/+,devices/+/data,iot/power/#,iot/alert/#

Không subscribe '#': broker chỉ cho phép các topic có trong mqtt_acl.json. Nếu broker từ chối
chứng chỉ, chương trình dừng thay vì thử lại (tránh bị khóa vì brute-force).
Xem mqttBroker/certs/CERTIFICATE_SETUP.md.

5. Ngữ cảnh (automation) – app/context/

Chạy trong server API (node index.js). Ngữ cảnh lưu trong bảng MySQL `mqtt_context` (tự tạo khi
khởi động nếu chưa có), nạp vào RAM khi khởi động; thêm/sửa/xóa qua API ghi SQL rồi cập nhật RAM.
Khi điều kiện trên thiết bị cài đặt chuyển từ sai sang đúng, gửi {"com":1,"value":..,"mask":..,"pa":..}
tới topic subscribe của thiết bị đích (thiết bị lấy từ bảng mqtt_microservice).

- content 1 AND / 2 OR / 3 NOT / 4 XOR trên các cổng trong state (bitmask);
  5..8: cảm biến 1..4 > state; 9..12: cảm biến 1..4 < state (giá trị "va", nhiệt độ/độ ẩm x100).
- action: bit0-7 trạng thái cổng gửi đi, bit8-15 cổng tác động (0 = cả byte).
- Chống lặp (chỉ chạy ở cạnh lên), cooldown_s, timeout_s + retry, priority, ưu tiên điều khiển thủ công
  5 phút (nút nhấn trên thiết bị, hoặc lệnh com:1 do client khác gửi tới topic subscribe), kiểm tra
  thiết bị đích (online, đã đúng trạng thái) trước khi gửi. Hỏi trạng thái `{"com":2}` mỗi 30 s tới các thiết bị liên quan.

API (POST, JSON):
- /api/context/list | /api/context/save | /api/context/delete            token customer
- /api/context/admin/list | /api/context/admin/save | /api/context/admin/delete   token admin
- save: mqtt_context_id (bỏ trống = tạo mới), name, source_device_id, target_device_id, content, state,
  action, enabled, priority, cooldown_s (30), timeout_s (10), retry (2). delete: mqtt_context_id.

Kết nối broker (khác clientId với LissenAndReply.js), trong .env:

MQTT_HOST, MQTT_PORT
MQTT_CONTEXT_CLIENT_ID=iot_context
MQTT_CERTS=../mqttBroker/certs                (ca.crt, iot_context.crt, iot_context.key)
MQTT_CA_CERT= / MQTT_CONTEXT_CERT= / MQTT_CONTEXT_KEY=   (tùy chọn)
MQTT_HMAC_SECRET= / MQTT_HMAC_KEY_ID=          (khi broker bật xác thực bản tin)
MQTT_CONTEXT_ENABLED=false                      (tắt chức năng)

Broker cần: chứng chỉ ECDSA cho iot_context (mqttBroker/certs/generate_ecdsa_certs.ps1, đăng ký trong
mqtt_device_certs.json) và rule trong mqtt_acl.json:
  { "clientId": "iot_context",
    "publish":   ["sub_c/+", "devices/+/commands/#"],
    "subscribe": ["pub_c/+", "devices/+/data", "sub_c/+", "devices/+/commands/#"] }
Không có quyền subscribe "sub_c/+" thì chỉ nút nhấn trên thiết bị được tính là điều khiển thủ công.
