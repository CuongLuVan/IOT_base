# MosquittoBroker

Mosquitto 2.x port of `mqttBroker/MqttBroker1885.js`. It uses the same port
(1885), the certificates in `mqttBroker/certs` and the `mqttBroker/mqtt_*.json`
rule files, so devices created by web_manager (`saveCertificateMqtt`) can
connect without restarting the broker.

| Node.js broker               | Mosquitto                                             |
|------------------------------|-------------------------------------------------------|
| `enable_TLS_SSL`             | `listener 1885` + `certfile` / `keyfile`              |
| `enableTLSCertificate`       | `cafile` + `require_certificate true` + `plugin_opt_enable_tls_certificate` |
| `enableECDSA`                | `tls_version`, `ciphers`, `ciphers_tls1.3` + `plugin_opt_enable_ecdsa` |
| `enableACL`                  | `plugin_opt_enable_acl`                               |
| `enableAttack` (replay)      | `plugin_opt_enable_attack`                            |
| `enableClientID`             | `plugin_opt_enable_client_id`                         |
| `enableMessageAuthentication`| `plugin_opt_enable_message_authentication`            |
| `enableBruteForce`           | `plugin_opt_enable_brute_force`                       |

Everything except TLS lives in the plugin `src/mosquitto_iot_auth.c`.

## Build and run (Linux / WSL)

```sh
sudo apt install mosquitto mosquitto-dev libssl-dev libcjson-dev gcc make
cd MosquittoBroker
make
mosquitto -c mosquitto.conf -v
```

`mqttBroker/certs/server.key` must exist (see `mqttBroker/readme.txt`).
Stop the packaged service first if it runs: `sudo systemctl disable --now mosquitto`.
Run only one of MqttBroker1885.js, AedesBroker and MosquittoBroker at a time.

On Windows, the plugin must be built as a DLL against the Mosquitto `devel`
headers, OpenSSL 3 and cJSON; set `plugin` in `mosquitto.conf` to that DLL.
Only the Linux build has been tested.

## Differences from MqttBroker1885.js

- Client certificates must be signed by `ca.crt` (`require_certificate`);
  the Node.js broker accepted any certificate whose fingerprint is mapped.
- A rejected publish disconnects the client on the next broker tick
  (`plugin_opt_disconnect_on_denied_publish`), not inside the PUBLISH.
- Mosquitto drops client publishes to `$SYS/...` itself without calling the
  plugin, so those clients stay connected.
- Replay timestamps given as strings accept numbers and the ISO 8601 format
  of `Date.toISOString()`; other formats accepted by `Date.parse()` are not.
