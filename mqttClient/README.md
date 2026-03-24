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
