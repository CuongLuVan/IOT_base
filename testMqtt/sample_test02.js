const mqtt = require('mqtt');
const tls = require('tls');

// =========================
// CONFIG
// =========================
const mqtt_host = '';
const mqtt_port = 8883;

const mqtt_client = 'nodejs_client_002';
const mqtt_user = 'testInfo';
const mqtt_pwd = 'testdata1U';

const mqtt_topic_pub = 'demo/pub';
const mqtt_topic_sub = 'demo/sub';

// SHA1 fingerprint của SSL certificate
// ví dụ:
// AA:BB:CC:DD:11:22:33...
const mqtt_fingerprint =
    'AA:BB:CC:DD:EE:FF:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE';

// =========================
// MQTT CONNECT
// =========================
const client = mqtt.connect({
    host: mqtt_host,
    port: mqtt_port,
    protocol: 'mqtts',

    clientId: mqtt_client,

    username: mqtt_user,
    password: mqtt_pwd,

    rejectUnauthorized: false,

    reconnectPeriod: 5000,

    // verify fingerprint
   /* checkServerIdentity: (host, cert) => {
        const fingerprint = cert.fingerprint;

        console.log('SERVER FINGERPRINT:', fingerprint);

        if (
            fingerprint.toUpperCase() !==
            mqtt_fingerprint.toUpperCase()
        ) {
            throw new Error('SSL Fingerprint không đúng');
        }
    }*/
});

// =========================
// CONNECT
// =========================
client.on('connect', () => {
    console.log('MQTT CONNECTED');

    // subscribe
    client.subscribe(mqtt_topic_pub, (err) => {
        if (err) {
            console.log('SUBSCRIBE ERROR:', err);
            return;
        }

        console.log('SUBSCRIBED:', mqtt_topic_pub);

        // publish test
        const data = {
            com: 1,
            value: 1
        };

        client.publish(
            mqtt_topic_sub,
            JSON.stringify(data),
            {
                qos: 1,
                retain: false
            },
            (err) => {
                if (err) {
                    console.log('PUBLISH ERROR:', err);
                } else {
                    console.log('PUBLISHED:', data);
                }
            }
        );
    });
});

// =========================
// RECEIVE MESSAGE
// =========================
client.on('message', (topic, message) => {
    console.log('----------------------');
    console.log('TOPIC:', topic);

    const text = message.toString();

    console.log('RAW:', text);

    try {
        const json = JSON.parse(text);

        console.log('JSON:', json);
    } catch (e) {
        console.log('NOT JSON');
    }
});

// =========================
// RECONNECT
// =========================
client.on('reconnect', () => {
    console.log('RECONNECTING...');
});

// =========================
// CLOSE
// =========================
client.on('close', () => {
    console.log('CONNECTION CLOSED');
});

// =========================
// ERROR
// =========================
client.on('error', (err) => {
    console.log('MQTT ERROR:', err.message);
});