const mqtt = require('mqtt');
const { randomUUID } = require('crypto');
const fs = require('fs');
const path = require('path');

const mqttHost = process.env.MQTT_HOST || 'localhost';
const mqttPort = Number(process.env.MQTT_PORT || 1885);
const brokerUrl = `mqtts://${mqttHost}:${mqttPort}`;
const clientId = process.env.MQTT_CLIENT_ID || 'device2';
const subscribeTopic = process.env.MQTT_SUBSCRIBE_TOPIC || 'devices/device1/data';
const brokerCertDir = path.resolve(__dirname, '..', 'mqttBroker', 'certs');

function resolveCertPath(envName, defaultPath) {
  const certPath = process.env[envName] || defaultPath;
  return path.isAbsolute(certPath) ? certPath : path.resolve(__dirname, certPath);
}

const caPath = resolveCertPath('MQTT_CA_CERT', path.join(brokerCertDir, 'ca.crt'));
const clientCertPath = resolveCertPath('MQTT_CLIENT_CERT', path.join(brokerCertDir, 'device2.crt'));
const clientKeyPath = resolveCertPath('MQTT_CLIENT_KEY', path.join(brokerCertDir, 'device2.key'));

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

const client = mqtt.connect(brokerUrl, {
  clientId,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
  ...tlsOptions,
});

client.on('connect', () => {
  console.log(`Connected to ${brokerUrl} as ${clientId}`);
  console.log(`Listening on: ${subscribeTopic}`);

  client.subscribe(subscribeTopic, { qos: 1 }, (error) => {
    if (error) console.error('Subscribe failed:', error.message);
    else console.log(`Subscribed to ${subscribeTopic}`);
  });
});

client.on('message', (receivedTopic, message) => {
  console.log(`[received] ${receivedTopic} ${message.toString()}`);
});

client.on('reconnect', () => console.log('Reconnecting...'));
client.on('error', (error) => console.error('MQTT error:', error.message));

function shutdown() {
  console.log('\nStopping simulator...');
  client.end(true, () => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
