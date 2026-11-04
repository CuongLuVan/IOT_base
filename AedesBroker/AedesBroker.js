// Aedes port of mqttBroker/MqttBroker1885.js: same port, certificates, JSON
// rule files and security features (mTLS + ECDSA P-256, client ID,
// user/password, ACL, brute-force, message authentication, replay protection).
// Run only one of the two brokers at a time; both listen on mqttPort.
// Aedes 1.x is an ES module and needs Node.js >= 20.
var fs = require('fs');
var path = require('path');
var net = require('net');
var tls = require('tls');
var crypto = require('crypto');

var mqttPort = 1885;

// certs/ and the JSON rule files stay in mqttBroker, where web_manager
// (saveCertificateMqtt) writes them. MQTT_BROKER_DIR overrides the folder.
var brokerDir = path.resolve(process.env.MQTT_BROKER_DIR || path.join(__dirname, '..', 'mqttBroker'));

// Toggle TLS/SSL support. Set to true to enable TLS/SSL using the
// certificate files pointed by `tlsOptions` below. When false the
// original (non-TLS) behaviour is preserved.
var enable_TLS_SSL = true; // change to true to enable TLS/SSL
var enableTLSCertificate = true; // set to true to enable mTLS + per-device certs
var enableACL = true; // set to true to enable ACL enforcement
var enableAttack = true; // set to true to enable replay attack protection
// Restrict TLS to ECDSA P-256 certificates (certs/generate_ecdsa_certs.ps1).
// The device EEPROM layout only fits ECDSA P-256 credentials, so RSA client
// certificates are rejected and the handshake uses ECDHE-ECDSA suites.
var enableECDSA = true;
var ecdsaTlsOptions = {
  minVersion: 'TLSv1.2',
  // TLS 1.2 suites supported by ESP32 mbedTLS and ESP8266 BearSSL, plus the
  // TLS 1.3 suites used by Node.js clients such as testMqtt.
  ciphers: [
    'TLS_AES_128_GCM_SHA256',
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-ECDSA-AES128-SHA256'
  ].join(':'),
  honorCipherOrder: true,
  ecdhCurve: 'prime256v1',
  sigalgs: 'ecdsa_secp256r1_sha256'
};

var tlsOptions = {
  keyPath: brokerDir + '/certs/server.key',
  certPath: brokerDir + '/certs/server.crt'
};

// Optional: enable mutual TLS and per-device certificate authentication.
// When `enableTLSCertificate` is true the broker will require and verify
// client certificates against the mapping file `mqtt_device_certs.json`.
var tlsOptionsExtended = {
  caPath: brokerDir + '/certs/ca.crt',
  deviceCertsPath: brokerDir + '/mqtt_device_certs.json'
};

// Node TLS options for tls.createServer(); null serves plain MQTT.
var serverTlsOptions = null;

// Expose either MQTT or MQTTS on the configured port, never both on one port.
if (enable_TLS_SSL) {
  try {
    serverTlsOptions = {
      key: fs.readFileSync(tlsOptions.keyPath),
      cert: fs.readFileSync(tlsOptions.certPath)
    };
    console.log('TLS/SSL enabled for MQTT broker on port ' + mqttPort);
  }
  catch (err) {
    console.error('Failed to load TLS/SSL credentials; refusing to start without TLS:', err);
    throw err;
  }
}

if (enableTLSCertificate) {
  if (!serverTlsOptions) {
    throw new Error('enableTLSCertificate requires enable_TLS_SSL');
  }
  serverTlsOptions.requestCert = true;
  // We will perform custom verification in the authenticate() callback,
  // so avoid automatic rejection by the TLS layer.
  serverTlsOptions.rejectUnauthorized = false;

  // Load CA if present
  try {
    serverTlsOptions.ca = [fs.readFileSync(tlsOptionsExtended.caPath)];
  } catch (ex) {
    console.warn('CA file not found at', tlsOptionsExtended.caPath, '- continuing without CA');
  }
  console.log('mTLS per-device certificate authentication enabled');
}

if (serverTlsOptions && enableECDSA) {
  Object.keys(ecdsaTlsOptions).forEach(function(option) {
    serverTlsOptions[option] = ecdsaTlsOptions[option];
  });
  console.log('TLS restricted to ECDSA P-256 certificates');
}

function isEcdsaP256(certificate) {
  return Boolean(certificate &&
    (certificate.asn1Curve === 'prime256v1' || certificate.nistCurve === 'P-256'));
}

// Refuse to start with a server certificate the devices cannot use.
if (enableECDSA && serverTlsOptions) {
  var serverCertificate = new crypto.X509Certificate(serverTlsOptions.cert);
  var serverKeyDetails = serverCertificate.publicKey.asymmetricKeyDetails || {};
  if (serverCertificate.publicKey.asymmetricKeyType !== 'ec' ||
      serverKeyDetails.namedCurve !== 'prime256v1') {
    throw new Error('enableECDSA requires an ECDSA P-256 server certificate at ' +
      tlsOptions.certPath + ' (run certs/generate_ecdsa_certs.ps1)');
  }
}

// Optional ACL (Access Control List) support

var aclOptions = {
  aclPath: brokerDir + '/mqtt_acl.json'
};

var enableClientID = false; // set to true to enable client ID anti-spoofing
var clientIdOptions = {
  clientIdsPath: brokerDir + '/mqtt_client_ids.json'
};

var enableMessageAuthentication = false; // set to true to enable message authentication
var messageAuthOptions = {
  authPath: brokerDir + '/mqtt_message_auth.json'
};
var usersPath = brokerDir + '/mqtt_users.json';
var defaultMessageAuthConfig = {
  scheme: 'hmac-sha256',
  field: 'signature',
  keyField: 'keyId',
  ignoreTopics: [],
  keys: {}
};

var enableBruteForce = false; // set to true to enable brute-force protection
var bruteForceOptions = {
  bruteForcePath: brokerDir + '/mqtt_bruteforce.json'
};
var defaultBruteForceConfig = {
  windowSeconds: 300,
  maxFailedAttempts: 5,
  blockDurationSeconds: 900,
  ignoreUsers: []
};
var bruteForceState = {}; // clientId/username -> { failures, firstFailureAt, blockedUntil }
var lastBruteForceCleanup = 0;

var replayOptions = {
  replayPath: brokerDir + '/mqtt_replay.json'
};
var defaultReplayConfig = {
  windowSeconds: 60,
  ignoreTopics: [],
  timestampField: 'timestamp',
  nonceField: 'nonce',
  maxSkewSeconds: 300
};
var replayCache = {}; // fingerprint -> timestamp

var aedes = null;

function readJsonFile(path, callback) {
  fs.readFile(path, 'utf8', function(err, raw) {
    if (err) {
      callback(err);
      return;
    }

    var value;
    try {
      value = JSON.parse(raw);
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('JSON root must be an object');
      }
    } catch (parseError) {
      callback(parseError);
      return;
    }
    callback(null, value);
  });
}

// Helper: match MQTT topic patterns with '+' and '#' wildcards
function topicMatches(pattern, topic) {
  if (typeof pattern !== 'string' || !pattern) return false;
  // Escape regex characters except the MQTT wildcards, then replace those.
  // ('+' must not be escaped first, or "a/+" never matches "a/b".)
  var re = pattern.replace(/[[\]{}()*?.\\^$|]/g, function(m) { return '\\' + m; });
  re = re.replace(/\+/g, '[^/]+');
  re = re.replace(/#/g, '.*');
  re = '^' + re + '$';
  try {
    return new RegExp(re).test(topic);
  } catch (e) {
    return false;
  }
}

function getClientIdentity(client, username) {
  return client && client.id ? client.id : (username || 'unknown');
}

function isBruteForceBlocked(client, username) {
  var id = getClientIdentity(client, username);
  var state = bruteForceState[id];
  return state && state.blockedUntil && Date.now() < state.blockedUntil;
}

function pruneBruteForceState(now, config) {
  if (now - lastBruteForceCleanup < 60000) {
    return;
  }
  lastBruteForceCleanup = now;
  Object.keys(bruteForceState).forEach(function(id) {
    var state = bruteForceState[id];
    var isBlocked = state.blockedUntil && now < state.blockedUntil;
    if (!isBlocked && now - state.firstFailureAt > config.windowSeconds * 1000) {
      delete bruteForceState[id];
    }
  });
}

function resetBruteForceState(client, username) {
  var id = getClientIdentity(client, username);
  delete bruteForceState[id];
}

function recordBruteForceFailure(client, username, config) {
  var id = getClientIdentity(client, username);
  if (config.ignoreUsers.indexOf(id) !== -1 || config.ignoreUsers.indexOf(username) !== -1) {
    return;
  }
  var now = Date.now();
  var state = bruteForceState[id] || { failures: 0, firstFailureAt: now, blockedUntil: 0 };
  if (state.blockedUntil && now < state.blockedUntil) {
    bruteForceState[id] = state;
    return;
  }
  if (now - state.firstFailureAt > config.windowSeconds * 1000) {
    state.failures = 1;
    state.firstFailureAt = now;
  } else {
    state.failures += 1;
  }
  if (state.failures >= config.maxFailedAttempts) {
    state.blockedUntil = now + config.blockDurationSeconds * 1000;
    console.warn('Brute-force protection blocking', id, 'until', new Date(state.blockedUntil).toISOString());
  }
  bruteForceState[id] = state;
}

function loadBruteForceConfig(callback) {
  readJsonFile(bruteForceOptions.bruteForcePath, function(err, value) {
    if (err) {
      console.warn('Brute-force config not loaded:', err.message);
      callback(defaultBruteForceConfig);
      return;
    }

    callback({
      windowSeconds: typeof value.windowSeconds === 'number' ? value.windowSeconds : defaultBruteForceConfig.windowSeconds,
      maxFailedAttempts: typeof value.maxFailedAttempts === 'number' ? value.maxFailedAttempts : defaultBruteForceConfig.maxFailedAttempts,
      blockDurationSeconds: typeof value.blockDurationSeconds === 'number' ? value.blockDurationSeconds : defaultBruteForceConfig.blockDurationSeconds,
      ignoreUsers: Array.isArray(value.ignoreUsers) ? value.ignoreUsers : defaultBruteForceConfig.ignoreUsers
    });
  });
}

function verifyDeviceCertificate(client, identity, callback) {
  if (!identity) {
    callback(false);
    return;
  }

  readJsonFile(tlsOptionsExtended.deviceCertsPath, function(err, value) {
    if (err) {
      console.error('Device cert mapping not loaded:', err.message);
      callback(false);
      return;
    }

    var device = Array.isArray(value.devices) && value.devices.find(function(item) {
      return item && item.clientId === identity;
    });
    var expected = device && (device.fingerprint256 || device.fingerprint || device.subjectCN);
    // Aedes exposes the TLS socket as client.conn (Mosca: client.connection.stream).
    var stream = client && client.conn;
    var peer = stream && typeof stream.getPeerCertificate === 'function' ? stream.getPeerCertificate(true) : null;
    var peerFingerprint = peer && (peer.fingerprint256 || peer.fingerprint);
    if (enableECDSA && peer && !isEcdsaP256(peer)) {
      console.warn('mTLS authentication failed for', identity, '- client certificate is not ECDSA P-256');
      callback(false);
      return;
    }
    var authorized = Boolean(peer && typeof expected === 'string' && (
      (typeof peerFingerprint === 'string' && peerFingerprint.toLowerCase() === expected.toLowerCase()) ||
      (peer.subject && peer.subject.CN && expected === peer.subject.CN)
    ));

    if (!authorized) {
      console.warn('mTLS authentication failed for', identity, 'peer fingerprint:', peer && peer.fingerprint256);
    }
    callback(authorized);
  });
}

function verifyUsernamePassword(username, password, callback) {
  readJsonFile(usersPath, function(err, value) {
    if (err) {
      console.error('Error loading mqtt_users.json:', err.message);
      callback(false);
      return;
    }

    var users = Array.isArray(value.users) ? value.users : [];
    callback(users.some(function(item) {
      return item && item.username === username && item.password === password;
    }));
  });
}

function verifyClientIdentity(client, username, password, callback) {
  if (!enableClientID) {
    var identity = client && (client.id || username);
    if (enableTLSCertificate) {
      verifyDeviceCertificate(client, identity, callback);
    } else {
      verifyUsernamePassword(username, password, callback);
    }
    return;
  }

  var clientId = client && client.id;
  readJsonFile(clientIdOptions.clientIdsPath, function(err, value) {
    if (err) {
      console.error('Client ID mapping not loaded:', err.message);
      callback(false);
      return;
    }

    var clientRecord = Array.isArray(value.clients) && value.clients.find(function(item) {
      return item && item.clientId === clientId;
    });
    if (!clientId || !clientRecord) {
      console.warn('Client ID validation failed: unknown clientId', clientId);
      callback(false);
      return;
    }

    if (clientRecord.username && username && clientRecord.username !== username) {
      console.warn('Client ID validation failed: username mismatch for', clientId, 'expected', clientRecord.username, 'got', username);
      callback(false);
      return;
    }

    if (enableTLSCertificate) {
      verifyDeviceCertificate(client, clientId, callback);
    } else {
      verifyUsernamePassword(username, password, callback);
    }
  });
}

// CONNACK return code 5: not authorized.
function authenticationError(message) {
  var error = new Error(message);
  error.returnCode = 5;
  return error;
}

var authenticate = function(client, username, password, callback) {
  var pwd = password ? password.toString() : '';
  var clientIdentity = getClientIdentity(client, username);

  function finishAuthentication(authorized, bruteForceConfig) {
    if (enableBruteForce) {
      if (authorized) {
        resetBruteForceState(client, username);
      } else {
        recordBruteForceFailure(client, username, bruteForceConfig);
      }
    }
    if (!authorized) {
      callback(authenticationError('Authentication failed'), false);
      return;
    }
    // Mosca set client.user; the ACL fallbacks below still read it.
    client.user = username;
    callback(null, true);
  }

  function checkCredentials(bruteForceConfig) {
    if (enableBruteForce) {
      pruneBruteForceState(Date.now(), bruteForceConfig);
    }
    if (enableBruteForce && isBruteForceBlocked(client, username)) {
      console.warn('Authentication denied by brute-force protection for', clientIdentity);
      callback(authenticationError('Blocked by brute-force protection'), false);
      return;
    }
    verifyClientIdentity(client, username, pwd, function(authorized) {
      finishAuthentication(authorized, bruteForceConfig);
    });
  }

  if (enableBruteForce) {
    loadBruteForceConfig(checkCredentials);
  } else {
    checkCredentials(defaultBruteForceConfig);
  }
}


function publishMessage(topicData,payloadData) {
  var packet = {
    cmd: 'publish',
    topic: topicData,
    payload: payloadData,
    qos: 1,
    retain: false,
  };
  aedes.publish(packet, function() {
    //console.log('MQTT broker message sent');
  });
}

function parsePayloadMetadata(payload) {
  var payloadText = typeof payload === 'string' ? payload : (payload ? payload.toString('utf8') : '');
  try {
    return { data: JSON.parse(payloadText), raw: payloadText };
  } catch (e) {
    return { data: null, raw: payloadText };
  }
}

function canonicalizePayloadValue(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalizePayloadValue).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    var keys = Object.keys(value).sort();
    return '{' + keys.map(function(key) {
      return JSON.stringify(key) + ':' + canonicalizePayloadValue(value[key]);
    }).join(',') + '}';
  }
  return JSON.stringify(value);
}

function normalizeSignature(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/^0x/i, '').replace(/^sha256:/i, '').toLowerCase();
}

function verifyMessageAuthentication(client, topic, payload, config) {
  if (config.ignoreTopics.indexOf(topic) !== -1) {
    return true;
  }

  var metadata = parsePayloadMetadata(payload);
  if (!metadata.data || typeof metadata.data !== 'object') {
    return false;
  }

  var body = Object.assign({}, metadata.data);
  var signature = body[config.field];
  if (!signature) {
    return false;
  }

  delete body[config.field];
  if (config.keyField) {
    delete body[config.keyField];
  }

  var secret = null;
  var keyId = config.keyField && metadata.data[config.keyField];
  if (keyId && config.keys[keyId]) {
    secret = config.keys[keyId];
  }
  if (!secret && client && client.id && config.keys[client.id]) {
    secret = config.keys[client.id];
  }
  if (!secret && client && client.user && config.keys[client.user]) {
    secret = config.keys[client.user];
  }

  if (!secret) {
    return false;
  }

  var canonical = canonicalizePayloadValue(body);
  var expected;
  switch (config.scheme.toLowerCase()) {
    case 'hmac-sha256':
      expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
      break;
    default:
      console.warn('Unsupported message authentication scheme', config.scheme);
      return false;
  }

  return normalizeSignature(signature) === expected;
}

function loadMessageAuthConfig(callback) {
  readJsonFile(messageAuthOptions.authPath, function(err, value) {
    if (err) {
      console.error('Message auth config not loaded:', err.message);
      callback(err);
      return;
    }

    callback(null, {
      scheme: typeof value.scheme === 'string' ? value.scheme : defaultMessageAuthConfig.scheme,
      field: typeof value.field === 'string' ? value.field : defaultMessageAuthConfig.field,
      keyField: typeof value.keyField === 'string' ? value.keyField : defaultMessageAuthConfig.keyField,
      ignoreTopics: Array.isArray(value.ignoreTopics) ? value.ignoreTopics : defaultMessageAuthConfig.ignoreTopics,
      keys: value.keys && typeof value.keys === 'object' && !Array.isArray(value.keys) ? value.keys : defaultMessageAuthConfig.keys
    });
  });
}

function loadReplayConfig(callback) {
  readJsonFile(replayOptions.replayPath, function(err, value) {
    if (err) {
      console.warn('Replay config not loaded:', err.message);
      callback(defaultReplayConfig);
      return;
    }

    callback({
      windowSeconds: typeof value.windowSeconds === 'number' ? value.windowSeconds : defaultReplayConfig.windowSeconds,
      ignoreTopics: Array.isArray(value.ignoreTopics) ? value.ignoreTopics : defaultReplayConfig.ignoreTopics,
      timestampField: typeof value.timestampField === 'string' ? value.timestampField : defaultReplayConfig.timestampField,
      nonceField: typeof value.nonceField === 'string' ? value.nonceField : defaultReplayConfig.nonceField,
      maxSkewSeconds: typeof value.maxSkewSeconds === 'number' ? value.maxSkewSeconds : defaultReplayConfig.maxSkewSeconds
    });
  });
}

function getAclEntry(value, identity) {
  var entry = null;
  if (!Array.isArray(value.rules)) {
    return entry;
  }

  value.rules.forEach(function(rule) {
    if (rule && (rule.clientId === identity || rule.username === identity)) {
      entry = {
        publish: Array.isArray(rule.publish) ? rule.publish : [],
        subscribe: Array.isArray(rule.subscribe) ? rule.subscribe : []
      };
    }
  });
  return entry;
}

// callback(allowed)
function authorizeTopic(client, topic, action, callback) {
  if (!client) {
    callback(false);
    return;
  }
  if (!enableACL) {
    callback(Boolean(action === 'publish' ? client.user : client.user == topic.split('/')[1]));
    return;
  }

  readJsonFile(aclOptions.aclPath, function(err, value) {
    if (err) {
      console.error('ACL file not loaded:', err.message);
      callback(false);
      return;
    }

    var identity = client.id || client.user;
    var entry = identity && getAclEntry(value, identity);
    var patterns = entry && entry[action];
    var allowed = Array.isArray(patterns) && patterns.some(function(pattern) {
      return topicMatches(pattern, topic);
    });
    callback(allowed);
  });
}

var lastReplayCacheCleanup = 0;
function pruneReplayCache(now, windowSeconds) {
  if (now - lastReplayCacheCleanup < 60000) {
    return;
  }
  lastReplayCacheCleanup = now;
  Object.keys(replayCache).forEach(function(fingerprint) {
    if (now - replayCache[fingerprint] >= windowSeconds * 1000) {
      delete replayCache[fingerprint];
    }
  });
}

function verifyReplayProtection(client, topic, payload, config) {
  var id = client.id || client.user || 'unknown';
  var metadata = parsePayloadMetadata(payload);
  var now = Date.now();
  var fingerprint;

  if (metadata.data && typeof metadata.data === 'object') {
    var timestamp = metadata.data[config.timestampField];
    var nonce = metadata.data[config.nonceField];

    if (timestamp == null || nonce == null) {
      console.warn('Replay attack payload missing timestamp or nonce for', id, 'topic', topic);
      return false;
    }

    var messageTime = Number(timestamp);
    if (Number.isNaN(messageTime)) {
      var parsed = Date.parse(timestamp);
      if (!Number.isNaN(parsed)) {
        messageTime = parsed;
      }
    }

    if (Number.isNaN(messageTime)) {
      console.warn('Replay attack invalid timestamp for', id, 'topic', topic, 'value:', timestamp);
      return false;
    }

    if (Math.abs(now - messageTime) > config.maxSkewSeconds * 1000) {
      console.warn('Replay attack timestamp out of skew for', id, 'topic', topic, 'timestamp:', timestamp);
      return false;
    }

    fingerprint = id + '|' + topic + '|' + nonce;
  } else {
    fingerprint = id + '|' + topic + '|' + crypto.createHash('sha256').update(metadata.raw).digest('hex');
  }

  pruneReplayCache(now, config.windowSeconds);
  if (replayCache[fingerprint] && now - replayCache[fingerprint] < config.windowSeconds * 1000) {
    console.warn('Replay attack blocked for', id, 'topic', topic);
    return false;
  }
  if (config.ignoreTopics.indexOf(topic) === -1) {
    replayCache[fingerprint] = now;
  }
  return true;
}

// Aedes: callback(error) rejects the publish and closes the client
// connection (MQTT-3.3.5-2); callback(null) accepts it.
var authorizePublish = function(client, packet, callback) {
  var topic = packet && packet.topic;
  var payload = packet && packet.payload;

  function deny(reason) {
    callback(new Error(reason));
  }

  function authorizeAcl() {
    authorizeTopic(client, topic, 'publish', function(allowed) {
      if (allowed) {
        callback(null);
      } else {
        deny('Publish not authorized on ' + topic);
      }
    });
  }

  function authorizeReplay() {
    if (!enableAttack || !client || !topic) {
      authorizeAcl();
      return;
    }
    loadReplayConfig(function(config) {
      if (!verifyReplayProtection(client, topic, payload, config)) {
        deny('Replay protection rejected publish on ' + topic);
        return;
      }
      authorizeAcl();
    });
  }

  // Same guard as Aedes' default authorizePublish.
  if (typeof topic === 'string' && topic.startsWith('$SYS/')) {
    deny('$SYS/ topic is reserved');
    return;
  }

  if (!enableMessageAuthentication || !client || !topic) {
    authorizeReplay();
    return;
  }

  loadMessageAuthConfig(function(err, config) {
    if (err) {
      deny('Message authentication config not loaded');
      return;
    }
    try {
      if (!verifyMessageAuthentication(client, topic, payload, config)) {
        console.warn('Message authentication failed for', client.id || client.user, 'topic', topic);
        deny('Message authentication failed on ' + topic);
        return;
      }
      authorizeReplay();
    } catch (ex) {
      console.error('Message authentication error:', ex);
      deny('Message authentication error');
    }
  });
};

// Aedes: callback(null, null) refuses the subscription (SUBACK 0x80) without
// closing the connection, like Mosca.
var authorizeSubscribe = function(client, subscription, callback) {
  authorizeTopic(client, subscription.topic, 'subscribe', function(allowed) {
    callback(null, allowed ? subscription : null);
  });
};


async function startBroker() {
  var { Aedes } = await import('aedes');
  aedes = await Aedes.createBroker({
    // Device client IDs (mqtt_id) are up to 40 characters.
    maxClientsIdLength: 64
  });
  aedes.authenticate = authenticate;
  aedes.authorizePublish = authorizePublish;
  aedes.authorizeSubscribe = authorizeSubscribe;

  aedes.on('client', function(client) {
     // console.log('client connected');
  });

  // fired when a message is received
  aedes.on('publish', function(packet, client) {
    try{
     // var stringBuf = packet.payload.toString('utf-8');
     // console.log(stringBuf);

    }
    catch (ex){
    //  console.log(ex);
    }
  });

  aedes.on('clientError', function(client, error) {
     // console.log('client error', client && client.id, error.message);
  });

  aedes.on('connectionError', function(client, error) {
     // console.log('connection error', client && client.id, error.message);
  });

  var server = serverTlsOptions ?
    tls.createServer(serverTlsOptions, aedes.handle) :
    net.createServer(aedes.handle);
  // Failed handshakes (plain MQTT on the TLS port, RSA certificates, ...).
  server.on('tlsClientError', function(error) {
     // console.log('TLS client error', error.message);
  });
  server.on('error', function(error) {
    console.error('MQTT server error:', error);
  });
  server.listen(mqttPort, function() {
    console.log('Aedes MQTT broker listening on port ' + mqttPort + (serverTlsOptions ? ' (mqtts)' : ' (mqtt)'));
  });
  return server;
}

startBroker().catch(function(error) {
  console.error('Failed to start Aedes broker:', error);
  process.exit(1);
});

module.exports = { publishMessage: publishMessage };
