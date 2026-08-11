# Third-Party Licenses

This document lists the third-party software, libraries, frameworks, and other components used by **IOT_base**.

IOT_base itself is released under the **MIT License**. However, third-party components included in or required by this project may be distributed under their own licenses.

Users and distributors are responsible for complying with the applicable license terms of each third-party component.

---

## 1. General Notice

IOT_base is built using a number of open-source libraries and frameworks.

The use of a third-party component does **not** change the license of the original component.

Unless explicitly stated otherwise:

* The copyright of third-party software remains with its original authors.
* Third-party software remains subject to its original license.
* License notices and copyright notices must be preserved where required.
* This document is provided for convenience and is not a replacement for the original license files included with each dependency.

For the most accurate and up-to-date license information, users should refer to the official repository or package documentation of each dependency.

---

# 2. Node.js Dependencies

The following libraries are used by the Node.js components of IOT_base.

> **Note:** License information should be verified against the exact dependency version installed in `package-lock.json`.

| Package            | Purpose                       | License      | Notes                       |
| ------------------ | ----------------------------- | ------------ | --------------------------- |
| `aedes`            | MQTT broker                   | MIT          | Open Source                 |
| `axios`            | HTTP client                   | MIT          | Open Source                 |
| `bcrypt`           | Password hashing              | MIT          | Open Source                 |
| `body-parser`      | HTTP request parsing          | MIT          | Open Source                 |
| `cookie-parser`    | Cookie parsing                | MIT          | Open Source                 |
| `cors`             | Cross-Origin Resource Sharing | MIT          | Open Source                 |
| `debug`            | Debugging utility             | MIT          | Open Source                 |
| `dotenv`           | Environment configuration     | BSD-2-Clause | Open Source                 |
| `express`          | Web framework                 | MIT          | Open Source                 |
| `jsonwebtoken`     | JSON Web Token implementation | MIT          | Open Source                 |
| `knex`             | SQL query builder             | MIT          | Open Source                 |
| `mongoose`         | MongoDB object modeling       | MIT          | Open Source                 |
| `mqtt`             | MQTT client                   | MIT          | Open Source                 |
| `mysql`            | MySQL client                  | MIT          | Open Source                 |
| `node-cron`        | Task scheduling               | MIT          | Open Source                 |
| `nodemon`          | Development utility           | MIT          | Open Source                 |
| `request`          | HTTP request library          | Apache-2.0   | Deprecated upstream project |
| `squel`            | SQL query builder             | MIT          | Open Source                 |
| `swagger-jsdoc`    | OpenAPI/Swagger documentation | MIT          | Open Source                 |
| `websocket-stream` | WebSocket stream              | BSD-2-Clause | Open Source                 |

---

# 3. Web Manager Dependencies

The `web_manager` component uses several third-party libraries for its web interface, backend services, database access, communication, and other functionality.

Examples include:

| Package      | Purpose                | License    |
| ------------ | ---------------------- | ---------- |
| `bootstrap`  | Front-end framework    | MIT        |
| `axios`      | HTTP client            | MIT        |
| `bcrypt`     | Password hashing       | MIT        |
| `express`    | Web framework          | MIT        |
| `mqtt`       | MQTT communication     | MIT        |
| `mysql`      | MySQL client           | MIT        |
| `nodemailer` | Email delivery         | MIT        |
| `xlsx`       | Spreadsheet processing | Apache-2.0 |
| `aws-sdk`    | AWS SDK                | Apache-2.0 |

The exact versions and transitive dependencies are defined in the corresponding `package.json` and `package-lock.json` files.

---

# 4. MQTT Components

The MQTT-related components use open-source MQTT libraries and supporting packages.

The main MQTT-related dependencies include:

```text
aedes
mqtt
mqtt-packet
websocket-stream
```

These components are distributed under their respective open-source licenses.

Users should check the dependency tree generated from the exact installed versions before redistributing the project.

---

# 5. Front-End Libraries

The Web Manager may use third-party front-end libraries such as:

```text
Bootstrap
jQuery
Axios
```

These libraries remain the property of their respective copyright holders and are distributed under their respective open-source licenses.

If a library is loaded from an external CDN, the CDN hosting service does not change the original license of that library.

---

# 6. Fonts, Icons, Images, and Other Assets

Third-party assets require separate license verification.

This includes, but is not limited to:

* `.ttf` fonts
* `.otf` fonts
* `.woff` / `.woff2` fonts
* Icons
* Images
* Logos
* Audio files
* Videos
* SVG files
* UI templates
* Other binary assets

If a third-party asset is added to the repository, its license should be documented here.

Example:

| Asset            | Type  | License | Source           |
| ---------------- | ----- | ------- | ---------------- |
| Example Font     | Font  | OFL-1.1 | Original project |
| Example Icon Set | Icons | MIT     | Original project |

**Do not assume that a publicly available font, icon, image, or logo is free to use.**

Before adding an asset to the repository, verify its license and redistribution requirements.

---

# 7. Certificates and Cryptographic Materials

Certificates and cryptographic materials require special attention.

The repository should **not contain private keys, production certificates, passwords, API keys, access tokens, or other confidential credentials**.

Do not commit files such as:

```text
*.key
*.p12
*.pfx
private.key
server.key
client.key
id_rsa
```

unless they are explicitly intended as public test/demo materials and contain no sensitive information.

For production deployments, users should generate and manage their own certificates and private keys.

---

# 8. Transitive Dependencies

Some dependencies used by IOT_base depend on additional third-party packages.

For example:

```text
Application
    │
    ├── Library A
    │      ├── Library B
    │      └── Library C
    │
    └── Library D
           └── Library E
```

Therefore, the packages listed in this document are not necessarily the complete dependency tree.

For a complete dependency and license audit, inspect:

```text
package.json
package-lock.json
```

and generate a Software Bill of Materials (SBOM) when required.

Recommended tools include:

* ScanCode Toolkit
* FOSSology
* ORT (OSS Review Toolkit)
* Syft

---

# 9. License Compatibility

IOT_base is distributed under the MIT License.

Third-party components may use different licenses, including:

```text
MIT
BSD-2-Clause
BSD-3-Clause
Apache-2.0
LGPL
GPL
AGPL
```

Not all licenses have the same redistribution requirements.

In particular, **GPL, LGPL, and AGPL components require additional review** before being incorporated into a project intended for proprietary or commercial distribution.

Do not assume that every open-source license is automatically compatible with every use case.

---

# 10. Copyright and Attribution

Copyright notices and license texts included with third-party software must be preserved when required by the applicable license.

A typical attribution may look like:

```text
This project uses:
- Library Name
- Copyright (c) Original Author
- Licensed under the MIT License
```

The exact attribution requirements depend on the license of each component.

---

# 11. License Verification

License information may change between software versions.

For this reason, the license information in this document should be considered a snapshot of the dependencies used by the project at the time of review.

Before releasing a new version of IOT_base, maintainers should review:

1. Direct dependencies
2. Transitive dependencies
3. Dependency versions
4. License changes
5. New fonts or assets
6. New source code copied or adapted from external projects
7. New binaries or firmware components

---

# 12. Source Code Contributions

Code contributed to IOT_base should be original work or properly licensed for inclusion in the project.

Contributors should not submit:

* Proprietary source code
* Code without permission to redistribute
* Code copied from projects with incompatible licenses
* Unlicensed third-party code
* Confidential company code
* Private keys or credentials

If code is adapted from another open-source project, the original project and applicable license should be clearly identified.

---

# 13. Disclaimer

The information in this document is provided for informational and compliance purposes only.

Although reasonable efforts are made to identify third-party components and their licenses, this document should not be considered a legal determination of license compliance.

Users and distributors are responsible for verifying the applicable licenses and complying with their terms.

---

# 14. Updating This Document

Whenever a new dependency or third-party asset is added to IOT_base, update this file accordingly.

For example:

```text
New dependency
      ↓
Check source
      ↓
Check version
      ↓
Check license
      ↓
Check redistribution requirements
      ↓
Add to THIRD_PARTY_LICENSES.md
      ↓
Run license / dependency audit
```

Keeping this document up to date helps maintain transparency and makes the project easier to use, modify, and distribute.

---

## License Summary

IOT_base:

```text
MIT License
```

Third-party components:

```text
Each component retains its original license.
```

For detailed license information, please refer to the license files and official documentation of the respective third-party projects.

---

**IOT_base — Start small. Learn fast. Build bigger.**
