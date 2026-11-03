const fs = require('fs');
const path = require('path');
const { createHmac, randomUUID } = require('crypto');

/**
 * Security required by mqttBroker/MqttBroker1885.js:
 *  - mTLS with an ECDSA P-256 client certificate registered for the clientId
 *    in mqtt_device_certs.json (enableTLSCertificate, enableECDSA);
 *  - "timestamp" + "nonce" in every JSON publish (enableAttack);
 *  - optional HMAC-SHA256 "keyId" + "signature" (enableMessageAuthentication).
 *
 * Environment:
 *  MQTT_CERTS                         certificate folder (shared with saveCertificateMqtt)
 *  MQTT_CA_CERT / MQTT_CLIENT_CERT / MQTT_CLIENT_KEY
 *                                     explicit paths; default <MQTT_CERTS>/ca.crt, <clientId>.crt/.key
 *  MQTT_REPLAY_PROTECTION=false       disable timestamp/nonce (broker enableAttack=false)
 *  MQTT_HMAC_SECRET, MQTT_HMAC_KEY_ID HMAC signing (key in mqtt_message_auth.json)
 */

function readCredential(envName, fileName) {
  const certDir = process.env.MQTT_CERTS;
  const file = process.env[envName] || (certDir ? path.join(certDir, fileName) : '');
  if (!file || !fs.existsSync(file)) {
    throw new Error(`Thiếu chứng chỉ MQTT: đặt ${envName} hoặc MQTT_CERTS (không tìm thấy ${file || fileName})`);
  }
  return fs.readFileSync(file);
}

/** TLS options for mqtt.connect(); certificate paths only come from the server environment. */
function tlsOptions(protocol, clientId) {
  if (protocol !== 'mqtts' && protocol !== 'wss') return {};
  return {
    ca: readCredential('MQTT_CA_CERT', 'ca.crt'),
    cert: readCredential('MQTT_CLIENT_CERT', `${clientId}.crt`),
    key: readCredential('MQTT_CLIENT_KEY', `${clientId}.key`),
    rejectUnauthorized: true,
  };
}

// Same canonical form as canonicalizePayloadValue() in MqttBroker1885.js.
function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

/**
 * Adds replay metadata and the HMAC signature to a JSON object payload.
 * Other payloads are returned unchanged (the broker fingerprints them by hash).
 */
function protectPayload(payload, clientId) {
  let object = payload;
  if (typeof payload === 'string') {
    try { object = JSON.parse(payload); } catch (e) { return payload; }
  }
  if (!object || typeof object !== 'object' || Array.isArray(object)) {
    return typeof payload === 'string' ? payload : JSON.stringify(payload);
  }

  const { signature, keyId, ...body } = object;
  if (process.env.MQTT_REPLAY_PROTECTION !== 'false') {
    body.timestamp = Date.now();
    body.nonce = randomUUID();
  }
  const secret = process.env.MQTT_HMAC_SECRET;
  if (secret) {
    // The broker removes "signature" and "keyId" before computing the HMAC,
    // so sign first and add both fields afterwards.
    const signatureHex = createHmac('sha256', secret).update(canonicalize(body)).digest('hex');
    body.keyId = process.env.MQTT_HMAC_KEY_ID || clientId;
    body.signature = signatureHex;
  }
  return JSON.stringify(body);
}

/** CONNACK codes that will not succeed on retry (v3.1.1: 4/5, v5: 134/135). */
function isCredentialRejection(error) {
  return !!error && [4, 5, 134, 135].includes(error.code);
}

module.exports = { tlsOptions, protectPayload, canonicalize, isCredentialRejection };
