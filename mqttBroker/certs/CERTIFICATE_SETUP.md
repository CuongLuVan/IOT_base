# Chứng chỉ MQTT (ECDSA P-256)

Broker (`enableECDSA = true` trong `MqttBroker1885.js`) chỉ chấp nhận chứng chỉ ECDSA P-256. Đây cũng là loại duy nhất vừa vùng EEPROM của DeviceIOT/DeviceIOT8266 (< 3 KB). Chứng chỉ RSA không còn dùng được.

Có hai cách tạo:

- **Cách 1, từng lệnh openssl (Windows và Linux):** hướng dẫn ngay dưới đây. Các lệnh giống hệt nhau trên PowerShell, cmd, bash Linux và Git Bash. Mọi extension nằm trong file [`pki.cnf`](pki.cnf), nên không cần here-string/heredoc riêng của từng shell.
- **Cách 2, script PowerShell:** `.\generate_ecdsa_certs.ps1` làm tự động các bước và cập nhật `mqtt_device_certs.json`. Xem [mục cuối](#cách-2-script-powershell).

## Tạo tất cả chứng chỉ bằng openssl

### Bước 0. Cài OpenSSL và kiểm tra

Cần OpenSSL **1.1.1 trở lên** (khuyên dùng 3.x).

**Windows**, chọn một trong hai:

- Dùng bản đi kèm Git for Windows (đã có sẵn nếu cài Git). Bản này không nằm trong PATH, nên thêm vào cho cửa sổ PowerShell hiện tại:

  ```powershell
  $env:Path += ";C:\Program Files\Git\usr\bin"
  ```

  Với cmd: `set PATH=%PATH%;C:\Program Files\Git\usr\bin`
- Hoặc cài bản riêng: `winget install ShiningLight.OpenSSL.Light`, rồi mở lại terminal.

**Linux**:

```bash
sudo apt install openssl        # Debian/Ubuntu/Raspberry Pi OS
sudo dnf install openssl        # Fedora/RHEL
```

Kiểm tra (mọi hệ điều hành):

```
openssl version
```

> **Git Bash trên Windows:** Git Bash tự đổi `-subj "/CN=device1"` thành `C:/Program Files/Git/CN=device1`, làm lệnh `req` báo lỗi *subject name is expected to be in the format /type0=value0...*. Chạy lệnh này một lần trong cửa sổ Git Bash trước khi làm:
>
> ```bash
> export MSYS_NO_PATHCONV=1
> ```
>
> PowerShell, cmd và Linux không cần bước này.

### Bước 1. Chuẩn bị

Mở terminal tại thư mục chứa các chứng chỉ. Mọi lệnh bên dưới đều chạy trong thư mục này:

```
cd mqttBroker/certs
```

Mở [`pki.cnf`](pki.cnf) và sửa dòng `subjectAltName` trong mục `[v3_server]`. Dòng này phải chứa đúng tên miền hoặc IP mà thiết bị đặt trong `mqtt_host`; nếu không, thiết bị sẽ từ chối broker. Ví dụ:

```ini
subjectAltName   = DNS:mqtt.example.com,DNS:localhost,IP:192.168.1.10,IP:127.0.0.1
```

### Bước 2. Tạo CA (chỉ làm một lần)

CA ký mọi chứng chỉ khác. Nếu tạo lại CA thì phải tạo lại và nạp lại tất cả chứng chỉ server và thiết bị.

```
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve -out ca.key
openssl req -x509 -new -key ca.key -sha256 -days 3650 -subj "/CN=Local MQTT CA" -config pki.cnf -extensions v3_ca -out ca.crt
```

- `ec_paramgen_curve:P-256`: đường cong P-256 (prime256v1), loại mà ESP32 (mbedTLS), ESP8266 (BearSSL) và broker hỗ trợ.
- `ec_param_enc:named_curve`: ghi tên đường cong thay vì tham số đầy đủ. Thiết bị bắt buộc dạng này, và file cũng nhỏ hơn.
- `-days 3650`: hiệu lực 10 năm.

Muốn bảo vệ `ca.key` bằng mật khẩu, thêm `-aes256` vào lệnh `genpkey` đầu tiên. openssl sẽ hỏi mật khẩu mỗi lần ký.

### Bước 3. Tạo chứng chỉ cho broker

```
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve -out server.key
openssl req -new -key server.key -subj "/CN=localhost" -config pki.cnf -out server.csr
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 3650 -sha256 -extfile pki.cnf -extensions v3_server -out server.crt
```

Đổi `CN=localhost` thành tên miền chính của broker. Thiết bị kiểm tra tên theo `subjectAltName` ở bước 1. `server.key` và `server.crt` là hai file mà `tlsOptions` trong `MqttBroker1885.js` đọc.

### Bước 4. Tạo chứng chỉ cho từng thiết bị

Lặp lại cho mỗi `clientId` (ví dụ `device1`, `device2`, `device_iot1`). `CN` **phải đúng bằng `clientId`** mà thiết bị dùng khi CONNECT.

```
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:named_curve -out device1.key
openssl req -new -key device1.key -subj "/CN=device1" -config pki.cnf -out device1.csr
openssl x509 -req -in device1.csr -CA ca.crt -CAkey ca.key -CAcreateserial -days 3650 -sha256 -extfile pki.cnf -extensions v3_client -out device1.crt
openssl ec -in device1.key -no_public -out device1.esp.key
```

- `device1.key` (PKCS#8, 241 B) dành cho client Node.js, ví dụ `testMqtt/mqtt_publish_sensor_simulator.js`.
- `device1.esp.key` (SEC1 không chứa public key, 130 B) là cùng một khóa ở dạng nhỏ nhất, để nạp vào EEPROM. Thiết bị tự tính lại public key.

### Bước 5. Kiểm tra

```
openssl verify -CAfile ca.crt server.crt device1.crt device2.crt
```

Mỗi file phải báo `OK`. Xem lại nội dung chứng chỉ nếu cần:

```
openssl x509 -in server.crt -noout -subject -ext subjectAltName,extendedKeyUsage
openssl x509 -in device1.crt -noout -subject -ext extendedKeyUsage
```

Kiểm tra kích thước so với vùng EEPROM:

```powershell
Get-ChildItem ca.crt, device1.crt, device1.esp.key | Select-Object Name, Length    # Windows PowerShell
```

```bash
wc -c ca.crt device1.crt device1.esp.key                                          # Linux / Git Bash
```

| File | Tối đa | Thường gặp |
| --- | --- | --- |
| `ca.crt` | 703 B | 570–620 B |
| `<clientId>.crt` | 767 B | 625–640 B |
| `<clientId>.esp.key` | 255 B | 130–134 B |

Nếu file lớn hơn mức tối đa, thường là do CN hoặc SAN quá dài, hoặc nhầm sang khóa RSA.

### Bước 6. Đăng ký fingerprint với broker

```
openssl x509 -in device1.crt -noout -fingerprint -sha256
```

Chép giá trị sau `sha256 Fingerprint=` vào `../mqtt_device_certs.json`:

```json
{ "clientId": "device1", "fingerprint256": "69:41:47:C5:...:8F:BA" }
```

Nếu các tính năng tương ứng đang bật trong broker, thêm `clientId` vào `mqtt_message_auth.json`, `mqtt_client_ids.json`, `mqtt_users.json` và `mqtt_acl.json`.

### Bước 7. Dọn dẹp và phân phối

Xóa các file yêu cầu ký, vì không còn cần nữa:

```powershell
Remove-Item *.csr        # Windows PowerShell
```

```bash
rm -f *.csr              # Linux / Git Bash
```

| File | Đặt ở đâu |
| --- | --- |
| `ca.key` | Chỉ giữ ở máy tạo chứng chỉ, sao lưu an toàn. Không đưa lên broker hay thiết bị. |
| `ca.crt`, `server.crt`, `server.key` | Thư mục `mqttBroker/certs` của broker |
| `ca.crt`, `<clientId>.crt`, `<clientId>.esp.key` | EEPROM thiết bị (bảng địa chỉ bên dưới) |
| `<clientId>.crt`, `<clientId>.key` | Client Node.js (`testMqtt`) |
| `ca.srl` | Bộ đếm serial; giữ lại để các chứng chỉ ký sau có serial khác nhau |

Các file `*.key` và `*.csr` đã nằm trong `.gitignore`.

## Nạp vào EEPROM thiết bị

| File | Vùng EEPROM | Địa chỉ | Tối đa |
| --- | --- | --- | --- |
| `ca.crt` | `MTLS_CA_CERT_ADDRESS` | 675 | 703 B |
| `<clientId>.crt` | `MTLS_CLIENT_CERT_ADDRESS` | 1379 | 767 B |
| `<clientId>.esp.key` | `MTLS_PRIVATE_KEY_ADDRESS` | 2147 | 255 B |

Mỗi file được ghi dưới dạng chuỗi PEM và kết thúc bằng một byte `\0`.

Với DeviceIOT (ESP32), có thể nạp qua `POST /setup` của host-post. Gửi một JSON chứa cấu hình MQTT cùng ba trường `mqtt_ca_cert`, `mqtt_client_cert` và `mqtt_private_key` (nội dung PEM, xuống dòng viết là `\n`). Firmware kiểm tra marker PEM và kích thước, ghi cả ba vùng trong một lần commit, rồi chỉ lưu các trường MQTT cần thiết vào `WIFI_SETUP_JSON`. Xem `DeviceIOT/docs/Security.md`.

## Quản lý vòng đời thiết bị và thông tin xác thực

Mỗi thiết bị hoặc dịch vụ MQTT phải có một `clientId` riêng, một chủ sở hữu
được ghi nhận và một cặp khóa riêng. Không dùng chung private key, certificate,
message-auth key hoặc tài khoản giữa các client. Quy trình quản trị cần theo
các trạng thái **được cấp → đang hoạt động → thu hồi**; chỉ thiết bị đang hoạt
động mới được provision và có fingerprint/ACL hiệu lực.

### Cấp thiết bị và gán chủ sở hữu

1. Tạo hồ sơ thiết bị trong hệ thống quản lý, ghi `clientId` duy nhất, chủ sở
   hữu chịu trách nhiệm, mục đích, trạng thái, ngày cấp và các topic được phép.
   `clientId` phải khớp tên certificate/CN, `mqtt_device_certs.json` và ACL.
2. Cấp riêng certificate/key và message-auth key cho client. Ưu tiên sinh
   private key tại thiết bị hoặc dây chuyền tin cậy; nếu backend sinh key như
   `saveCertificateMqtt`, chuyển key tới đúng thiết bị qua kênh provisioning
   đã xác thực, không gửi qua MQTT, log, email hay kho mã nguồn.
3. Nạp CA, client certificate và private key vào thiết bị; chỉ lưu fingerprint
   SHA-256 (không phải private key) trong danh sách xác thực broker. Áp dụng
   ACL tối thiểu theo đúng publish/subscribe cần thiết.
4. Xác minh TLS/mTLS, fingerprint, topic và quyền publish/subscribe trước khi
   chuyển hồ sơ sang đang hoạt động. Ghi lại người cấp, thời điểm, serial,
   fingerprint, thời hạn và chủ sở hữu để truy vết.

### Đổi certificate hoặc khóa

1. Cấp cặp khóa mới và certificate mới cho cùng `clientId`; giữ credential cũ
   hoạt động trong khoảng chuyển đổi có kiểm soát. Không ghi đè private key cũ.
2. Cập nhật fingerprint mới trong `mqtt_device_certs.json`, provision certificate
   và private key mới lên thiết bị qua kênh tin cậy, rồi xác minh client kết nối
   và ACL hoạt động với credential mới.
3. Sau khi xác minh, xóa quyền fingerprint cũ khỏi mapping broker, vô hiệu hóa
   message-auth key cũ, thay key trong `mqtt_message_auth.json` và phân phối key
   mới qua kênh tin cậy nếu tính năng đó đang dùng. Chấm dứt phiên/kết nối cũ
   nếu broker đang giữ session; ghi nhận thời điểm hoàn tất và người thực hiện.
4. Nếu nghi lộ khóa, bỏ qua giai đoạn chồng lấn: thu hồi ngay credential cũ,
   chặn kết nối, sau đó cấp credential mới và điều tra phạm vi ảnh hưởng.

### Thu hồi hoặc chuyển chủ sở hữu

Khi thiết bị mất, hỏng, ngừng sử dụng hoặc đổi chủ, đánh dấu hồ sơ bị thu hồi/
chuyển giao trước khi tái sử dụng. Xóa client khỏi `mqtt_device_certs.json`,
`mqtt_acl.json`, `mqtt_message_auth.json`, `mqtt_client_ids.json` và
`mqtt_users.json` nếu có entry tương ứng; vô hiệu hóa tài khoản/API liên quan,
ngắt kết nối phiên đang tồn tại và thu hồi certificate theo CRL/OCSP nếu CA và
broker đã được cấu hình để thực thi cơ chế đó. Xóa key khỏi thiết bị khi còn có
thể truy cập; khi chuyển chủ sở hữu, provision credential mới và không chuyển
private key cũ. Giữ nhật ký thu hồi gồm lý do, thời điểm, người thao tác,
fingerprint/serial đã vô hiệu hóa. Không tái cấp cùng danh tính cho thiết bị
khác khi chưa dọn sạch toàn bộ mapping và phiên cũ.

### Phạm vi hỗ trợ hiện tại

`saveCertificateMqtt` hiện tạo certificate/key mới, ghi fingerprint và các
entry ACL/auth/client vào JSON, đồng thời từ chối cấp lại khi file certificate
hoặc hồ sơ đang hoạt động đã tồn tại. Đây là thao tác **cấp mới**, không phải
quy trình đổi chủ, xoay khóa hay thu hồi. Chưa có thao tác thu hồi đồng bộ
certificate/ACL/auth/session, cũng chưa có CRL/OCSP enforcement. Vì vậy các bước
đổi và thu hồi ở trên hiện là quy trình vận hành thủ công; cần hoàn tất cập nhật
tất cả mapping liên quan và kiểm tra broker trước khi xem credential đã bị
vô hiệu hóa. Xóa file `.crt`/`.key` đơn thuần không làm fingerprint đã được
broker tin cậy mất hiệu lực.

## Lưu certificate từ trang quản lý

Khi tạo client bằng `saveCertificateMqtt` (`web_manager/server/controllers/document.controller.js`), hệ thống tự tạo `<clientId>.key` (ECDSA P-256, PKCS#8), `<clientId>.csr`, `<clientId>.crt` và `<clientId>.cnf` trong thư mục `MQTT_CERTS` (thư mục `certs`), ký bằng `ca.key` hiện có. Certificate có thời hạn 3650 ngày; fingerprint SHA-256 được tính từ certificate vừa tạo.

Hệ thống cũng tự cập nhật `mqtt_device_certs.json`, `mqtt_message_auth.json`, `mqtt_client_ids.json`, `mqtt_users.json` và `mqtt_acl.json` trong thư mục cha của `MQTT_CERTS`; các file JSON này không nằm trong `certs`. Quyền publish và subscribe trong ACL lấy từ các topic được nhập khi tạo client. Broker cần khởi động lại sau khi thêm client.

`ca.key` trong `MQTT_CERTS` phải là CA ECDSA P-256 tạo ở bước 2, vì broker (`enableECDSA`) từ chối client có chứng chỉ ký bằng khóa khác loại.

## Cách 2: script PowerShell

Script làm toàn bộ bước 2–6 và tự cập nhật `mqtt_device_certs.json`:

```powershell
cd mqttBroker\certs
.\generate_ecdsa_certs.ps1                                   # thiết bị lấy từ ../mqtt_device_certs.json
.\generate_ecdsa_certs.ps1 -Devices iot_ai_control           # thêm một thiết bị, dùng lại CA hiện có
.\generate_ecdsa_certs.ps1 -ServerCN mqtt.example.com -ServerSan "DNS:mqtt.example.com,IP:192.168.1.10"
.\generate_ecdsa_certs.ps1 -NewCA                            # tạo lại cả CA
```

Lưu ý: mỗi lần chạy, script tạo lại cả `server.crt` (SAN mặc định giống `pki.cnf`), và khi không có `-Devices` nó tạo lại chứng chỉ của **mọi** `clientId` trong `mqtt_device_certs.json`, kể cả các dịch vụ backend. Script tự tìm `openssl` trong PATH, sau đó tìm trong `C:\Program Files\Git\usr\bin`. Script cũng chạy được trên Linux bằng PowerShell 7 (`pwsh`) nếu `openssl` có trong PATH.

## Chứng chỉ cho các dịch vụ backend

Các dịch vụ kết nối tới broker cũng dùng mTLS ECDSA P-256, giống thiết bị. Mỗi dịch vụ có một `clientId` cố định trùng với CN của chứng chỉ, đã được đăng ký trong `mqtt_device_certs.json` và `mqtt_acl.json`:

| Dịch vụ | `clientId` | File | ACL |
| --- | --- | --- | --- |
| `web_manager` (trang `/mqtt`) | `web_manager` | `web_manager.crt` / `.key` | publish `sub_c/+`, `devices/+/commands/#`; subscribe `pub_c/+`, `devices/+/data`, `iot/alert/#` |
| `AI_server/power_anomaly.py` | `iot_ai_control` | `iot_ai_control.crt` / `.key` | publish `iot/alert/#`; subscribe `iot/power/#` |
| `mqttClient/LissenAndReply.js` (ghi MongoDB) | `iot_data_logger` | `iot_data_logger.crt` / `.key` | subscribe `pub_c/+`, `devices/+/data`, `iot/power/#`, `iot/alert/#` |

Tạo lại chứng chỉ của một dịch vụ bằng bước 4 với `clientId` tương ứng, rồi cập nhật fingerprint trong `mqtt_device_certs.json`. Các dịch vụ đọc `ca.crt`, `<clientId>.crt` và `<clientId>.key` trong `MQTT_CERTS` (mặc định là thư mục này), hoặc từ `MQTT_CA_CERT`/`MQTT_CLIENT_CERT`/`MQTT_CLIENT_KEY`.

Các dịch vụ thêm `timestamp`/`nonce` vào mọi bản tin JSON publish (broker `enableAttack`). Khi broker bật `enableMessageAuthentication`, đặt `MQTT_HMAC_SECRET` bằng key của `clientId` đó trong `mqtt_message_auth.json`. Khi broker từ chối chứng chỉ, dịch vụ dừng hẳn thay vì thử lại, để không bị khóa vì brute-force.

## web_manager và broker ở hai server khác nhau

`saveCertificateMqtt` không cần chung ổ đĩa với broker nữa:

- **Server web_manager** giữ CA (`ca.crt` + `ca.key`) và chứng chỉ/khóa thiết bị trong `MQTT_PKI_DIR` (mặc định `MQTT_CERTS`), cùng với `web_manager.crt`/`.key`. Bảng `mqtt_microservice` là nguồn dữ liệu gốc (`broker_sync_status` = `pending`/`synced`). `getCertificateMqtt` chỉ đọc ở server này nên vẫn chạy được khi broker tắt.
- **Server broker** chỉ cần `ca.crt`, `server.crt`/`.key` và chạy thêm `node BrokerAdminApi.js` (`npm run admin`, cổng 8885). Đây là process riêng, không dùng chung event loop với broker. API chỉ nhận client mTLS có CN thuộc `BROKER_ADMIN_ALLOWED_CN` (mặc định `web_manager`), tự kiểm tra chứng chỉ thiết bị (do `ca.crt` ký, CN = clientId, ECDSA P-256) và tự tính fingerprint, rồi ghi 5 file JSON bằng atomic rename. Chỉ mở cổng này cho IP của web_manager.
- **Đồng bộ:** web_manager lưu bản ghi vào DB trước, sau đó gọi `PUT /v1/clients/:clientId` (idempotent). Nếu broker không truy cập được, bản ghi giữ trạng thái `pending`: worker gửi lại mỗi `MQTT_BROKER_SYNC_INTERVAL_MS`, và việc mở `getCertificateMqtt` cũng gửi lại.

Cấu hình web_manager (`.env`):

```
MQTT_BROKER_ADMIN_URL=https://<ip-broker>:8885
MQTT_BROKER_ADMIN_SERVERNAME=<tên có trong subjectAltName của server.crt, nếu URL dùng tên khác>
```

Để trống `MQTT_BROKER_ADMIN_URL` thì quay về chế độ cũ: ghi thẳng file JSON trong `MQTT_BROKER_DIR`. Trước khi dùng, chạy `npx knex migrate:latest` để thêm các cột `broker_sync_*`/`message_auth_key`.

File mẫu: `web_manager/.env.sample` (server web_manager) và `mqttBroker/.env.sample` (server broker, copy thành `mqttBroker/.env`; `BrokerAdminApi.js` tự đọc file này).

### Xóa / thu hồi thiết bị

Có hai cách: `POST /api/document/revokeCertificateMqtt` với body `{ "mqtt_id": "..." }`, hoặc xóa thiết bị bằng `deleteDevice` (trang thiết bị). Cả hai cách đều:

1. Xóa mềm bản ghi (`deleteflag = 1`) và đặt `broker_sync_status = revoke_pending`. Chỉ áp dụng cho thiết bị có chứng chỉ do `saveCertificateMqtt` cấp.
2. Chuyển `<id>.crt/.key/.esp.key` vào `<MQTT_PKI_DIR>/revoked/<id>-<thời gian>/`. Từ đó `getCertificateMqtt` không trả khóa nữa và `mqtt_id` có thể được cấp lại.
3. Gọi `DELETE /v1/clients/<id>` (hoặc sửa file local). Broker xóa client khỏi `mqtt_client_ids.json`, `mqtt_device_certs.json`, `mqtt_message_auth.json`, `mqtt_acl.json`. Entry trong `mqtt_users.json` chỉ bị xóa khi không còn client nào dùng username đó. Sau đó trạng thái chuyển thành `revoked`.

Kết nối mới của thiết bị bị từ chối ngay. `MqttBroker1885.js` còn ngắt các kết nối đang mở khi `mqtt_device_certs.json` thay đổi. Nếu broker không truy cập được, lệnh thu hồi giữ trạng thái `revoke_pending` và được worker gửi lại (ưu tiên trước các lệnh thêm). Trong thời gian đó không thể tạo lại cùng `mqtt_id`. API không cho thu hồi các client quản trị trong `BROKER_ADMIN_ALLOWED_CN`.

### Chống sao chép thiết bị

Broker phát hiện thiết bị bị sao chép bằng ticket phiên xoay vòng và kiểm tra chiếm phiên. Danh tính bị nghi ngờ sẽ bị cách ly và phát cảnh báo `DEVICE_CLONE`. Chi tiết, cách gỡ cách ly và cấu hình chống đọc flash: `DeviceIOT/docs/Security.md`, mục "Chống sao chép thiết bị". Admin API cung cấp `GET /v1/clients/:id/anticlone` và `POST /v1/clients/:id/anticlone/reset`. Cấp chứng chỉ mới (fingerprint mới) cũng tự xóa trạng thái cách ly.

### Gia hạn chứng chỉ thiết bị

`MQTT_CERT_VALID_DAYS` (mặc định 3650) quy định thời hạn chứng chỉ. web_manager tự gia hạn trước `MQTT_CERT_RENEW_BEFORE_DAYS` (180) ngày, giữ nguyên khóa riêng, và gửi chứng chỉ mới xuống thiết bị bằng lệnh com 16. Thiết bị chỉ ghi vào EEPROM sau khi kết nối thử thành công. Trong thời gian chuyển tiếp, `mqtt_device_certs.json` có thêm `nextFingerprint256`. Broker từ chối chứng chỉ đã hết hạn. Chi tiết: `DeviceIOT/docs/Security.md`, mục "Gia hạn chứng chỉ thiết bị". Cần chạy `npx knex migrate:latest` (cột `cert_*`).
