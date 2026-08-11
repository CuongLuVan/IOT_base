# IOT_base

**IOT_base** is an **Open Source framework** designed to provide a basic foundation for building **IoT projects faster, cleaner, and easier to extend**.

The project is designed to help beginners understand how a practical IoT system works, from **IoT devices, MQTT, servers, databases, and web management** to communication between different components.

> **IOT_base is not intended to be a complete IoT product. It is a base/framework that you can learn from, build upon, and extend into more complex systems.**

---

## 🎯 Goals

A real-world IoT project is more than simply reading sensor data and sending it to a server.

As the system grows, you may need to deal with:

* Communication between devices and servers
* MQTT
* Authentication / Authorization
* Database
* Web Management
* Device Management
* Configuration
* Logging
* Task management
* Security
* Embedded firmware
* Software architecture
* System scalability

IOT_base provides a **starting framework** so that you do not have to build everything from scratch.

The main goals are:

* 🚀 Develop IoT projects faster
* 🧩 Provide a reusable and extensible foundation
* 📚 Make IoT easier for beginners to learn
* 🔌 Learn MQTT and Client/Server architecture
* 🖥️ Provide a Web Management foundation
* 💾 Work with databases
* 🔐 Learn about IoT security
* ⚙️ Provide a foundation for more complex IoT projects

---

# 🏗️ System Architecture

The basic system architecture:

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

This architecture can be extended according to the requirements of each project.

---

# 📁 Project Structure

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

The components are separated to make it easier to develop, replace, and maintain each module independently.

---

# 🔌 MQTT

MQTT is the primary communication protocol between IoT devices and the server.

Basic communication model:

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

The server can also send commands back to devices:

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

This architecture can be used to build systems for:

* Remote device control
* Sensor data collection
* Device status monitoring
* Device configuration
* Remote commands
* Monitoring
* OTA updates
* Other IoT applications

---

# ⚙️ RTOS and Embedded Programming

As an IoT system becomes more complex, it is important to understand **RTOS** and multitasking concepts.

Some important concepts include:

```text
Thread / Task
Mutex
Semaphore
Queue
Timer
Event
Watchdog
```

For example, a firmware architecture could look like:

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

IOT_base can be used as a starting point for organizing firmware using a more structured RTOS-based architecture.

---

# 🔐 Security

Security is an important part of any real-world IoT system.

The framework can be extended with security mechanisms such as:

* MQTT over TLS
* TLS certificates
* Authentication
* Authorization
* MQTT ACL
* Device ID
* Client ID
* Username / Password
* Token-based authentication
* Key management
* Key rotation
* Secure OTA
* Secure storage

Example:

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

> **Note:** The security configuration in this repository is intended as a learning/foundation setup. Production systems should be reviewed and hardened according to their specific security requirements.

---

# 🧠 From a Basic Project to a Real-World System

IOT_base is designed to support gradual development:

```text
          IOT_base
              │
              ▼
       Learn IoT Architecture
              │
              ▼
        Understand MQTT / RTOS
              │
              ▼
       Add Authentication
              │
              ▼
          Add TLS
              │
              ▼
         Add ACL
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

You can start with a simple system and gradually add the components required by your application.

---

# 🚀 Getting Started

## 1. Clone the Repository

```bash
git clone https://github.com/CuongLuVan/IOT_base.git

cd IOT_base
```

## 2. Install Dependencies

Install the dependencies required by each component.

For Node.js components:

```bash
npm install
```

For modules containing their own `package.json`, run:

```bash
npm install
```

inside the corresponding directory.

---

# 🛠️ Development

Each component can be developed independently:

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

This modular architecture makes it easier to replace or upgrade individual components without rewriting the entire system.

---

# 📚 Learning Path for Beginners

If you are new to IoT, you can follow this learning path:

### 1. Embedded Systems

Learn about:

* GPIO
* UART
* SPI
* I2C
* Sensors
* Actuators
* Wi-Fi / Ethernet

### 2. MQTT

Learn about:

* Broker
* Client
* Topic
* Publish
* Subscribe
* QoS
* Retain
* Last Will

### 3. RTOS

Learn about:

* Task / Thread
* Mutex
* Semaphore
* Queue
* Timer
* Event
* Watchdog

### 4. Backend

Learn about:

* REST API
* Database
* Authentication
* Device management

### 5. Security

Learn about:

* TLS
* Certificates
* Authentication
* Authorization
* ACL
* Key management

After that, you can start building more complete IoT systems.

---

# ⚠️ Production Use

IOT_base is designed for **learning, research, prototyping, and as a foundation for further development**.

It should not be used as-is for production systems with strict requirements for:

* Security
* Reliability
* Scalability
* High availability
* Fault tolerance
* Data protection

Before deploying to production, perform an appropriate security review, dependency audit, performance testing, and add the mechanisms required by your specific system.

---

# 🤝 Contributing

Contributions are welcome.

You can contribute by:

* Reporting bugs
* Suggesting features
* Improving documentation
* Optimizing code
* Adding modules
* Improving security
* Adding examples
* Creating Pull Requests

If you find a problem or have an idea for improving the framework, feel free to create an **Issue** or **Pull Request**.

---

# 📦 Third-Party Libraries

IOT_base uses a number of Open Source third-party libraries.

These libraries have their **own respective licenses** and are not owned by IOT_base.

When distributing this project, you must comply with the license terms of each third-party component.

A list of third-party licenses should be maintained in:

```text
THIRD_PARTY_LICENSES.md
```

---

# 📄 License

IOT_base is released under the **MIT License**.

See:

```text
LICENSE
```

The MIT License allows you to:

* Use
* Copy
* Modify
* Distribute
* Integrate into other projects
* Use for commercial purposes

subject to the terms and conditions of the MIT License.

---

# ⭐ Philosophy

> **Don't build everything from zero. Build a good base, then make it yours.**

IOT_base was created with a simple goal:

**Make it easier to start an IoT project and provide a solid foundation for building more complex systems.**

This is not a complete IoT system.

This is a **base for you to learn, build, and grow**.

---

## 🚀 Start small. Learn fast. Build bigger.
