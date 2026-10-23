var mosca = require('mosca')
var events=require('events');
var fs = require('fs');
var crypto = require('crypto');
// Mosca 2.8.3 validates its options by passing a schema ID ("/Options") to
// jsonschema. jsonschema 1.5+ requires the schema object instead, which makes
// the broker exit before it can start. Resolve registered IDs for Mosca while
// preserving the validator's normal behaviour for schema objects/booleans.
var JsonSchemaValidator = require('jsonschema').Validator;
var jsonSchemaValidate = JsonSchemaValidator.prototype.validate;
JsonSchemaValidator.prototype.validate = function(instance, schema, options, ctx) {
  if (typeof schema === 'string') {
    schema = this.getSchema(schema);
  }
  return jsonSchemaValidate.call(this, instance, schema, options, ctx);
};
//const parseJson = require('parse-json');
emitter=new events.EventEmitter();

var mqttPort = 1885;
var settings = {};

// Toggle TLS/SSL support. Set to true to enable TLS/SSL using the
// certificate files pointed by `tlsOptions` below. When false the
// original (non-TLS) behaviour is preserved.
var enable_TLS_SSL = true; // change to true to enable TLS/SSL
var enableTLSCertificate = true; // set to true to enable mTLS + per-device certs
var enableACL = true; // set to true to enable ACL enforcement
var enableAttack = true; // set to true to enable replay attack protection

var tlsOptions = {
  keyPath: __dirname + '/certs/server.key',
  certPath: __dirname + '/certs/server.crt'
};

// Expose either MQTT or MQTTS on the configured port, never both on one port.
if (enable_TLS_SSL) {
  try {
    // Mosca 2.x loads TLS material from file paths itself.  Supplying
    // `key`/`cert` Buffers here leaves its internal credentials schema
    // without the required keyPath/certPath fields.
    fs.accessSync(tlsOptions.keyPath, fs.constants.R_OK);
    fs.accessSync(tlsOptions.certPath, fs.constants.R_OK);
    settings.secure = {
      port: mqttPort,
      keyPath: tlsOptions.keyPath,
      certPath: tlsOptions.certPath
    };
    console.log('TLS/SSL enabled for MQTT broker on port ' + mqttPort);
  }
  catch (err) {
    console.error('Failed to load TLS/SSL credentials; refusing to start without TLS:', err);
    throw err;
  }
} else {
  settings.port = mqttPort;
}

// Optional: enable mutual TLS and per-device certificate authentication.
// When `enableTLSCertificate` is true the broker will require and verify
// client certificates against the mapping file `mqtt_device_certs.json`.
var tlsOptionsExtended = {
  caPath: __dirname + '/certs/ca.crt',
  deviceCertsPath: __dirname + '/mqtt_device_certs.json'
};

if (enableTLSCertificate) {
  try {
    // Ensure secure settings exist (created above when enable_TLS_SSL true)
    settings.secure = settings.secure || {};
    settings.secure.requestCert = true;
    // We will perform custom verification in the authenticate() callback,
    // so avoid automatic rejection by the TLS layer.
    settings.secure.rejectUnauthorized = false;

    // Load CA if present
    try {
      fs.accessSync(tlsOptionsExtended.caPath, fs.constants.R_OK);
      // Mosca expects CA certificate file paths, then reads them while
      // creating the TLS server.
      settings.secure.caPaths = [tlsOptionsExtended.caPath];
    } catch (ex) {
      console.warn('CA file not found at', tlsOptionsExtended.caPath, '- continuing without CA');
    }

    console.log('mTLS per-device certificate authentication enabled');
  } catch (err) {
    console.error('Failed to configure mTLS:', err);
  }
}

// Mosca's legacy `secure` option drops TLS fields when it builds `credentials`.
// Pass the complete TLS options explicitly so the mqtts server requests client certificates.
if (settings.secure) {
  settings.credentials = {
    keyPath: settings.secure.keyPath,
    certPath: settings.secure.certPath
  };
  ['caPaths', 'requestCert', 'rejectUnauthorized', 'secureProtocol'].forEach(function(option) {
    if (Object.prototype.hasOwnProperty.call(settings.secure, option)) {
      settings.credentials[option] = settings.secure[option];
    }
  });
}

// Optional ACL (Access Control List) support

var aclOptions = {
  aclPath: __dirname + '/mqtt_acl.json'
};

var enableClientID = false; // set to true to enable client ID anti-spoofing
var clientIdOptions = {
  clientIdsPath: __dirname + '/mqtt_client_ids.json'
};

var enableMessageAuthentication = false; // set to true to enable message authentication
var messageAuthOptions = {
  authPath: __dirname + '/mqtt_message_auth.json'
};
var usersPath = __dirname + '/mqtt_users.json';
var defaultMessageAuthConfig = {
  scheme: 'hmac-sha256',
  field: 'signature',
  keyField: 'keyId',
  ignoreTopics: [],
  keys: {}
};

var enableBruteForce = false; // set to true to enable brute-force protection
var bruteForceOptions = {
  bruteForcePath: __dirname + '/mqtt_bruteforce.json'
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
  replayPath: __dirname + '/mqtt_replay.json'
};
var defaultReplayConfig = {
  windowSeconds: 60,
  ignoreTopics: [],
  timestampField: 'timestamp',
  nonceField: 'nonce',
  maxSkewSeconds: 300
};
var replayCache = {}; // fingerprint -> timestamp

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
  // Escape regex, then replace MQTT wildcards
  var re = pattern.replace(/[[\]{}()+?.\\^$|]/g, function(m) { return '\\' + m; });
  re = re.replace(/\+/g, '[^/]+');
  re = re.replace(/#/g, '.*');
  re = '^' + re + '$';
  try {
    return new RegExp(re).test(topic);
  } catch (e) {
    return false;
  }
}

var server = new mosca.Server(settings);
server.on('ready', setup);

// thêm funtion check user


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
    var stream = client && client.connection && client.connection.stream;
    var peer = stream && typeof stream.getPeerCertificate === 'function' ? stream.getPeerCertificate(true) : null;
    var peerFingerprint = peer && (peer.fingerprint256 || peer.fingerprint);
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
    callback(null, authorized);
  }

  function checkCredentials(bruteForceConfig) {
    if (enableBruteForce) {
      pruneBruteForceState(Date.now(), bruteForceConfig);
    }
    if (enableBruteForce && isBruteForceBlocked(client, username)) {
      console.warn('Authentication denied by brute-force protection for', clientIdentity);
      callback(null, false);
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
    topic: topicData,
    payload: payloadData,
    qos: 1,
    retain: false,
  };
  server.publish(packet, function() {
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

function authorizeTopic(client, topic, action, callback) {
  if (!enableACL) {
    callback(null, action === 'publish' ? client.user : client.user == topic.split('/')[1]);
    return;
  }

  readJsonFile(aclOptions.aclPath, function(err, value) {
    if (err) {
      console.error('ACL file not loaded:', err.message);
      callback(null, false);
      return;
    }

    var identity = client && (client.id || client.user);
    var entry = identity && getAclEntry(value, identity);
    var patterns = entry && entry[action];
    var allowed = Array.isArray(patterns) && patterns.some(function(pattern) {
      return topicMatches(pattern, topic);
    });
    callback(null, allowed);
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

var authorizePublish = function(client, topic, payload, callback) {
  function authorizeReplay() {
    if (!enableAttack || !client || !topic) {
      authorizeTopic(client, topic, 'publish', callback);
      return;
    }
    loadReplayConfig(function(config) {
      if (!verifyReplayProtection(client, topic, payload, config)) {
        callback(null, false);
        return;
      }
      authorizeTopic(client, topic, 'publish', callback);
    });
  }

  if (!enableMessageAuthentication || !client || !topic) {
    authorizeReplay();
    return;
  }

  loadMessageAuthConfig(function(err, config) {
    if (err) {
      callback(null, false);
      return;
    }
    try {
      if (!verifyMessageAuthentication(client, topic, payload, config)) {
        console.warn('Message authentication failed for', client.id || client.user, 'topic', topic);
        callback(null, false);
        return;
      }
      authorizeReplay();
    } catch (ex) {
      console.error('Message authentication error:', ex);
      callback(null, false);
    }
  });
};

var authorizeSubscribe = function(client, topic, callback) {
  authorizeTopic(client, topic, 'subscribe', callback);
};


server.on('clientConnected', function(client) {
   // console.log('client connected');
});

// fired when a message is received
server.on('published', function(packet, client) {
  try{
   // var stringBuf = packet.payload.toString('utf-8');
   // console.log(stringBuf);
   
  }
  catch (ex){
  //  console.log(ex);
  }
});


emitter.on('error', function(error) {
   // console.log('client connected', error);
});

// fired when the mqtt server is ready
function setup() {
 // console.log('Mosca server is up and running');
   server.authenticate = authenticate;
   server.authorizePublish = authorizePublish;
   server.authorizeSubscribe = authorizeSubscribe;
}
