import json
import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest
from paho.mqtt import client as mqtt

BROKER="localhost"
TOPIC="iot/power/machine1"

history=[]

model=IsolationForest(
    contamination=0.02,
    random_state=42
)

trained=False

def train():
    global trained

    if len(history)<200:
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

    data=json.loads(msg.payload)

    history.append(data)

    if len(history)>5000:
        history.pop(0)

    if not trained:
        train()
        return

    if detect(data):
        print("BAT THUONG:",data)

        client.publish(
            "iot/alert/machine1",
            json.dumps({
                "status":"abnormal",
                "power":data["power"],
                "current":data["current"]
            })
        )

client=mqtt.Client()

client.on_message=on_message

client.connect(BROKER,1883)
client.subscribe(TOPIC)

client.loop_forever()