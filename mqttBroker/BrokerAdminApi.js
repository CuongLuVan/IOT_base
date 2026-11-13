'use strict';
/*
 * Provisioning API for the MQTT broker server, used when web_manager runs on
 * another server (MQTT_BROKER_ADMIN_URL in web_manager/.env).
 *
 * It runs as its own process so it never shares the broker's event loop: the
 * broker (MqttBroker1885.js, AedesBroker, the Mosquitto plugin) keeps reading
 * the same JSON rule files and picks up the changes written here.
 *
 *   PUT    /v1/clients/:clientId   idempotent upsert of one device
 *   DELETE /v1/clients/:clientId   idempotent revocation of one device
 *   GET    /v1/clients/:clientId/anticlone         clone-detection status
 *   POST   /v1/clients/:clientId/anticlone/reset   release a quarantine
 *   GET    /v1/health
 *
 * Security: HTTPS + mutual TLS. The client certificate must be signed by
 * certs/ca.crt and its CN must be listed in BROKER_ADMIN_ALLOWED_CN.
 * Bind it to a private address or firewall the port to the web_manager host.
 *
 * Settings come from the environment or from mqttBroker/.env (see
 * .env.sample; BROKER_ADMIN_ENV_FILE selects another file). The environment wins.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Minimal KEY=VALUE loader so the broker package needs no dotenv dependency.
function loadEnvFile(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  text.split(/\r?\n/).forEach(function(line) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) return;
    let value = match[2];
    if (/^(['"]).*\1$/.test(value)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    if (value !== '') process.env[match[1]] = value;
  });
}
loadEnvFile(path.resolve(__dirname, process.env.BROKER_ADMIN_ENV_FILE || '.env'));

const BROKER_DIR = path.resolve(__dirname, process.env.MQTT_BROKER_DIR || '.');
const CERT_DIR = path.resolve(BROKER_DIR, process.env.MQTT_CERTS || 'certs');
const HOST = process.env.BROKER_ADMIN_HOST || '0.0.0.0';
const PORT = Number(process.env.BROKER_ADMIN_PORT || 8885);
const ALLOWED_CN = (process.env.BROKER_ADMIN_ALLOWED_CN || 'web_manager')
  .split(',').map(function(name) { return name.trim(); }).filter(Boolean);
const MAX_BODY_BYTES = 16 * 1024;

const CA_PEM = fs.readFileSync(path.join(CERT_DIR, 'ca.crt'));
const CA_CERTIFICATE = new crypto.X509Certificate(CA_PEM);

// Upsert order: a device is only accepted once mqtt_client_ids.json and
// mqtt_device_certs.json list it, and by then everything else exists.
// Revocation uses the reverse order, so the device is refused first.
const FILES = [
  { key: 'acl', file: 'mqtt_acl.json', array: 'rules' },
  { key: 'messageAuth', file: 'mqtt_message_auth.json', object: 'keys' },
  { key: 'users', file: 'mqtt_users.json', array: 'users' },
  { key: 'deviceCerts', file: 'mqtt_device_certs.json', array: 'devices' },
  { key: 'clientIds', file: 'mqtt_client_ids.json', array: 'clients' },
];
const REVOKE_ORDER = FILES.slice().reverse();

const ID_PATTERN = /^[A-Za-z0-9_.-]{1,40}$/;

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function requireText(body, field, required) {
  const value = body[field] == null ? '' : String(body[field]).trim();
  if (required && !value) {
    throw httpError(400, field + ' is required.');
  }
  if (value.length > 40) {
    throw httpError(400, field + ' must be 40 characters or fewer.');
  }
  return value;
}

function topicList(value, field) {
  const list = value == null ? [] : Array.isArray(value) ? value : [value];
  if (list.length > 8) {
    throw httpError(400, field + ' has too many topics.');
  }
  return list.map(function(topic) {
    if (typeof topic !== 'string' || !topic.trim() || topic.length > 128) {
      throw httpError(400, field + ' contains an invalid topic.');
    }
    return topic.trim();
  });
}

function commonName(certificate) {
  const line = String(certificate.subject || '').split('\n')
    .find(function(item) { return item.indexOf('CN=') === 0; });
  return line ? line.slice(3) : '';
}

// The broker derives the fingerprint itself from a certificate it has checked,
// so a wrong fingerprint can never lock a device out (or let another one in).
function verifyDeviceCertificate(pem, clientId) {
  let certificate;
  try {
    certificate = new crypto.X509Certificate(String(pem || ''));
  } catch (error) {
    throw httpError(400, 'certificate is not a valid PEM certificate.');
  }
  const keyDetails = certificate.publicKey.asymmetricKeyDetails || {};
  if (!certificate.checkIssued(CA_CERTIFICATE) || !certificate.verify(CA_CERTIFICATE.publicKey)) {
    throw httpError(400, 'certificate is not signed by the broker CA.');
  }
  if (commonName(certificate) !== clientId) {
    throw httpError(400, 'certificate CN does not match clientId.');
  }
  if (certificate.publicKey.asymmetricKeyType !== 'ec' || keyDetails.namedCurve !== 'prime256v1') {
    throw httpError(400, 'certificate must use ECDSA P-256.');
  }
  if (Date.parse(certificate.validTo) <= Date.now()) {
    throw httpError(400, 'certificate has expired.');
  }
  return certificate.fingerprint256;
}

function checkClientId(clientId) {
  if (!ID_PATTERN.test(clientId)) {
    throw httpError(400, 'Invalid clientId.');
  }
  // Backend services (web_manager itself, ...) cannot be revoked or replaced here.
  if (ALLOWED_CN.indexOf(clientId) !== -1) {
    throw httpError(403, 'clientId belongs to an admin client.');
  }
  return clientId;
}

function parseClient(clientId, body) {
  const messageAuthKey = String(body.messageAuthKey || '');
  if (!/^[0-9a-fA-F]{64}$/.test(messageAuthKey)) {
    throw httpError(400, 'messageAuthKey must be 64 hex characters.');
  }
  return {
    clientId: clientId,
    username: requireText(body, 'username', true),
    password: requireText(body, 'password', true),
    label: requireText(body, 'label', false),
    publish: topicList(body.publish, 'publish'),
    subscribe: topicList(body.subscribe, 'subscribe'),
    fingerprint256: verifyDeviceCertificate(body.certificate, clientId),
    messageAuthKey: messageAuthKey.toLowerCase(),
  };
}

function upsert(entries, key, id, value) {
  const index = entries.findIndex(function(entry) { return entry && entry[key] === id; });
  if (index === -1) {
    entries.push(value);
  } else {
    entries[index] = Object.assign({}, entries[index], value);
  }
}

function removeWhere(entries, predicate) {
  for (let index = entries.length - 1; index >= 0; index--) {
    if (entries[index] && predicate(entries[index])) entries.splice(index, 1);
  }
}

function applyClient(settings, client) {
  upsert(settings.acl.rules, 'clientId', client.clientId, {
    clientId: client.clientId, publish: client.publish, subscribe: client.subscribe,
  });
  settings.messageAuth.keys[client.clientId] = client.messageAuthKey;
  upsert(settings.users.users, 'username', client.username, {
    username: client.username, password: client.password,
  });
  upsert(settings.deviceCerts.devices, 'clientId', client.clientId, {
    clientId: client.clientId, fingerprint256: client.fingerprint256,
  });
  upsert(settings.clientIds.clients, 'clientId', client.clientId, {
    clientId: client.clientId, username: client.username, label: client.label,
  });
}

// Removes every rule of the client. Its username/password entry is removed
// only when no other registered client still uses that username (one
// account can own several devices).
function revokeClient(settings, clientId) {
  const clients = settings.clientIds.clients;
  const usernames = clients
    .filter(function(entry) { return entry && entry.clientId === clientId && entry.username; })
    .map(function(entry) { return entry.username; });
  removeWhere(clients, function(entry) { return entry.clientId === clientId; });
  removeWhere(settings.deviceCerts.devices, function(entry) { return entry.clientId === clientId; });
  removeWhere(settings.acl.rules, function(entry) { return entry.clientId === clientId; });
  delete settings.messageAuth.keys[clientId];
  usernames.forEach(function(username) {
    const stillUsed = clients.some(function(entry) { return entry && entry.username === username; }) ||
      ALLOWED_CN.indexOf(username) !== -1;
    if (!stillUsed) {
      removeWhere(settings.users.users, function(entry) { return entry.username === username; });
    }
  });
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// Windows refuses to replace a file another process (the broker) has open for
// a moment; retry instead of failing the provisioning request.
async function replaceFile(tempPath, targetPath) {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(tempPath, targetPath);
      return;
    } catch (error) {
      if (attempt >= 20 || ['EPERM', 'EBUSY', 'EACCES'].indexOf(error.code) === -1) {
        throw error;
      }
      await sleep(25);
    }
  }
}

// Reads the five rule files, lets mutate() change them, then replaces the
// changed ones in writeOrder (atomic rename each; restored on failure).
async function updateRuleFiles(writeOrder, mutate) {
  const originals = {};
  const settings = {};
  FILES.forEach(function(item) {
    const filePath = path.join(BROKER_DIR, item.file);
    originals[item.key] = fs.readFileSync(filePath, 'utf8');
    const value = JSON.parse(originals[item.key]);
    const container = value && (item.array ? value[item.array] : value[item.object]);
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        (item.array && !Array.isArray(container)) ||
        (item.object && (!container || typeof container !== 'object' || Array.isArray(container)))) {
      throw new Error('Invalid broker configuration file: ' + item.file);
    }
    settings[item.key] = value;
  });

  mutate(settings);

  const replaced = [];
  try {
    for (const item of writeOrder) {
      const filePath = path.join(BROKER_DIR, item.file);
      const next = JSON.stringify(settings[item.key], null, 2) + '\n';
      if (next === originals[item.key]) {
        continue; // unchanged: do not invalidate the broker caches
      }
      const tempPath = filePath + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
      fs.writeFileSync(tempPath, next, { encoding: 'utf8', mode: 0o600 });
      try {
        await replaceFile(tempPath, filePath);
      } finally {
        fs.rmSync(tempPath, { force: true });
      }
      replaced.push(item);
    }
  } catch (error) {
    replaced.reverse().forEach(function(item) {
      fs.writeFileSync(path.join(BROKER_DIR, item.file), originals[item.key], { encoding: 'utf8', mode: 0o600 });
    });
    throw error;
  }
  return replaced.map(function(item) { return item.file; });
}

/* Anti-clone (antiClone.js). The broker owns mqtt_anticlone_state.json; this
 * process only reads it and asks for a release through
 * mqtt_anticlone_reset.json, which the broker watches. */
const ANTICLONE_STATE = path.join(BROKER_DIR, 'mqtt_anticlone_state.json');
const ANTICLONE_RESET = path.join(BROKER_DIR, 'mqtt_anticlone_reset.json');

function readJsonObject(filePath) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function antiCloneStatus(clientId) {
  const clients = readJsonObject(ANTICLONE_STATE).clients || {};
  const record = clients[clientId];
  return {
    enrolled: Boolean(record && record.current),
    quarantine: (record && record.quarantine) || null,
    lastIp: (record && record.lastIp) || null,
  };
}

async function requestAntiCloneReset(clientId) {
  const value = readJsonObject(ANTICLONE_RESET);
  value.resets = value.resets && typeof value.resets === 'object' ? value.resets : {};
  value.resets[clientId] = new Date().toISOString();
  const tempPath = ANTICLONE_RESET + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
  try {
    await replaceFile(tempPath, ANTICLONE_RESET);
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

// One write at a time: requests read-modify-write the same files.
let writeQueue = Promise.resolve();
function enqueue(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(function() {});
  return run;
}

function readBody(req) {
  return new Promise(function(resolve, reject) {
    const chunks = [];
    let size = 0;
    req.on('data', function(chunk) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(httpError(413, 'Request body too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function() {
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('not an object');
        }
        resolve(value);
      } catch (error) {
        reject(httpError(400, 'Body must be a JSON object.'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function callerName(req) {
  const peer = req.socket.getPeerCertificate();
  return req.socket.authorized && peer && peer.subject ? peer.subject.CN : '';
}

function describe(changed) {
  return changed.length ? changed.join(', ') : '(unchanged)';
}

async function handle(req, res) {
  const caller = callerName(req);
  if (!caller || ALLOWED_CN.indexOf(caller) === -1) {
    throw httpError(403, 'Client certificate is not allowed.');
  }
  const url = new URL(req.url, 'https://broker.local');
  if (req.method === 'GET' && url.pathname === '/v1/health') {
    send(res, 200, { ok: true });
    return;
  }
  const match = url.pathname.match(/^\/v1\/clients\/([^/]+)(\/anticlone(?:\/reset)?)?$/);
  if (!match) {
    throw httpError(404, 'Not found.');
  }
  let clientId;
  try {
    clientId = checkClientId(decodeURIComponent(match[1]));
  } catch (error) {
    throw error.status ? error : httpError(400, 'Invalid clientId.');
  }

  if (match[2] === '/anticlone' && req.method === 'GET') {
    send(res, 200, Object.assign({ ok: true, clientId: clientId }, antiCloneStatus(clientId)));
    return;
  }
  if (match[2] === '/anticlone/reset' && req.method === 'POST') {
    await enqueue(function() { return requestAntiCloneReset(clientId); });
    console.log('[broker-admin]', caller, 'released anti-clone quarantine of', clientId);
    send(res, 200, { ok: true, clientId: clientId, reset: true });
    return;
  }
  if (match[2]) {
    res.setHeader('Allow', match[2] === '/anticlone' ? 'GET' : 'POST');
    throw httpError(405, 'Method not allowed.');
  }

  if (req.method === 'PUT') {
    const client = parseClient(clientId, await readBody(req));
    const changed = await enqueue(function() {
      return updateRuleFiles(FILES, function(settings) { applyClient(settings, client); });
    });
    console.log('[broker-admin]', caller, 'upserted', clientId, describe(changed));
    send(res, 200, { ok: true, clientId: clientId, fingerprint256: client.fingerprint256, changed: changed });
    return;
  }
  if (req.method === 'DELETE') {
    const changed = await enqueue(function() {
      return updateRuleFiles(REVOKE_ORDER, function(settings) { revokeClient(settings, clientId); });
    });
    console.log('[broker-admin]', caller, 'revoked', clientId, describe(changed));
    // Idempotent: revoking an unknown client succeeds with removed=false.
    send(res, 200, { ok: true, clientId: clientId, removed: changed.length > 0, changed: changed });
    return;
  }
  res.setHeader('Allow', 'PUT, DELETE');
  throw httpError(405, 'Method not allowed.');
}

const server = https.createServer({
  key: fs.readFileSync(path.resolve(BROKER_DIR, process.env.BROKER_ADMIN_KEY || path.join(CERT_DIR, 'server.key'))),
  cert: fs.readFileSync(path.resolve(BROKER_DIR, process.env.BROKER_ADMIN_CERT || path.join(CERT_DIR, 'server.crt'))),
  ca: [CA_PEM],
  requestCert: true,
  rejectUnauthorized: true,
  minVersion: 'TLSv1.2',
}, function(req, res) {
  handle(req, res).catch(function(error) {
    const status = error.status || 500;
    if (status >= 500) {
      console.error('[broker-admin] request failed:', error.message);
    }
    send(res, status, { ok: false, error: status >= 500 ? 'Broker configuration update failed.' : error.message });
  });
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(PORT, HOST, function() {
  console.log('MQTT broker admin API listening on https://' + HOST + ':' + PORT +
    ' (allowed client CN: ' + ALLOWED_CN.join(', ') + ')');
});
