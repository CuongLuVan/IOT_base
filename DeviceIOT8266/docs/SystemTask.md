# SystemTask — giám sát hệ thống

`SystemTask` chạy trên core 0 với ưu tiên thấp hơn `TaskNetWork` và `TaskSensor`. Mặc định task kiểm tra mỗi 5 giây; task chỉ quan sát trạng thái, không đọc cảm biến, không gửi UDP trực tiếp, không quản lý kết nối lại và không reset thiết bị.

## Trách nhiệm và số liệu

- Lấy trạng thái FreeRTOS và stack high-water mark của `TaskDevice`, `TaskSensor`, `TaskNetwork` và `SystemTask`.
- Theo dõi heap còn trống/cực tiểu, uptime, Unix epoch và trạng thái đồng bộ thời gian. Nếu Wi-Fi đã kết nối nhưng system clock chưa hợp lệ, task yêu cầu SNTP không blocking và thử lại tối đa mỗi 60 giây cho đến khi đồng hồ hợp lệ.
- Theo dõi số mẫu đã đóng gói, deadline bỏ lỡ, mẫu bị loại, UDP packet gửi thành công/lỗi và số lần packet queue đầy. Ba mảng số liệu theo thứ tự `adc`, `imu`, `ads`.
- Đọc trạng thái Wi-Fi/MQTT từ `TaskNetWork`; trạng thái UDP chỉ cho biết đường truyền Wi-Fi sẵn sàng và có cập nhật lỗi gửi riêng, vì UDP không có handshake trạng thái kết nối.
- Ghi snapshot để `TaskNetWork` publish sự kiện `system.status` lên MQTT mỗi 30 giây khi MQTT connected. Việc publish vẫn thuộc riêng `TaskNetWork`, tránh nhiều task gọi cùng MQTT client.

Payload telemetry chứa các trường `uptime_ms`, `epoch_s`, `clock_valid`, `schedule_misses`, `heap_free_bytes`, `heap_min_free_bytes`, `udp_queue_depth`, `network`, `tasks` và `capture`. `tasks[].stack_hwm_units` dùng đơn vị do FreeRTOS port cung cấp. `cpu_usage_supported` hiện là `false`; không bật runtime accounting ngầm vì cần cấu hình compile-time riêng cho nền tảng.

## Không can thiệp realtime

Task giám sát không chạy trong vòng đọc sensor. Bộ đếm mẫu được cộng theo batch khi packet hoàn thành thay vì thực hiện thao tác MQTT hoặc log trên mỗi mẫu. Debug log mặc định tắt (`SYSTEM_TASK_DEBUG_LOG=0`); nếu bật, log cách nhau ít nhất 60 giây. Telemetry được gửi từ task mạng và không block task sensor.

Task đếm các chu kỳ lịch bị trễ nếu thời gian thu thập snapshot kéo dài ít nhất một chu kỳ giám sát. Mất Wi-Fi/MQTT/UDP chỉ được phản ánh qua trạng thái và bộ đếm lỗi; không tự restart hay reset MCU. Watchdog không bị thay đổi.

Các thông số cấu hình nằm trong `define_All.h`:

| Define | Mặc định |
|---|---:|
| `TASK_SYSTEM_PRIORITY` | 1 |
| `TASK_SYSTEM_STACK_SIZE` | 4096 |
| `SYSTEM_TASK_CHECK_INTERVAL_MS` | 5000 ms |
| `SYSTEM_TASK_NTP_RETRY_INTERVAL_MS` | 60000 ms |
| `SYSTEM_TASK_TELEMETRY_INTERVAL_MS` | 30000 ms |
| `SYSTEM_TASK_DEBUG_LOG` | 0 |
| `SYSTEM_TASK_DEBUG_LOG_INTERVAL_MS` | 60000 ms |

Số liệu mẫu/packet và uptime là bộ đếm RAM, reset khi khởi động và có thể wrap ở giới hạn `uint32_t`; chúng không phải bản ghi bền vững.
