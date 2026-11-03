// Simulates a device against mqttBroker/MqttBroker1885.js. Security settings
// mirror the broker flags:
//   enable_TLS_SSL / enableTLSCertificate  -> MQTT_CA_CERT, MQTT_CLIENT_CERT, MQTT_CLIENT_KEY
//                                             (ECDSA P-256, see mqttBroker/certs/CERTIFICATE_SETUP.md)
//   mTLS off (mqtt_users.json)             -> MQTT_USERNAME, MQTT_PASSWORD
//   enableAttack (mqtt_replay.json)        -> "timestamp" + "nonce" in every payload
//   enableMessageAuthentication            -> MQTT_HMAC_SECRET (+ MQTT_HMAC_KEY_ID, default clientId)
//   enableBruteForce                       -> stop reconnecting when the broker rejects the credentials
//   enableACL (mqtt_acl.json)              -> MQTT_PUBLISH_TOPIC / MQTT_SUBSCRIBE_TOPIC must be allowed
require('dotenv').config();
const mqtt = require('mqtt');
const { randomUUID, createHmac, timingSafeEqual } = require('crypto');
const fs = require('fs');
const path = require('path');

const mqttHost = process.env.MQTT_HOST || 'localhost';
const mqttPort = Number(process.env.MQTT_PORT || 1885);
const brokerUrl = `mqtts://${mqttHost}:${mqttPort}`;
const clientId = process.env.MQTT_CLIENT_ID || 'device1';
const siteId = process.env.SITE_ID || `demo-${randomUUID().slice(0, 8)}`;
const deviceId = process.env.DEVICE_ID || clientId;
const intervalMs = Math.max(1000, Number(process.env.INTERVAL_MS || 5000));
const publishTopic = process.env.MQTT_PUBLISH_TOPIC || `pub_c/${clientId}`;
const subscribeTopic = process.env.MQTT_SUBSCRIBE_TOPIC || `sub_c/${clientId}`;
const username = process.env.MQTT_USERNAME || undefined;
const password = process.env.MQTT_PASSWORD || undefined;
const hmacSecret = process.env.MQTT_HMAC_SECRET || '';
const hmacKeyId = process.env.MQTT_HMAC_KEY_ID || clientId;
const brokerCertDir = path.resolve(__dirname, '..', 'mqttBroker', 'certs');

function resolveCertPath(envName, defaultPath) {
  const certPath = process.env[envName] || defaultPath;
  return path.isAbsolute(certPath) ? certPath : path.resolve(__dirname, certPath);
}

const caPath = resolveCertPath('MQTT_CA_CERT', path.join(brokerCertDir, 'ca.crt'));
const clientCertPath = resolveCertPath('MQTT_CLIENT_CERT', path.join(brokerCertDir, 'device1.crt'));
const clientKeyPath = resolveCertPath('MQTT_CLIENT_KEY', path.join(brokerCertDir, 'device1.key'));

for (const certPath of [caPath, clientCertPath, clientKeyPath]) {
  if (!fs.existsSync(certPath)) {
    console.error(`Certificate file not found: ${certPath}`);
    console.error('Set MQTT_CA_CERT, MQTT_CLIENT_CERT, and MQTT_CLIENT_KEY to valid certificate paths.');
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

let sequence = 0;
let timer;

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function createSensorPayload() {
  sequence += 1;
  const temperature = 27 + Math.sin(sequence / 5) * 3 + (Math.random() - 0.5);
  const humidity = 65 - (temperature - 27) * 1.8 + (Math.random() - 0.5) * 4;

  return {
    messageId: randomUUID(),
    timestamp: new Date().toISOString(),
    nonce: randomUUID(),
    sequence,
    deviceId,
    siteId,
    metrics: {
      temperatureC: round(temperature),
      humidityPct: round(Math.max(0, Math.min(100, humidity))),
      pressureHpa: round(1013 + (Math.random() - 0.5) * 8),
      co2Ppm: Math.round(550 + Math.random() * 180),
      batteryPct: round(Math.max(10, 100 - sequence * 0.02)),
    },
    status: 'online',
  };
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

function signPayload(payload) {
  if (!hmacSecret) return payload;
  return { ...payload, keyId: hmacKeyId, signature: computeSignature(payload) };
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

function publishTelemetry(client) {
  const payload = signPayload(createSensorPayload());
  client.publish(publishTopic, JSON.stringify(payload), { qos: 1, retain: false }, (error) => {
    if (error) {
      console.error('Publish failed:', error.message);
      return;
    }
    console.log(`[published] ${publishTopic}`, payload.metrics);
  });
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
  console.log(`Publishing one message every ${intervalMs} ms on: ${publishTopic}`);

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

  publishTelemetry(client);
  clearInterval(timer);
  timer = setInterval(() => publishTelemetry(client), intervalMs);
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
    clearInterval(timer);
    client.end(true, () => process.exit(1));
  }
});

function shutdown() {
  console.log('\nStopping simulator...');
  clearInterval(timer);
  client.end(true, () => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
