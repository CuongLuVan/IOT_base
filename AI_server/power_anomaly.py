import json
import os
import sys

import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from paho.mqtt import client as mqtt

from mqtt_security import CREDENTIAL_REJECTED, protect_payload, tls_context

try:
    from dotenv import load_dotenv  # optional: python-dotenv
    load_dotenv()
except ImportError:
    pass

# Connection to mqttBroker/MqttBroker1885.js: MQTTS + mTLS with the ECDSA P-256
# certificate of CLIENT_ID (registered in mqtt_device_certs.json, topics
# allowed in mqtt_acl.json).
BROKER = os.environ.get("MQTT_HOST", "localhost")
PORT = int(os.environ.get("MQTT_PORT", "1885"))
CLIENT_ID = os.environ.get("MQTT_CLIENT_ID", "iot_ai_control")
CERT_DIR = os.environ.get("MQTT_CERTS",
                          os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "mqttBroker", "certs"))
CA_CERT = os.environ.get("MQTT_CA_CERT") or os.path.join(CERT_DIR, "ca.crt")
CLIENT_CERT = os.environ.get("MQTT_CLIENT_CERT") or os.path.join(CERT_DIR, f"{CLIENT_ID}.crt")
CLIENT_KEY = os.environ.get("MQTT_CLIENT_KEY") or os.path.join(CERT_DIR, f"{CLIENT_ID}.key")
TOPIC = os.environ.get("MQTT_SUBSCRIBE_TOPIC", "iot/power/machine1")
ALERT_TOPIC = os.environ.get("MQTT_ALERT_TOPIC", "iot/alert/machine1")
SOURCE_DEVICE = os.environ.get("MQTT_SOURCE_DEVICE", TOPIC.rstrip("/").split("/")[-1])
SENSOR_KEY = os.environ.get("MQTT_POWER_SENSOR_KEY", "power")
TRAINING_SAMPLES = max(20, int(os.environ.get("ANOMALY_TRAINING_SAMPLES", "200")))
CONTAMINATION = float(os.environ.get("ANOMALY_CONTAMINATION", "0.02"))
if not 0 < CONTAMINATION <= 0.5:
    raise ValueError("ANOMALY_CONTAMINATION must be > 0 and <= 0.5")

history=[]

model=IsolationForest(
    contamination=CONTAMINATION,
    random_state=42
)

trained=False

def train():
    global trained

    if len(history)<TRAINING_SAMPLES:
        return

    df=pd.DataFrame(history)

    X=df[[
        "current",
        "voltage",
        "power"
    ]]

    model.fit(X)
    trained=True

def detect(data):
    X=np.array([[
        data["current"],
        data["voltage"],
        data["power"]
    ]])

    result=model.predict(X)[0]

    return result==-1

def on_message(client,userdata,msg):

    try:
        data=json.loads(msg.payload)
        sample={key: float(data[key]) for key in ("current", "voltage", "power")}
    except (ValueError, KeyError, TypeError):
        print("Bo qua ban tin khong hop le tren", msg.topic)
        return

    history.append(sample)

    if len(history)>5000:
        history.pop(0)

    if not trained:
        train()
        return

    if detect(sample):
        print("BAT THUONG:",data)

        # timestamp/nonce (and the HMAC signature when configured) for the broker.
        client.publish(
            ALERT_TOPIC,
            protect_payload({
                "status":"abnormal",
                "source_device":SOURCE_DEVICE,
                "sensor_key":SENSOR_KEY,
                "model":"IsolationForest",
                "severity":"WARNING",
                "power":sample["power"],
                "current":sample["current"],
                "voltage":sample["voltage"]
            }, CLIENT_ID),
            qos=1
        )

# Signatures work with paho-mqtt 1.x and 2.x (2.x adds `properties`).
def on_connect(client, userdata, flags, rc, properties=None):
    code = getattr(rc, "value", rc)
    if code != 0:
        print("Ket noi MQTT bi tu choi, ma", code)
        if code in CREDENTIAL_REJECTED:
            # Retrying only adds failures for the broker's brute-force protection.
            print("Kiem tra mqtt_device_certs.json cho", CLIENT_ID, "- dung, khong thu lai.")
            client.disconnect()
        return
    print("Da ket noi", BROKER, PORT, "voi clientId", CLIENT_ID)
    client.subscribe(TOPIC, qos=1)

def on_subscribe(client, userdata, mid, granted, properties=None):
    for grant in granted:
        if getattr(grant, "value", grant) >= 128:
            print("Broker tu choi subscribe", TOPIC, "- clientId chua duoc phep trong mqtt_acl.json")

try:
    client=mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=CLIENT_ID)
except AttributeError:  # paho-mqtt 1.x
    client=mqtt.Client(client_id=CLIENT_ID)

try:
    client.tls_set_context(tls_context(CA_CERT, CLIENT_CERT, CLIENT_KEY))
except (FileNotFoundError, OSError) as error:
    sys.exit(f"Khong nap duoc chung chi MQTT: {error}")
if os.environ.get("MQTT_USERNAME"):
    # Only needed when the broker runs without mTLS (mqtt_users.json).
    client.username_pw_set(os.environ["MQTT_USERNAME"], os.environ.get("MQTT_PASSWORD"))

client.on_connect=on_connect
client.on_subscribe=on_subscribe
client.on_message=on_message

client.connect(BROKER,PORT)

client.loop_forever()
