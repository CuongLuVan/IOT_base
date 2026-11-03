# MQTT sensor simulators

Two Node.js clients for `mqttBroker/MqttBroker1885.js`:

- `mqtt_publish_sensor_simulator.js` acts as device `device1`. It publishes JSON telemetry to `pub_c/device1` and listens for commands on `sub_c/device1`.
- `mqtt_subscribe_sensor_simulator1.js` acts as `device2`. It listens to `pub_c/device1`.

Both connect over MQTTS with mutual TLS using the ECDSA P-256 certificates in `mqttBroker/certs` (see `mqttBroker/certs/CERTIFICATE_SETUP.md`).

```powershell
npm install
npm run sensor-sim                              # tab 1: publisher
node mqtt_subscribe_sensor_simulator1.js        # tab 2: subscriber
```

Settings come from `.env` (loaded by `dotenv`) or the environment:

| Variable | Publisher | Subscriber | Default |
| --- | --- | --- | --- |
| `MQTT_HOST`, `MQTT_PORT` | yes | yes | `localhost`, `1885` |
| Client ID | `MQTT_CLIENT_ID` | `DEVICE_ID2` | `device1` / `device2` |
| CA / cert / key | `MQTT_CA_CERT`, `MQTT_CLIENT_CERT`, `MQTT_CLIENT_KEY` | `MQTT_CA_CERT2`, `MQTT_CLIENT_CERT2`, `MQTT_CLIENT_KEY2` | `../mqttBroker/certs/<id>.crt/.key` |
| Topics | `MQTT_PUBLISH_TOPIC`, `MQTT_SUBSCRIBE_TOPIC` | `MQTT_SUBSCRIBE_TOPIC2` | `pub_c/<id>`, `sub_c/<id>` / `pub_c/<DEVICE_ID>` |
| Username / password | `MQTT_USERNAME`, `MQTT_PASSWORD` | `MQTT_USERNAME2`, `MQTT_PASSWORD2` | not sent |
| HMAC | `MQTT_HMAC_SECRET`, `MQTT_HMAC_KEY_ID` | `MQTT_HMAC_SECRET` | off |
| Interval | `INTERVAL_MS` (min 1000) | | `5000` |

`MQTT_HOST` must be listed in the broker certificate's subjectAltName (currently `localhost`, `127.0.0.1` and `103.1.238.175`).

## Matching the broker's security flags

| Broker flag | Simulator behaviour |
| --- | --- |
| `enable_TLS_SSL`, `enableTLSCertificate`, `enableECDSA` | MQTTS with the client certificate; the broker matches `clientId` to the fingerprint in `mqtt_device_certs.json`. |
| `enableAttack` (replay) | Every publish carries `timestamp` and a fresh `nonce`. |
| `enableMessageAuthentication` | Set `MQTT_HMAC_SECRET` to the key in `mqtt_message_auth.json`. The publisher signs every message (`keyId` + `signature`, same canonical form as the broker). The subscriber marks received messages `[signature OK]`, `[signature INVALID]` or `[unsigned]`. |
| `enableBruteForce` | When the broker rejects the credentials (CONNACK 4/5/134/135), the simulator exits instead of retrying into a 900 s block. |
| `enableACL` | Topics must be allowed for the client ID in `mqtt_acl.json`. A refused subscription (SUBACK 0x80) is reported. |

Stop with `Ctrl+C`.
