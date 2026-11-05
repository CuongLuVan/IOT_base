# Lịch cục bộ (ScheduleEngine)

Triển khai `DeviceIOT/spec_v1.txt`, cùng giao thức, layout EEPROM và logic
với DeviceIOT (ESP32): tối đa **20 lịch**, lưu EEPROM, chạy không cần Internet
sau khi đồng hồ đã hợp lệ, MQTT điều khiển trực tiếp luôn ưu tiên.

Khác biệt trên ESP8266:

- Chỉ có một ngõ ra (bơm, GPIO4/D2): `SCHEDULE_ALLOWED_PORT_MASK` =
  `DEVICE_OUTPUT_MASK` = `0x01`. `port_mask` có bit khác → `INVALID`.
- `SUPPORT_RTOS 0` (mặc định): mọi thứ chạy trong `loop()` nên không cần
  mutex; hàng đợi lệnh lịch là ring buffer 10 phần tử. `SUPPORT_RTOS 1`: dùng
  mutex và queue FreeRTOS như DeviceIOT.
- `ScheduleCore.h`, `ScheduleEngine.h` và `tests/` giống hệt DeviceIOT; chỉ
  phần nền tảng (khóa/hàng đợi) trong `ScheduleEngine.cpp` khác.

## Thành phần

| File | Vai trò |
|---|---|
| `ScheduleCore.h` | Logic thuần (không phụ thuộc Arduino): mã hóa 6 byte + metadata, CRC8, ngày/thứ, xung đột, gộp lịch, `PortController` (ưu tiên trực tiếp + Auto OFF). Test trên máy tính: `tests/schedule_core_test.cpp`. |
| `ScheduleEngine.h/.cpp` | Bảng lịch trong RAM, đọc/ghi EEPROM, đánh giá lịch đến hạn, hàng đợi lệnh cho `TaskDevice`. |
| `SystemTask.cpp` | Mỗi chu kỳ 5 s gọi `ScheduleEngine::process()` rồi `flush()` (không tạo task mới; NON-OS: gọi từ `TaskNetWork::loopNetWork()`). |
| `TaskDevice.cpp` | Áp lệnh lên `device_port`, quản lý quyền điều khiển từng cổng, Auto OFF. |
| `NetWork_Mqtt.cpp` | Lệnh lịch `com` 8..13, trả bản tin trạng thái rút gọn (`rc`/`rs`). |

```
MQTT com 8..12 ──> ScheduleEngine (RAM, dirty) ──flush (SystemTask)──> EEPROM
SystemTask 5 s ──> process(time) ──> hàng đợi lệnh lịch ──> TaskDevice ──> GPIO
MQTT/HTTP com:1, nút nhấn ─────────────────────────────────> TaskDevice (ưu tiên)
```

## Vùng EEPROM (2831..3054, 224 byte)

Đặt **sau** vùng cuối cùng của layout cũ (khóa Ascon kết thúc ở 2830), nên
không địa chỉ nào cũ bị dịch. `EEPROM_SIZE` = 3063 (gồm 4 byte hẹn giờ tự tắt và 4 byte đếm ngược phía sau) (< 3 KB, trong sector 4 KB).
`EEPROM.begin()` với kích thước lớn hơn giữ nguyên dữ liệu cũ; vùng lịch được
định dạng ở lần khởi động đầu. Vùng 115..226 (lịch bơm cũ) giữ chỗ, không còn
đọc; lịch cũ không được chuyển sang.

| Địa chỉ | Kích thước | Nội dung |
|---|---|---|
| 2831 | 4 | Header: `'S' 'C'`, version `1`, số slot `20` |
| 2835 | 20 × 6 | Bản ghi lịch id 1..20 (định dạng spec §2, không đổi) |
| 2955 | 20 × 5 | Metadata id 1..20 |

Bản ghi 6 byte: `hour, minute, weekday, port_state, auto_off_lo, auto_off_hi`.
`weekday` bit0 = Thứ 2 … bit6 = Chủ nhật; `0x00` = lịch một lần (ONCE).

Metadata 5 byte: `flags, port_mask, day_lo, day_hi, crc8`.

- `flags`: bit0 đang dùng, bit1 bật. (bit2 "đã xong" chỉ có trong RAM.)
- `day` (số ngày kể từ 1970-01-01, theo giờ địa phương): với ONCE là ngày chạy;
  với WEEKLY luôn lưu 0.
- `crc8` phủ 6 byte bản ghi + 4 byte metadata đầu. Slot hỏng CRC hoặc dữ liệu
  sai bị bỏ riêng slot đó; header sai thì định dạng lại cả vùng.

**EEPROM chỉ được ghi khi cấu hình thay đổi** (thêm/sửa/xóa/bật/tắt/xóa
hết lịch, `com` 8..12), không bao giờ ghi khi lịch chạy. Lịch sử hoạt động
(ngày WEEKLY chạy gần nhất, ONCE đã xong) chỉ nằm trong RAM. Việc ghi diễn ra
trong `SystemTask`, không trong MQTT callback. `EEPROM.write()` chỉ đánh dấu
byte thay đổi và `commit()` bỏ qua khi không có gì đổi.

**Lưu ý ESP8266:** `EEPROM.commit()` xóa rồi ghi lại cả sector flash, không
phải giao dịch nguyên tử như NVS của ESP32. Mất điện đúng lúc commit có thể
làm hỏng cả sector (kể cả cấu hình WiFi/MQTT) — rủi ro này đã có với mọi lần
lưu cấu hình. Vì lịch chạy không ghi flash, số lần ghi chỉ bằng số lần cấu
hình lịch.

## Lệnh MQTT (và LAN)

Gửi vào topic subscribe như các lệnh hiện có, hoặc qua LAN
(`docs/LanControl.md`). Nếu bật Ascon thì bọc `{"com":1,"value":...}` như mọi
lệnh khác. Trên ESP8266 chỉ có `po` = 1.

| `com` | Lệnh | Ví dụ |
|---|---|---|
| 5 | Hẹn giờ tự tắt (xem mục dưới) | `{"com":5,"value":1800}` |
| 8 | Thêm lịch | `{"com":8,"id":1,"ho":7,"mi":30,"we":31,"po":1,"pos":1,"au":600}` |
| 9 | Sửa lịch (cùng trường như thêm) | `{"com":9,"id":1,"ho":7,"mi":45,"we":31,"po":1,"pos":1,"au":900}` |
| 10 | Xóa lịch | `{"com":10,"id":1}` |
| 11 | Bật / tắt lịch | `{"com":11,"id":1,"value":1}` (`0` = tắt) |
| 12 | Xóa tất cả lịch | `{"com":12}` |
| 13 | Đọc danh sách lịch | `{"com":13,"fr":1}` |

Các số khác đã dùng: 1 điều khiển, 2 trạng thái, 3 (nội bộ), 4 đếm ngược,
6/7 Ascon.

Trường của lịch (com 8, 9):

| Trường | Ý nghĩa | |
|---|---|---|
| `id` | số lịch 1..20 | bắt buộc (trừ 12, 13) |
| `ho`, `mi` | giờ 0..23, phút 0..59 | bắt buộc |
| `we` | weekday bitmask: T2=1, T3=2, T4=4, T5=8, T6=16, T7=32, CN=64; `0` = một lần | bắt buộc |
| `po` | port_mask: cổng lịch điều khiển (bit0 = cổng 1 …) | mặc định `0x01` (bơm); bit ngoài vùng này → bị từ chối |
| `pos` | port_state: bit = 1 bật, 0 tắt (chỉ trong `po`) | bắt buộc |
| `au` | auto_off 0..65535 giây, `0` = không tự tắt | mặc định 0 |
| `en` | `0` = lưu ở trạng thái tắt | mặc định 1 |
| `ye`, `mo`, `da` | ngày chạy của lịch một lần (`we` 0); thời điểm đã qua → bị từ chối | khi `we` = 0 |

### Trả lời

Mọi lệnh (trừ 13) trả về **bản tin trạng thái rút gọn** (như `STATUS_GET`)
cộng thêm kết quả:

```json
{"se":2,"va":"...","co":"1,0,0,12","set":["7,30,31,1,600"],"tim":1800,"cd":0,"ip":"192.168.1.20","rc":8,"rs":0,"id":1}
{"se":2,"va":"...","co":"1,0,0,12","set":["7,30,31,1,600"],"tim":1800,"cd":0,"ip":"192.168.1.20","rc":8,"rs":1,"id":3,"ci":1,"cp":1}
```

| Trường | Ý nghĩa |
|---|---|
| `rc` | `com` của lệnh được trả lời |
| `rs` | kết quả: 0 thành công, 1 trùng lịch, 2 không hợp lệ, 3 không có lịch, 4 id đã dùng, 5 chưa sẵn sàng |
| `id` | id lịch của lệnh (không có với 5, 12) |
| `ci`, `cp` | khi `rs` = 1: id lịch bị trùng và các cổng trùng |

Lý do chi tiết khi bị từ chối chỉ ghi ra log Serial, không gửi đi.

Idempotent (QoS 1 gửi lại): thêm lịch y hệt lịch đã có → `rs` 0; thêm vào id
đã dùng với nội dung khác → `rs` 4 (dùng com 9); xóa lại → `rs` 0; bật/tắt lặp
→ `rs` 0.

`{"com":13,"fr":1}` trả tối đa 10 lịch/lần (giữ dưới 1024 byte):

```json
{"rc":13,"mx":20,"cv":1,"nx":0,"it":[[1,7,30,31,1,1,600,1,0,""],[2,18,0,0,1,1,0,1,0,"2026-12-24"]]}
```

Mỗi dòng `it`: `id,ho,mi,we,po,pos,au,en,dn,date` (`dn` = lịch một lần đã
chạy; `date` = ngày chạy của lịch một lần, hoặc ngày chạy gần nhất kể từ lần
khởi động của lịch tuần). `mx` = số lịch tối đa, `cv` = 1 khi đồng hồ hợp lệ,
`nx` ≠ 0 → gửi lại với `"fr":nx`.

Lệnh trực tiếp hiện có không đổi: `{"com":1,"value":X}` (X = 0..1) vẫn đặt
toàn bộ ngõ ra. Thêm tùy chọn `"mask"`: `{"com":1,"value":1,"mask":1}`.

## Đọc trạng thái và lịch hiện tại: `STATUS_GET`

```json
{"cmd":"STATUS_GET"}
```

Thiết bị trả lời bản tin trạng thái rút gọn ở trên (không có `rc`/`rs`):
`se`, `va`, `co` như bản tin định kỳ, cộng thêm `set` (các lịch đang hoạt
động), `tim` (hẹn giờ tự tắt, giây; `0` = không dùng), `cd` (đếm ngược tự bật,
số giây còn lại; `0` = không đếm) và `ip` (địa chỉ LAN).

Mỗi phần tử `set` là đúng bản ghi 6 byte trong EEPROM, dạng chữ
`"giờ,phút,weekday,port_state,auto_off"`:

| Ví dụ `"8,20,1,4,5"` | Ý nghĩa |
|---|---|
| `8,20` | 08:20 |
| `1` | weekday bitmask: bit0 = Thứ 2 → thứ 2 hằng tuần (`0` = lịch một lần) |
| `4` | port_state `0x04`: cổng 3 bật |
| `5` | auto_off: tự tắt sau 5 giây (byte 4 + byte 5 × 256; `0` = không tự tắt) |

- Chỉ gồm các lịch **đang hoạt động** (đã bật, lịch một lần chưa chạy), sắp
  theo giờ cài đặt (cùng giờ thì theo id).
- Giống bản ghi 6 byte, `set` không có `port_mask`, id hay ngày của lịch một
  lần; một lịch chỉ tắt cổng hiện `port_state` = 0. Cần các thông tin đó (để
  sửa/xóa lịch) thì dùng `{"com":13}`.
- Đọc từ RAM, không ghi EEPROM. Với 20 lịch bản tin dài khoảng 600 byte.

## Hẹn giờ tự tắt (OnTimer, độc lập với lịch)

Cổng nào **bật liên tục đủ N giây thì tự tắt**, dù được bật bằng MQTT
(`com:1`), giữ nút 3 s hay lịch. N là một giá trị chung cho mọi cổng.

- Lưu **4 byte** tại 3055..3058 (`ON_TIMER_EEPROM_ADDRESS`, ngay sau vùng
  lịch): uint32 little-endian, đơn vị giây, **1..86400 (24 h)**; `0` = không
  dùng. Byte trống/hỏng (vd. `FF FF FF FF`) được coi là `0`.
- EEPROM chỉ được ghi khi giá trị **thay đổi**, trong
  `SystemTask` (`OnTimer::flush()`), không trong MQTT callback.
- Đếm bằng `millis()` (không cần NTP). Cổng tắt rồi bật lại thì đếm lại từ
  đầu. Đổi N có hiệu lực ngay với cổng đang bật (vd. đặt 60 s cho cổng đã bật
  10 phút → tắt ở chu kỳ `TaskDevice` kế tiếp).
- Không thay đổi lịch hay `PortController`: nếu lịch có `auto_off` ngắn hơn
  thì `auto_off` tắt trước; mốc nào đến trước thì tắt trước.

```json
{"com":5,"value":1800}
{"com":5,"value":0}
{"com":5}
```

`value` = số giây (1..86400), `0` = tắt hẹn giờ, không có `value` = chỉ đọc.
Trả lời là bản tin trạng thái rút gọn với `"rc":5`, `rs` 0 (hoặc 2 khi
`value` sai) và `tim` = giá trị đang dùng.

## Đếm ngược tự bật (Countdown, độc lập với lịch)

Đếm ngược **một lần**: sau N giây thiết bị bật các cổng, rồi dừng. N từ
**1 giây đến 86400 (24 h)**.

```json
{"com":4,"value":600}
{"com":4,"value":600,"mask":2}
{"com":4,"value":0}
{"com":4}
```

- `com` = 4 (`COMMAND_TYPE_COUNTDOWN`), `value` = số giây. Gửi lệnh mới khi
  đang đếm thì đếm lại từ đầu với giá trị mới.
- `mask` (không bắt buộc): cổng sẽ bật, bit0 = cổng 1, bit1 = cổng 2; mặc
  định mọi cổng ra (`SCHEDULE_ALLOWED_PORT_MASK`).
- `value` = 0: hủy đếm ngược. Không có `value`: chỉ đọc trạng thái.
- Khi hết giờ, cổng được bật như một lệnh trực tiếp (`com:1`): hủy Auto OFF
  của lịch trên cổng đó; hẹn giờ tự tắt (nếu bật) bắt đầu đếm từ lúc này.
- Bộ đếm chỉ nằm trong RAM, đếm bằng `millis()` (không cần NTP): **mất điện
  hoặc khởi động lại thì đếm ngược bị hủy**.
- **4 byte** tại 3059..3062 (`COUNTDOWN_EEPROM_ADDRESS`): uint32
  little-endian, chỉ lưu N của lần đếm gần nhất để web hiện lại. Chỉ ghi khi N
  khác lần trước, trong `SystemTask` (`Countdown::flush()`).

Trả lời:

```json
{"cmd":"COUNTDOWN_ACK","status":"SUCCESS","remain":600,"mask":3,"sec":600,"message":"Countdown started"}
{"cmd":"COUNTDOWN_ACK","status":"SUCCESS","remain":0,"mask":0,"sec":600,"message":"Countdown cancelled"}
```

`remain` = số giây còn lại (0 = không đếm), `mask` = cổng sẽ bật, `sec` = N
gần nhất. `STATUS_GET` cũng trả `cd` = số giây còn lại.

## Xung đột

Hai lịch xung đột khi cùng giờ:phút, có ngày trùng (WEEKLY∩WEEKLY theo bit,
ONCE theo thứ của ngày đó), cùng quản lý một cổng và yêu cầu khác nhau: khác
ON/OFF, hoặc cùng ON nhưng khác `auto_off`.

- Khi ADD/UPDATE/ENABLE: từ chối lịch mới (`CONFLICT`), giữ lịch cũ.
- Khi chạy (phòng trường hợp còn sót): cổng xung đột bị bỏ qua ở mọi lịch
  trong phút đó; cổng khác vẫn chạy; lịch cùng trạng thái được gộp.

## Ưu tiên điều khiển trực tiếp

`TaskDevice` giữ `PortController` cho 8 cổng (`manualOverride`,
`scheduleGeneration`, `autoOffDeadline`):

- Lệnh trực tiếp (MQTT/HTTP `com:1`, giữ nút 3 s): đổi ngay cổng trong mask,
  đặt override, tăng generation → Auto OFF cũ của cổng đó vô hiệu.
- Sự kiện lịch kế tiếp trên cổng đó: xóa override, áp trạng thái, đặt Auto OFF
  mới nếu bật và `auto_off > 0`.
- Auto OFF chỉ tắt khi generation còn khớp và không override, nên lịch cũ
  không thể tắt cổng vừa được bật lại bởi lệnh trực tiếp hoặc lịch khác.
- Lệnh lịch và lệnh trực tiếp đến cùng chu kỳ `TaskDevice`: lịch áp trước,
  lệnh trực tiếp áp sau (thắng).

## Thời gian và khôi phục sau reboot

- Chỉ chạy khi `time()` hợp lệ (NTP; ≥ 2024-01-01). Không dùng `millis()`.
  Sau khi đã đồng bộ, đồng hồ ESP8266 tiếp tục chạy khi mất Internet.
- Giờ địa phương = UTC + `SYSTEM_TASK_TIMEZONE_OFFSET_SECONDS`
  (mặc định 0; **Việt Nam đặt `7 * 3600`**).
- Lần đầu có giờ hợp lệ sau khởi động: chỉ xét phút hiện tại. Lịch có giờ
  trước đó không chạy lại; ONCE đã qua giờ được đánh dấu xong (trong RAM),
  không chạy muộn. Không cần lịch sử trong EEPROM để biết điều này.
- Ngoại lệ duy nhất: thiết bị khởi động lại **ngay trong phút** một lịch vừa
  chạy thì lịch đó chạy thêm một lần. Lệnh ON/OFF lặp lại cho cùng trạng thái;
  Auto OFF được tính lại từ lần chạy sau.
- Task bị trễ: bù tối đa `SCHEDULE_CATCHUP_MINUTES` (5) phút.
- Hàng đợi lệnh đầy: không đánh dấu đã chạy, thử lại chu kỳ sau.

## Kiểm thử

`tests/schedule_core_test.cpp` (chạy trên máy tính) phủ test case 1–10, 15
của spec ở mức logic: đúng ngày, cô lập cổng, Auto OFF 600/0, xung đột, Direct
OFF/ON, Auto OFF cũ bị bỏ qua, khôi phục quyền lịch, ADD trùng, mã hóa/CRC.

```
g++ -std=c++17 -Wall -Wextra tests/schedule_core_test.cpp -o schedule_core_test && ./schedule_core_test
```

Test cho `port_mask` 3 (Port 2) trong file kiểm tra logic chung, không phụ
thuộc số ngõ ra của board.

Test 11–14 (reboot, mất Internet, mất điện, xóa lịch) cần chạy trên thiết bị.
