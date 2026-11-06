// MQTT connection of the context engine to mqttBroker/MqttBroker1885.js.
// The broker requires mutual TLS with an ECDSA P-256 client certificate
// registered for the clientId in mqtt_device_certs.json, "timestamp" + "nonce"
// in every JSON publish, and the topics of that clientId in mqtt_acl.json.
//
// Environment (separate from LissenAndReply.js, which uses MQTT_CLIENT_ID):
//   MQTT_HOST, MQTT_PORT
//   MQTT_CONTEXT_CLIENT_ID          default iot_context
//   MQTT_CERTS                      folder with ca.crt, <clientId>.crt/.key
//   MQTT_CA_CERT, MQTT_CONTEXT_CERT, MQTT_CONTEXT_KEY   explicit paths (optional)
//   MQTT_REPLAY_PROTECTION=false    no timestamp/nonce (broker enableAttack=false)
//   MQTT_HMAC_SECRET, MQTT_HMAC_KEY_ID   HMAC signature (mqtt_message_auth.json)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const EventEmitter = require('events');
const mqtt = require('mqtt');

// Own commands seen again on a subscribed topic are ignored this long.
const OWN_ECHO_MS = 30000;

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js.
function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

class BrokerClient extends EventEmitter {
  constructor() {
    super();
    this.clientId = process.env.MQTT_CONTEXT_CLIENT_ID || 'iot_context';
    this.client = null;
    this.topics = new Set();
    this.sent = new Map();  // payload text -> time, to recognise our own commands
  }

  readCredential(envName, fileName) {
    const certDir = process.env.MQTT_CERTS || path.resolve(__dirname, '..', '..', '..', 'mqttBroker', 'certs');
    const file = process.env[envName] || path.join(certDir, fileName);
    if (!fs.existsSync(file)) {
      throw new Error('MQTT credential not found: ' + file + ' (set ' + envName + ' or MQTT_CERTS)');
    }
    return fs.readFileSync(file);
  }

  connect() {
    if (this.client) return;
    const host = process.env.MQTT_HOST || 'localhost';
    const port = Number(process.env.MQTT_PORT || 1885);
    this.client = mqtt.connect('mqtts://' + host + ':' + port, {
      clientId: this.clientId,
      ca: this.readCredential('MQTT_CA_CERT', 'ca.crt'),
      cert: this.readCredential('MQTT_CONTEXT_CERT', this.clientId + '.crt'),
      key: this.readCredential('MQTT_CONTEXT_KEY', this.clientId + '.key'),
      rejectUnauthorized: true,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    });
    this.client.on('connect', () => {
      console.log('[Context] MQTT connected to ' + host + ':' + port + ' as ' + this.clientId);
      this._subscribe([...this.topics]);
    });
    this.client.on('message', (topic, payload) => {
      this.emit('message', topic, payload.toString('utf8'));
    });
    this.client.on('error', (err) => {
      console.error('[Context] MQTT error:', err.message);
      // CONNACK 4/5: retrying with the same credentials only counts as more
      // failures for the broker's brute-force protection.
      if ([4, 5, 134, 135].includes(err.code)) {
        console.error('[Context] Broker rejected the credentials: check mqtt_device_certs.json for ' +
          this.clientId + '. Not retrying.');
        this.client.end(true);
      }
    });
  }

  isConnected() {
    return !!(this.client && this.client.connected);
  }

  subscribe(topics) {
    const added = topics.filter((topic) => !this.topics.has(topic));
    added.forEach((topic) => this.topics.add(topic));
    if (added.length && this.isConnected()) this._subscribe(added);
  }

  _subscribe(topics) {
    if (!topics.length) return;
    this.client.subscribe(topics, { qos: 1 }, (err, granted) => {
      if (err) {
        console.error('[Context] MQTT subscribe failed:', err.message);
        return;
      }
      (granted || []).filter((grant) => grant.qos >= 128).forEach((grant) => {
        console.error('[Context] Subscribe refused for ' + grant.topic + ': not allowed for ' +
          this.clientId + ' in mqtt_acl.json');
      });
    });
  }

  // Adds replay metadata and the HMAC signature like web_manager's protectPayload().
  protect(object) {
    const body = Object.assign({}, object);
    if (process.env.MQTT_REPLAY_PROTECTION !== 'false') {
      body.timestamp = Date.now();
      body.nonce = crypto.randomBytes(16).toString('hex');
    }
    const secret = process.env.MQTT_HMAC_SECRET;
    if (secret) {
      // The broker removes "signature" and "keyId" before computing the HMAC.
      const signature = crypto.createHmac('sha256', secret).update(canonicalize(body)).digest('hex');
      body.keyId = process.env.MQTT_HMAC_KEY_ID || this.clientId;
      body.signature = signature;
    }
    return JSON.stringify(body);
  }

  publish(topic, object) {
    if (!this.isConnected()) return Promise.reject(new Error('MQTT broker chưa kết nối'));
    const payload = this.protect(object);
    const now = Date.now();
    this.sent.forEach((time, text) => { if (now - time > OWN_ECHO_MS) this.sent.delete(text); });
    this.sent.set(payload, now);
    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, { qos: 1, retain: false }, (err) => (err ? reject(err) : resolve()));
    });
  }

  // True for a command this client published (seen again on a subscribed topic).
  isOwnMessage(payload) {
    return this.sent.has(payload);
  }
}

module.exports = new BrokerClient();
