# IOT_base

**IOT_base** là một **framework mã nguồn mở (Open Source)** được xây dựng nhằm cung cấp một nền tảng cơ bản để phát triển các dự án **IoT nhanh hơn, gọn hơn và dễ mở rộng hơn**.

Dự án được thiết kế đặc biệt để giúp người mới dễ dàng tiếp cận với cách một hệ thống IoT thực tế hoạt động, từ **thiết bị IoT, MQTT, Server, Database, Web Manager** cho đến quá trình trao đổi dữ liệu giữa các thành phần.

> **IOT_base không nhằm trở thành một sản phẩm IoT hoàn chỉnh. Đây là một base/framework để bạn học, xây dựng và tiếp tục phát triển thành những hệ thống lớn hơn.**

---

## 🎯 Mục tiêu

Một dự án IoT thực tế thường không chỉ đơn giản là đọc sensor và gửi dữ liệu.

Khi hệ thống phát triển, bạn sẽ phải xử lý:

* Giao tiếp giữa thiết bị và Server
* MQTT
* Authentication / Authorization
* Database
* Web Management
* Device Management
* Configuration
* Logging
* Task management
* Security
* Firmware và phần mềm trên thiết bị
* Khả năng mở rộng hệ thống

IOT_base cung cấp một **bộ khung ban đầu** để bạn không phải xây dựng mọi thứ từ con số 0.

Mục tiêu chính:

* 🚀 Phát triển dự án IoT nhanh hơn
* 🧩 Có kiến trúc base để mở rộng
* 📚 Giúp người mới dễ học và dễ tiếp cận
* 🔌 Làm quen với MQTT và mô hình Client/Server
* 🖥️ Có nền tảng Web Manager
* 💾 Làm việc với Database
* 🔐 Làm quen với các vấn đề bảo mật IoT
* ⚙️ Làm nền tảng cho các dự án IoT phức tạp hơn

---

## 🏗️ Kiến trúc tổng quan

Mô hình cơ bản của hệ thống:

```text
                    ┌──────────────────┐
                    │    Web Manager   │
                    │                  │
                    │  Device Manager  │
                    │  Configuration   │
                    │  Monitoring      │
                    └────────┬─────────┘
                             │
                             │ HTTP / API
                             │
                    ┌────────▼─────────┐
                    │      Server      │
                    │                  │
                    │  MQTT Client     │
                    │  API             │
                    │  Authentication  │
                    │  Database        │
                    └────────┬─────────┘
                             │
                             │ MQTT
                             │
                    ┌────────▼─────────┐
                    │   MQTT Broker    │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
           ┌────────┐   ┌────────┐   ┌────────┐
           │ Device │   │ Device │   │ Device │
           │   01   │   │   02   │   │   03   │
           └────────┘   └────────┘   └────────┘
```

Kiến trúc này có thể được mở rộng tùy theo yêu cầu của từng dự án.

---

# 📁 Cấu trúc project

```text
IOT_base/
│
├── DeviceIOT/
│   └── Firmware / Device side
│
├── mqttBroker/
│   └── MQTT Broker
│
├── mqttClient/
│   └── Backend / MQTT Client
│
├── web_manager/
│   └── Web management interface
│
├── README.md
├── LICENSE
└── ...
```

Các thành phần được tách riêng để dễ dàng phát triển và thay thế từng module.

---

# 🔌 MQTT

MQTT là thành phần giao tiếp chính giữa các thiết bị IoT và Server.

Mô hình cơ bản:

```text
Device
   │
   │ MQTT Publish
   ▼
MQTT Broker
   │
   │ MQTT Subscribe
   ▼
Server
```

Server cũng có thể gửi command ngược lại:

```text
Server
   │
   │ MQTT Publish
   ▼
MQTT Broker
   │
   │ MQTT Subscribe
   ▼
Device
```

Điều này cho phép xây dựng các hệ thống:

* Điều khiển thiết bị từ xa
* Thu thập dữ liệu sensor
* Device status
* Configuration
* Remote command
* Monitoring
* OTA và các chức năng mở rộng khác

---

# ⚙️ RTOS và lập trình Embedded

Đối với phần firmware, khi hệ thống trở nên phức tạp, bạn nên làm quen với **RTOS** và mô hình lập trình đa nhiệm.

Một số khái niệm quan trọng:

```text
Thread / Task
Mutex
Semaphore
Queue
Timer
Event
Watchdog
```

Ví dụ kiến trúc firmware:

```text
                 ┌─────────────────┐
                 │    Main Task    │
                 └────────┬────────┘
                          │
          ┌───────────────┼────────────────┐
          │               │                │
          ▼               ▼                ▼
     Sensor Task      MQTT Task       Control Task
          │               │                │
          │               │                │
          └─────── Queue / Mutex ──────────┘
                          │
                          ▼
                    Device Driver
```

IOT_base có thể được sử dụng như một base để bạn tiếp tục tổ chức firmware theo mô hình RTOS chuyên nghiệp hơn.

---

# 🔐 Security

Security là một phần quan trọng khi đưa hệ thống IoT vào thực tế.

Trong quá trình phát triển, bạn có thể mở rộng framework với:

* MQTT over TLS
* TLS Certificate
* Authentication
* Authorization
* MQTT ACL
* Device ID
* Client ID
* Username / Password
* Token
* Key management
* Key rotation
* Secure OTA
* Secure storage

Ví dụ:

```text
Device
   │
   │ MQTT over TLS
   ▼
MQTT Broker
   │
   │ Authentication / ACL
   ▼
MQTT Server
```

> **Lưu ý:** Cấu hình bảo mật trong repository chỉ mang tính chất học tập / nền tảng. Khi triển khai production, cần đánh giá và tăng cường security phù hợp với yêu cầu thực tế.

---

# 🧠 Từ project cơ bản đến hệ thống thực tế

IOT_base được thiết kế theo hướng:

```text
          IOT_base
              │
              ▼
       Học kiến trúc IoT
              │
              ▼
        Hiểu MQTT / RTOS
              │
              ▼
       Thêm Authentication
              │
              ▼
          Thêm TLS
              │
              ▼
         Thêm ACL
              │
              ▼
       Device Management
              │
              ▼
        OTA / Monitoring
              │
              ▼
       Production System
```

Bạn có thể bắt đầu từ một hệ thống rất đơn giản rồi từng bước bổ sung các thành phần cần thiết.

---

# 🚀 Getting Started

## 1. Clone repository

```bash
git clone https://github.com/CuongLuVan/IOT_base.git

cd IOT_base
```

## 2. Cài đặt dependencies

Tùy từng thành phần, cài đặt dependency tương ứng.

Ví dụ với Node.js:

```bash
npm install
```

Đối với từng module có `package.json`, chạy:

```bash
npm install
```

trong thư mục tương ứng.

---

# 🛠️ Development

Bạn có thể phát triển từng thành phần độc lập:

```text
DeviceIOT
    ↓
MQTT
    ↓
mqttBroker
    ↓
mqttClient
    ↓
Database
    ↓
web_manager
```

Điều này giúp dễ dàng thay thế hoặc nâng cấp từng thành phần mà không cần viết lại toàn bộ hệ thống.

---

# 📚 Dành cho người mới

Nếu bạn mới bắt đầu với IoT, có thể học theo thứ tự:

### 1. Embedded

Tìm hiểu:

* GPIO
* UART
* SPI
* I2C
* Sensor
* Actuator
* Wi-Fi / Ethernet

### 2. MQTT

Tìm hiểu:

* Broker
* Client
* Topic
* Publish
* Subscribe
* QoS
* Retain
* Last Will

### 3. RTOS

Tìm hiểu:

* Task / Thread
* Mutex
* Semaphore
* Queue
* Timer
* Event
* Watchdog

### 4. Backend

Tìm hiểu:

* REST API
* Database
* Authentication
* Device management

### 5. Security

Tìm hiểu:

* TLS
* Certificate
* Authentication
* Authorization
* ACL
* Key management

Sau đó có thể bắt đầu xây dựng hệ thống IoT hoàn chỉnh hơn.

---

# ⚠️ Production

IOT_base được xây dựng với mục đích **học tập, nghiên cứu và làm nền tảng phát triển**.

Không nên sử dụng nguyên trạng cho hệ thống production có yêu cầu cao về:

* Security
* Reliability
* Scalability
* High availability
* Fault tolerance
* Data protection

Trước khi triển khai thực tế, cần thực hiện security review, dependency audit, performance testing và bổ sung các cơ chế phù hợp với yêu cầu của hệ thống.

---

# 🤝 Contributing

Contributions are welcome.

Bạn có thể đóng góp bằng cách:

* Báo cáo bug
* Đề xuất tính năng
* Cải thiện documentation
* Tối ưu code
* Thêm module
* Cải thiện security
* Viết example
* Pull Request

Nếu phát hiện vấn đề hoặc có ý tưởng cải thiện framework, hãy tạo **Issue** hoặc **Pull Request**.

---

# 📦 Third-party Libraries

IOT_base sử dụng một số thư viện mã nguồn mở của bên thứ ba.

Các thư viện này có **license riêng** và không thuộc quyền sở hữu của IOT_base.

Khi phân phối project, cần tuân thủ license tương ứng của từng thư viện.

Danh sách license của third-party dependencies nên được duy trì trong:

```text
THIRD_PARTY_LICENSES.md
```

---

# 📄 License

IOT_base được phát hành theo **MIT License**.

Xem chi tiết tại:

```text
LICENSE
```

MIT License cho phép bạn:

* Sử dụng
* Sao chép
* Chỉnh sửa
* Phân phối
* Tích hợp vào project khác
* Sử dụng cho mục đích thương mại

với điều kiện tuân thủ các điều khoản của MIT License.

---

# ⭐ Philosophy

> **Don't build everything from zero. Build a good base, then make it yours.**

IOT_base được tạo ra với một mục tiêu đơn giản:

**Giúp bạn bắt đầu một dự án IoT dễ dàng hơn và có một nền tảng đủ tốt để tiếp tục xây dựng những hệ thống phức tạp hơn.**

Đây không phải là một hệ thống IoT hoàn chỉnh.

Đây là **một base để bạn học, xây dựng và phát triển**.

---

## 🚀 Start small. Learn fast. Build bigger.
