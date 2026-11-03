# AI_server: power anomaly detection

`power_anomaly.py` subscribes to power telemetry, trains an IsolationForest on the first 200 samples (`current`, `voltage`, `power`), and publishes an alert for every abnormal sample.

```bash
pip install -r requirements.txt
python power_anomaly.py
```

## Broker connection

The script connects to `mqttBroker/MqttBroker1885.js` over MQTTS with mutual TLS, using the ECDSA P-256 certificate of client ID `iot_ai_control`. That client ID is registered in `mqtt_device_certs.json` and `mqtt_acl.json` (subscribe `iot/power/#`, publish `iot/alert/#`). Settings come from the environment or a `.env` file:

| Variable | Default |
| --- | --- |
| `MQTT_HOST`, `MQTT_PORT` | `localhost`, `1885` |
| `MQTT_CLIENT_ID` | `iot_ai_control` |
| `MQTT_CERTS` | `../mqttBroker/certs` (`ca.crt`, `<client id>.crt`, `<client id>.key`) |
| `MQTT_CA_CERT`, `MQTT_CLIENT_CERT`, `MQTT_CLIENT_KEY` | explicit paths, override `MQTT_CERTS` |
| `MQTT_SUBSCRIBE_TOPIC`, `MQTT_ALERT_TOPIC` | `iot/power/machine1`, `iot/alert/machine1` |
| `MQTT_REPLAY_PROTECTION` | `true`: adds `timestamp` and `nonce` (broker `enableAttack`) |
| `MQTT_HMAC_SECRET`, `MQTT_HMAC_KEY_ID` | unset: when set, alerts are signed like the broker expects (`enableMessageAuthentication`) |
| `MQTT_USERNAME`, `MQTT_PASSWORD` | unset: only needed when the broker runs without mTLS |

`MQTT_HOST` must be in the broker certificate's subjectAltName (currently `localhost`, `127.0.0.1`, `103.1.238.175`).

When the broker rejects the certificate, the script stops instead of retrying, so the broker's brute-force protection does not block it.

`mqtt_security.py` holds the TLS context, the replay metadata, and the HMAC signing. Its canonical JSON formats numbers like JavaScript (`230.0` becomes `230`), because the broker computes the HMAC with `JSON.stringify`.

Works with paho-mqtt 1.x and 2.x.
