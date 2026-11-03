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
