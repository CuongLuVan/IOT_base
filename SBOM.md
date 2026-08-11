# Software Bill of Materials (SBOM)

## IOT_base

This document describes the Software Bill of Materials (SBOM) for **IOT_base**.

The purpose of this document is to provide transparency about the software components, libraries, frameworks, dependencies, and third-party components used by the project.

IOT_base is an **Open Source IoT framework** designed to provide a reusable foundation for developing IoT systems.

---

# 1. What is an SBOM?

A **Software Bill of Materials (SBOM)** is an inventory of the software components used by a project.

An SBOM helps identify:

* Software dependencies
* Dependency versions
* Direct dependencies
* Transitive dependencies
* Open Source licenses
* Component origins
* Known vulnerabilities
* Components that may require license review

For an IoT framework, maintaining an SBOM is especially useful because the system may contain software running on:

```text
Device
   │
   ├── Firmware
   │
   ├── RTOS
   │
   └── Embedded libraries
   │
   ▼
MQTT
   │
   ├── MQTT Broker
   └── MQTT Client
   │
   ▼
Backend
   │
   ├── Node.js
   ├── Database
   └── Web Manager
```

---

# 2. Project Components

The main components of IOT_base are:

```text
IOT_base/
│
├── DeviceIOT/
│   └── IoT device / firmware
│
├── mqttBroker/
│   └── MQTT broker
│
├── mqttClient/
│   └── Backend / MQTT client
│
├── web_manager/
│   └── Web management system
│
├── README.md
├── LICENSE
├── THIRD_PARTY_LICENSES.md
└── SBOM.md
```

Each component may have its own dependencies and should be included in the SBOM.

---

# 3. Component Categories

The SBOM should cover the following categories.

## 3.1 Application Source Code

Source code developed specifically for IOT_base.

Examples:

```text
DeviceIOT
mqttBroker
mqttClient
web_manager
```

These components are part of the IOT_base project and are licensed according to the project's `LICENSE` file unless otherwise specified.

---

## 3.2 Embedded Dependencies

The device-side firmware may depend on:

* MCU SDK
* RTOS
* Hardware drivers
* Wi-Fi libraries
* Network libraries
* MQTT libraries
* TLS libraries
* Sensor libraries
* Storage libraries
* Utility libraries

Examples may include:

```text
FreeRTOS
ESP-IDF
Arduino libraries
MQTT libraries
mbedTLS
```

The exact dependencies depend on the firmware implementation and build configuration.

---

## 3.3 Backend Dependencies

The backend components may use Node.js and related packages.

Examples include:

```text
express
mqtt
aedes
axios
bcrypt
knex
mongoose
mysql
jsonwebtoken
dotenv
node-cron
swagger-jsdoc
```

The exact versions should be taken from the corresponding:

```text
package.json
package-lock.json
```

files.

---

## 3.4 Web Manager Dependencies

The Web Manager may contain front-end and backend dependencies such as:

```text
Bootstrap
jQuery
Axios
Express
MQTT
MySQL
Nodemailer
XLSX
AWS SDK
```

These components retain their respective licenses.

---

# 4. Direct Dependencies

A direct dependency is a package explicitly declared by the project.

For example:

```text
IOT_base
   │
   ├── express
   ├── mqtt
   ├── axios
   ├── bcrypt
   └── mysql
```

Direct dependencies should be recorded with:

| Field   | Description                          |
| ------- | ------------------------------------ |
| Name    | Package name                         |
| Version | Exact installed version              |
| Type    | npm / library / framework / firmware |
| License | Applicable license                   |
| Source  | Official project/repository          |
| Usage   | Where the component is used          |

Example:

| Name      | Version      | Type        | License | Used By               |
| --------- | ------------ | ----------- | ------- | --------------------- |
| `express` | See lockfile | npm package | MIT     | Backend               |
| `mqtt`    | See lockfile | npm package | MIT     | MQTT Client           |
| `aedes`   | See lockfile | npm package | MIT     | MQTT Broker           |
| `axios`   | See lockfile | npm package | MIT     | Backend / Web Manager |
| `bcrypt`  | See lockfile | npm package | MIT     | Authentication        |

> The exact version should always be obtained from `package-lock.json` rather than manually maintained here.

---

# 5. Transitive Dependencies

A transitive dependency is a dependency required by another dependency.

For example:

```text
IOT_base
    │
    └── express
          │
          ├── package-A
          │
          └── package-B
                │
                └── package-C
```

Even though IOT_base does not directly declare `package-C`, it is still part of the software dependency tree.

Therefore, a complete SBOM should include both:

```text
Direct dependencies
+
Transitive dependencies
```

This is one reason why `package-lock.json` should be committed to the repository.

---

# 6. License Information

The SBOM should record the license of each third-party component.

Common licenses may include:

```text
MIT
Apache-2.0
BSD-2-Clause
BSD-3-Clause
LGPL
GPL
AGPL
```

License information should be verified against the exact version of each dependency.

The SBOM should not assume that all Open Source software uses the same license.

For additional information, see:

```text
THIRD_PARTY_LICENSES.md
```

---

# 7. Vulnerability Tracking

An SBOM can also be used to identify known vulnerabilities.

For example:

```text
SBOM
 │
 ├── Component A
 │       │
 │       └── CVE check
 │
 ├── Component B
 │       │
 │       └── CVE check
 │
 └── Component C
         │
         └── CVE check
```

Security scanning should be performed regularly because vulnerabilities may be discovered after a project is released.

Recommended tools include:

* GitHub Dependabot
* GitHub Dependency Review
* OSV Scanner
* Trivy
* Grype
* Syft

---

# 8. Recommended SBOM Formats

Although this document provides a human-readable overview, machine-readable SBOM formats are recommended for automated processing.

Recommended formats include:

### SPDX

```text
SPDX JSON
SPDX Tag-Value
```

### CycloneDX

```text
CycloneDX JSON
CycloneDX XML
```

Machine-readable SBOM files can be stored under:

```text
sbom/
│
├── sbom.spdx.json
└── sbom.cdx.json
```

---

# 9. Generating an SBOM

For Node.js components, the dependency tree can be inspected using:

```bash
npm list --all
```

For a production-oriented dependency tree:

```bash
npm ls --all --json
```

For vulnerability checking:

```bash
npm audit
```

---

# 10. Using Syft

Syft can be used to generate an SBOM for the project.

Example:

```bash
syft dir:. -o cyclonedx-json > sbom.cdx.json
```

or:

```bash
syft dir:. -o spdx-json > sbom.spdx.json
```

The generated files can then be stored in:

```text
sbom/
```

---

# 11. Using ScanCode Toolkit

ScanCode Toolkit can be used to identify:

* Licenses
* Copyright notices
* Package information
* Third-party components

Example:

```bash
scancode \
    --license \
    --copyright \
    --package \
    --info \
    ./ \
    > scancode-report.json
```

This report can be used to review the project before a public release.

---

# 12. SBOM Generation Workflow

A recommended workflow is:

```text
              Source Code
                   │
                   ▼
          Dependency Discovery
                   │
                   ▼
          ┌─────────────────┐
          │ Direct Packages │
          └────────┬────────┘
                   │
                   ▼
        Transitive Dependencies
                   │
                   ▼
            License Scan
                   │
                   ▼
          Vulnerability Scan
                   │
                   ▼
              SBOM File
                   │
                   ▼
          Release / Distribution
```

Before each release:

```text
1. Update dependencies
2. Install dependencies
3. Generate SBOM
4. Check licenses
5. Scan vulnerabilities
6. Review unexpected components
7. Commit/update SBOM
8. Release
```

---

# 13. Recommended Repository Structure

A recommended repository structure is:

```text
IOT_base/
│
├── DeviceIOT/
├── mqttBroker/
├── mqttClient/
├── web_manager/
│
├── docs/
│
├── sbom/
│   ├── sbom.spdx.json
│   └── sbom.cdx.json
│
├── LICENSE
├── README.md
├── THIRD_PARTY_LICENSES.md
└── SBOM.md
```

The human-readable `SBOM.md` explains the structure and methodology.

The machine-readable files contain the actual component inventory.

---

# 14. SBOM Maintenance

The SBOM should be updated whenever:

* A dependency is added
* A dependency is removed
* A dependency version changes
* A firmware library changes
* An SDK changes
* A third-party asset is added
* A third-party component is removed
* A security vulnerability is discovered
* A license changes

A new SBOM should preferably be generated for every release.

---

# 15. Release Identification

Each SBOM should be associated with a specific project version.

Example:

```text
Project:
IOT_base

Version:
v1.0.0

Release Date:
YYYY-MM-DD

SBOM Format:
CycloneDX / SPDX

Generated By:
Syft / ScanCode / Other Tool

Source Revision:
<Git commit SHA>
```

Using the Git commit SHA is recommended because it provides an exact reference to the source code from which the SBOM was generated.

---

# 16. Security Considerations

The SBOM itself should not contain sensitive information.

Do not include:

```text
Passwords
API keys
Private keys
Authentication tokens
Production certificates
Database credentials
Secrets
```

An SBOM should describe software components, not expose confidential deployment information.

---

# 17. Limitations

An SBOM is an inventory, not a guarantee that a project is completely secure or license-compliant.

A generated SBOM may fail to identify:

* Dynamically downloaded software
* Runtime dependencies
* Manually copied source code
* Undocumented libraries
* Custom firmware components
* Embedded binary blobs
* Proprietary components
* Assets whose origin is unknown

Manual review may therefore still be required.

---

# 18. Relationship Between LICENSE, THIRD_PARTY_LICENSES.md, and SBOM.md

These files serve different purposes:

```text
LICENSE
   │
   └── Defines the license of IOT_base


THIRD_PARTY_LICENSES.md
   │
   └── Documents third-party license information


SBOM.md
   │
   └── Documents the software component inventory
```

In other words:

| File                      | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `LICENSE`                 | License of IOT_base                               |
| `THIRD_PARTY_LICENSES.md` | Third-party license and attribution information   |
| `SBOM.md`                 | Software component inventory and SBOM methodology |
| `sbom/*.json`             | Machine-readable component inventory              |

Together, these files provide a more complete Open Source compliance and software supply-chain documentation structure.

---

# 19. Current Status

The SBOM documentation is currently maintained as part of the IOT_base project.

The definitive dependency versions should be generated from the project's actual build files and lockfiles.

Before a production release, maintainers should:

* Generate a machine-readable SBOM
* Verify direct dependencies
* Verify transitive dependencies
* Review licenses
* Scan for known vulnerabilities
* Remove unnecessary dependencies
* Check for proprietary or unknown components
* Check for accidentally committed secrets

---

# 20. Disclaimer

This document is provided for software supply-chain transparency and documentation purposes.

The presence of a component in this document does not by itself grant permission to use, modify, or redistribute that component.

Users and distributors are responsible for reviewing the applicable license and security requirements of each third-party component.

---

## Summary

IOT_base uses an open-source software ecosystem consisting of:

```text
Embedded / Firmware
        │
        ├── SDK / RTOS
        ├── Drivers
        └── Network / MQTT
        │
        ▼
MQTT Infrastructure
        │
        ├── MQTT Broker
        └── MQTT Client
        │
        ▼
Backend
        │
        ├── Node.js
        ├── Database
        └── Authentication
        │
        ▼
Web Manager
        │
        ├── Front-end libraries
        └── Web components
```

Maintaining an SBOM helps make the project more transparent, easier to audit, and easier to maintain as the framework grows.

---

**IOT_base — Start small. Learn fast. Build bigger.**
