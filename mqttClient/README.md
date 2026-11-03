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
