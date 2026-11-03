// Subscribes to device data through mqttBroker/MqttBroker1885.js. Security
// settings mirror the broker flags:
//   enable_TLS_SSL / enableTLSCertificate  -> MQTT_CA_CERT2, MQTT_CLIENT_CERT2, MQTT_CLIENT_KEY2
//                                             (ECDSA P-256, see mqttBroker/certs/CERTIFICATE_SETUP.md)
//   mTLS off (mqtt_users.json)             -> MQTT_USERNAME2, MQTT_PASSWORD2
//   enableMessageAuthentication            -> MQTT_HMAC_SECRET: the publisher's secret, used to
//                                             check the signature of received messages
//   enableBruteForce                       -> stop reconnecting when the broker rejects the credentials
//   enableACL (mqtt_acl.json)              -> MQTT_SUBSCRIBE_TOPIC2 must be allowed for this clientId
require('dotenv').config();
const mqtt = require('mqtt');
const { createHmac, timingSafeEqual } = require('crypto');
const fs = require('fs');
const path = require('path');

const mqttHost = process.env.MQTT_HOST || 'localhost';
const mqttPort = Number(process.env.MQTT_PORT || 1885);
const brokerUrl = `mqtts://${mqttHost}:${mqttPort}`;
const clientId = process.env.DEVICE_ID2 || 'device2';
// Listens to the publisher simulator (pub_c/<DEVICE_ID>); it has its own
// variable because MQTT_SUBSCRIBE_TOPIC is the publisher's command topic.
const subscribeTopic = process.env.MQTT_SUBSCRIBE_TOPIC2 || `pub_c/${process.env.DEVICE_ID || 'device1'}`;
const username = process.env.MQTT_USERNAME2 || undefined;
const password = process.env.MQTT_PASSWORD2 || undefined;
const hmacSecret = process.env.MQTT_HMAC_SECRET || '';
const brokerCertDir = path.resolve(__dirname, '..', 'mqttBroker', 'certs');

function resolveCertPath(envName, defaultPath) {
  const certPath = process.env[envName] || defaultPath;
  return path.isAbsolute(certPath) ? certPath : path.resolve(__dirname, certPath);
}

const caPath = resolveCertPath('MQTT_CA_CERT2', path.join(brokerCertDir, 'ca.crt'));
const clientCertPath = resolveCertPath('MQTT_CLIENT_CERT2', path.join(brokerCertDir, 'device2.crt'));
const clientKeyPath = resolveCertPath('MQTT_CLIENT_KEY2', path.join(brokerCertDir, 'device2.key'));

for (const certPath of [caPath, clientCertPath, clientKeyPath]) {
  if (!fs.existsSync(certPath)) {
    console.error(`Certificate file not found: ${certPath}`);
    console.error('Set MQTT_CA_CERT2, MQTT_CLIENT_CERT2, and MQTT_CLIENT_KEY2 to valid certificate paths.');
    process.exit(1);
  }
}

const tlsOptions = {
  ca: fs.readFileSync(caPath),
  cert: fs.readFileSync(clientCertPath),
  key: fs.readFileSync(clientKeyPath),
  rejectUnauthorized: true,
};
if (process.env.MQTT_CLIENT_KEY_PASSPHRASE) {
  tlsOptions.passphrase = process.env.MQTT_CLIENT_KEY_PASSPHRASE;
}

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js.
function canonicalize(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalize).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

// The broker removes "signature" and "keyId" before computing the HMAC.
function computeSignature(payload) {
  const { signature, keyId, ...body } = payload;
  return createHmac('sha256', hmacSecret).update(canonicalize(body)).digest('hex');
}

function describeSignature(text) {
  if (!hmacSecret) return '';
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    return ' [not JSON]';
  }
  if (!payload || typeof payload.signature !== 'string') return ' [unsigned]';
  const expected = Buffer.from(computeSignature(payload), 'hex');
  const received = Buffer.from(payload.signature.replace(/^(0x|sha256:)/i, ''), 'hex');
  const valid = expected.length === received.length && timingSafeEqual(expected, received);
  return valid ? ' [signature OK]' : ' [signature INVALID]';
}

const client = mqtt.connect(brokerUrl, {
  clientId,
  username,
  password,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
  ...tlsOptions,
});

client.on('connect', () => {
  console.log(`Connected to ${brokerUrl} as ${clientId}`);
  console.log(`Listening on: ${subscribeTopic}`);

  client.subscribe(subscribeTopic, { qos: 1 }, (error, granted) => {
    if (error) {
      console.error('Subscribe failed:', error.message);
    } else if (granted.some((grant) => grant.qos >= 128)) {
      // SUBACK 0x80: the broker refused the topic.
      console.error(`Subscribe rejected for ${subscribeTopic}: not allowed for ${clientId} in mqtt_acl.json`);
    } else {
      console.log(`Subscribed to ${subscribeTopic}`);
    }
  });
});

client.on('message', (receivedTopic, message) => {
  const text = message.toString();
  console.log(`[received] ${receivedTopic} ${text}${describeSignature(text)}`);
});

client.on('reconnect', () => console.log('Reconnecting...'));
client.on('error', (error) => {
  console.error('MQTT error:', error.message);
  // CONNACK 4/5 (v3.1.1) or 134/135 (v5): retrying with the same credentials
  // only adds failures until the broker's brute-force protection blocks us.
  if ([4, 5, 134, 135].includes(error.code)) {
    console.error('Broker rejected the credentials: check mqtt_device_certs.json (fingerprint/clientId)' +
      ' or mqtt_users.json (MQTT_USERNAME/MQTT_PASSWORD). Not retrying.');
    client.end(true, () => process.exit(1));
  }
});

function shutdown() {
  console.log('\nStopping simulator...');
  client.end(true, () => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
