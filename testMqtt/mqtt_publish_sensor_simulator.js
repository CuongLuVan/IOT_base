const mqtt = require('mqtt');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const mqttHost = process.env.MQTT_HOST || 'localhost';
const mqttPort = Number(process.env.MQTT_PORT || 1885);
const brokerUrl = `mqtts://${mqttHost}:${mqttPort}`;
const clientId = process.env.MQTT_CLIENT_ID || 'device1';
const siteId = process.env.SITE_ID || `demo-${randomUUID().slice(0, 8)}`;
const deviceId = process.env.DEVICE_ID || clientId;
const intervalMs = Math.max(1000, Number(process.env.INTERVAL_MS || 5000));
const publishTopic = process.env.MQTT_PUBLISH_TOPIC || `devices/${clientId}/data`;
const subscribeTopic = process.env.MQTT_SUBSCRIBE_TOPIC || `devices/${clientId}/commands/#`;
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

function publishTelemetry(client) {
  const payload = createSensorPayload();
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
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
  ...tlsOptions,
});

client.on('connect', () => {
  console.log(`Connected to ${brokerUrl} as ${clientId}`);
  console.log(`Publishing one message every ${intervalMs} ms on: ${publishTopic}`);

  client.subscribe(subscribeTopic, { qos: 1 }, (error) => {
    if (error) console.error('Subscribe failed:', error.message);
    else console.log(`Subscribed to ${subscribeTopic}`);
  });

  publishTelemetry(client);
  clearInterval(timer);
  timer = setInterval(() => publishTelemetry(client), intervalMs);
});

client.on('message', (receivedTopic, message) => {
  console.log(`[received] ${receivedTopic} ${message.toString()}`);
});

client.on('reconnect', () => console.log('Reconnecting...'));
client.on('error', (error) => console.error('MQTT error:', error.message));

function shutdown() {
  console.log('\nStopping simulator...');
  clearInterval(timer);
  client.end(true, () => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
