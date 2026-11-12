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
| `ANOMALY_TRAINING_SAMPLES`, `ANOMALY_CONTAMINATION` | `200`, `0.02`; training minimum and IsolationForest contamination (0, 0.5] |
| `MQTT_SOURCE_DEVICE`, `MQTT_POWER_SENSOR_KEY` | defaults to last segment of input topic, `power`; must match registered `mqtt_id` and active sensor key |

`MQTT_HOST` must be in the broker certificate's subjectAltName (currently `localhost`, `127.0.0.1`, `103.1.238.175`).

When the broker rejects the certificate, the script stops instead of retrying, so the broker's brute-force protection does not block it.

`mqtt_security.py` holds the TLS context, the replay metadata, and the HMAC signing. Its canonical JSON formats numbers like JavaScript (`230.0` becomes `230`), because the broker computes the HMAC with `JSON.stringify`.

Works with paho-mqtt 1.x and 2.x.


## Alert integration

`power_anomaly.py` publishes abnormal readings on `MQTT_ALERT_TOPIC` (default
`iot/alert/machine1`). Set `MQTT_SOURCE_DEVICE` to the registered `mqtt_id` of
the physical device in `mqtt_microservice`; the default is the last segment of
`MQTT_SUBSCRIBE_TOPIC`. Set `MQTT_POWER_SENSOR_KEY` to an active sensor key on
that device (default `power`). The web_manager subscribes to `iot/alert/#`, maps
that identity to its active room device, stores a `DATA_ANOMALY` row in
`alerts`, and sends a Web Push notification. The alert is also returned by the
room alerts API and shown in the MQTT device dashboard when the device is linked
to a room. Ensure web_manager's `mqtt_acl.json` entry retains subscribe access
to `iot/alert/#`, and enable Web Push from the authenticated MQTT management
page to receive background notifications.


Sensor rule ingestion in web_manager uses the configured `warning_low` and
`warning_high` thresholds (and marks readings beyond `min_value`/`max_value` as
critical). Its statistical outlier rule uses the previous 20 readings at most;
configure `SENSOR_ANOMALY_MIN_SAMPLES` (3 to 20, default 8) and
`SENSOR_ANOMALY_SIGMA` (default 3) in the web_manager environment.
