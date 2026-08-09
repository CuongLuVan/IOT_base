var mosca = require('mosca')
var events=require('events');
var fs = require('fs');
var crypto = require('crypto');
const parseJson = require('parse-json');
emitter=new events.EventEmitter();

var settings = {
  port: 1885
};

// Toggle TLS/SSL support. Set to true to enable TLS/SSL using the
// certificate files pointed by `tlsOptions` below. When false the
// original (non-TLS) behaviour is preserved.
var enable_TLS_SSL = false; // change to true to enable TLS/SSL
var enableTLSCertificate = false; // set to true to enable mTLS + per-device certs
var enableACL = false; // set to true to enable ACL enforcement
var enableAttack = false; // set to true to enable replay attack protection

var tlsOptions = {
  keyPath: __dirname + '/certs/server.key',
  certPath: __dirname + '/certs/server.crt'
};

// If TLS/SSL is enabled, try to attach key/cert to the mosca settings.
// If reading the files fails we log the error and continue with plain TCP.
if (enable_TLS_SSL) {
  try {
    var key = fs.readFileSync(tlsOptions.keyPath);
    var cert = fs.readFileSync(tlsOptions.certPath);
    settings.secure = {
      port: settings.port,
      key: key,
      cert: cert
    };
    console.log('TLS/SSL enabled for MQTT broker on port ' + settings.port);
  }
  catch (err) {
    console.error('Failed to enable TLS/SSL - falling back to non-TLS:', err);
  }
}

// Optional: enable mutual TLS and per-device certificate authentication.
// When `enableTLSCertificate` is true the broker will require and verify
// client certificates against the mapping file `mqtt_device_certs.json`.
var tlsOptionsExtended = {
  caPath: __dirname + '/certs/ca.crt',
  deviceCertsPath: __dirname + '/mqtt_device_certs.json'
};

var deviceCertMap = {}; // clientId or username -> expected fingerprint (fingerprint256 preferred)
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
      var ca = fs.readFileSync(tlsOptionsExtended.caPath);
      settings.secure.ca = ca;
    } catch (ex) {
      console.warn('CA file not found at', tlsOptionsExtended.caPath, '- continuing without CA');
    }

    // Load device cert mapping
    try {
      var rawDevices = fs.readFileSync(tlsOptionsExtended.deviceCertsPath, 'utf8');
      var devObj = JSON.parse(rawDevices);
      if (Array.isArray(devObj.devices)) {
        devObj.devices.forEach(function(d) {
          if (d.clientId && (d.fingerprint256 || d.fingerprint || d.subjectCN)) {
            deviceCertMap[d.clientId] = d.fingerprint256 || d.fingerprint || d.subjectCN;
          }
        });
      }
    } catch (ex) {
      console.warn('Device cert mapping not loaded:', ex.message);
    }

    console.log('mTLS per-device certificate authentication enabled');
  } catch (err) {
    console.error('Failed to configure mTLS:', err);
  }
}

// Optional ACL (Access Control List) support

var aclOptions = {
  aclPath: __dirname + '/mqtt_acl.json'
};
var aclMap = {}; // clientId or username -> { publish: [...], subscribe: [...] }

var enableClientID = false; // set to true to enable client ID anti-spoofing
var clientIdOptions = {
  clientIdsPath: __dirname + '/mqtt_client_ids.json'
};
var clientIdMap = {}; // clientId -> { username: ..., label: ... }

var enableMessageAuthentication = false; // set to true to enable message authentication
var messageAuthOptions = {
  authPath: __dirname + '/mqtt_message_auth.json'
};
var messageAuthConfig = {
  scheme: 'hmac-sha256',
  field: 'signature',
  keyField: 'keyId',
  ignoreTopics: [],
  keys: {}
};

var replayOptions = {
  replayPath: __dirname + '/mqtt_replay.json'
};
var replayConfig = {
  windowSeconds: 60,
  ignoreTopics: [],
  timestampField: 'timestamp',
  nonceField: 'nonce',
  maxSkewSeconds: 300
};
var replayCache = {}; // fingerprint -> timestamp

if (enableAttack) {
  try {
    var rawReplay = fs.readFileSync(replayOptions.replayPath, 'utf8');
    var replayObj = JSON.parse(rawReplay);
    if (typeof replayObj.windowSeconds === 'number') {
      replayConfig.windowSeconds = replayObj.windowSeconds;
    }
    if (Array.isArray(replayObj.ignoreTopics)) {
      replayConfig.ignoreTopics = replayObj.ignoreTopics;
    }
    if (typeof replayObj.timestampField === 'string') {
      replayConfig.timestampField = replayObj.timestampField;
    }
    if (typeof replayObj.nonceField === 'string') {
      replayConfig.nonceField = replayObj.nonceField;
    }
    if (typeof replayObj.maxSkewSeconds === 'number') {
      replayConfig.maxSkewSeconds = replayObj.maxSkewSeconds;
    }
    console.log('Replay attack protection enabled, windowSeconds=', replayConfig.windowSeconds, 'timestampField=', replayConfig.timestampField, 'nonceField=', replayConfig.nonceField);
  } catch (ex) {
    console.warn('Replay config not loaded:', ex.message);
  }
}

if (enableMessageAuthentication) {
  try {
    var rawAuth = fs.readFileSync(messageAuthOptions.authPath, 'utf8');
    var authObj = JSON.parse(rawAuth);
    if (typeof authObj.scheme === 'string') {
      messageAuthConfig.scheme = authObj.scheme;
    }
    if (typeof authObj.field === 'string') {
      messageAuthConfig.field = authObj.field;
    }
    if (typeof authObj.keyField === 'string') {
      messageAuthConfig.keyField = authObj.keyField;
    }
    if (Array.isArray(authObj.ignoreTopics)) {
      messageAuthConfig.ignoreTopics = authObj.ignoreTopics;
    }
    if (authObj.keys && typeof authObj.keys === 'object') {
      messageAuthConfig.keys = authObj.keys;
    }
    console.log('Message authentication enabled, scheme=', messageAuthConfig.scheme, 'field=', messageAuthConfig.field, 'keyField=', messageAuthConfig.keyField);
  } catch (ex) {
    console.warn('Message auth config not loaded:', ex.message);
  }
}

if (enableACL) {
  try {
    var rawAcl = fs.readFileSync(aclOptions.aclPath, 'utf8');
    var aclObj = JSON.parse(rawAcl);
    if (Array.isArray(aclObj.rules)) {
      aclObj.rules.forEach(function(r) {
        if (r.clientId) {
          aclMap[r.clientId] = {
            publish: Array.isArray(r.publish) ? r.publish : [],
            subscribe: Array.isArray(r.subscribe) ? r.subscribe : []
          };
        }
        if (r.username) {
          aclMap[r.username] = {
            publish: Array.isArray(r.publish) ? r.publish : [],
            subscribe: Array.isArray(r.subscribe) ? r.subscribe : []
          };
        }
      });
    }
    console.log('ACL loaded, entries:', Object.keys(aclMap).length);
  } catch (ex) {
    console.warn('ACL file not loaded:', ex.message);
  }
}

if (enableClientID) {
  try {
    var rawClientIds = fs.readFileSync(clientIdOptions.clientIdsPath, 'utf8');
    var clientIdObj = JSON.parse(rawClientIds);
    if (Array.isArray(clientIdObj.clients)) {
      clientIdObj.clients.forEach(function(item) {
        if (item.clientId) {
          clientIdMap[item.clientId] = {
            username: item.username || null,
            label: item.label || null
          };
        }
      });
    }
    console.log('Client ID anti-spoofing enabled, client entries:', Object.keys(clientIdMap).length);
  } catch (ex) {
    console.warn('Client ID mapping not loaded:', ex.message);
  }
}

// Helper: match MQTT topic patterns with '+' and '#' wildcards
function topicMatches(pattern, topic) {
  if (!pattern) return false;
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

// Load user credentials from JSON file
var userList = [];
try {
  var raw = fs.readFileSync(__dirname + '/mqtt_users.json', 'utf8');
  var obj = JSON.parse(raw);
  userList = Array.isArray(obj.users) ? obj.users : [];
} catch (err) {
  console.error('Error loading mqtt_users.json:', err);
}

var server = new mosca.Server(settings);
server.on('ready', setup);

// thêm funtion check user


var authenticate = function(client, username, password, callback) {
  try {
    var pwd = password ? password.toString() : '';
    var authorized = false;

    if (enableClientID) {
      var clientId = client && client.id;
      if (!clientId || !clientIdMap[clientId]) {
        console.warn('Client ID validation failed: unknown clientId', client && client.id);
      } else {
        var expectedUsername = clientIdMap[clientId].username;
        if (expectedUsername && username && expectedUsername !== username) {
          console.warn('Client ID validation failed: username mismatch for', clientId, 'expected', expectedUsername, 'got', username);
        } else {
          // When client ID validation passes we can still verify certificate or username/password.
          if (enableTLSCertificate) {
            var stream = client && client.connection && client.connection.stream;
            var peer = stream && typeof stream.getPeerCertificate === 'function' ? stream.getPeerCertificate(true) : null;
            var peerFP = peer && (peer.fingerprint256 || peer.fingerprint);
            var expected = clientId ? deviceCertMap[clientId] : null;

            if (peer && expected) {
              if (peerFP && expected && peerFP.toLowerCase() === expected.toLowerCase()) {
                authorized = true;
              } else if (peer.subject && peer.subject.CN && expected === peer.subject.CN) {
                authorized = true;
              }
            }

            if (!authorized) {
              console.warn('mTLS authentication failed for', clientId, 'peer fingerprint:', peer && peer.fingerprint256);
            }
          } else {
            authorized = userList.some(function(item) {
              return item.username === username && item.password === pwd;
            });
          }
        }
      }
    } else if (enableTLSCertificate) {
      // Perform mTLS per-device certificate verification only.
      var id = client && (client.id || username);
      var stream = client && client.connection && client.connection.stream;
      var peer = stream && typeof stream.getPeerCertificate === 'function' ? stream.getPeerCertificate(true) : null;
      var peerFP = peer && (peer.fingerprint256 || peer.fingerprint);
      var expected = id ? deviceCertMap[id] : null;

      if (peer && expected) {
        if (peerFP && expected && peerFP.toLowerCase() === expected.toLowerCase()) {
          authorized = true;
        } else if (peer.subject && peer.subject.CN && expected === peer.subject.CN) {
          authorized = true;
        }
      }

      if (!authorized) {
        console.warn('mTLS authentication failed for', id, 'peer fingerprint:', peer && peer.fingerprint256);
      }
    } else {
      // Default username/password authentication
      authorized = userList.some(function(item) {
        return item.username === username && item.password === pwd;
      });
    }

    callback(null, authorized);
  } catch (ex) {
    console.error('authenticate error:', ex);
    callback(null, false);
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

function verifyMessageAuthentication(client, topic, payload) {
  if (!enableMessageAuthentication) {
    return true;
  }

  if (messageAuthConfig.ignoreTopics.indexOf(topic) !== -1) {
    return true;
  }

  var metadata = parsePayloadMetadata(payload);
  if (!metadata.data || typeof metadata.data !== 'object') {
    return false;
  }

  var body = Object.assign({}, metadata.data);
  var signature = body[messageAuthConfig.field];
  if (!signature) {
    return false;
  }

  delete body[messageAuthConfig.field];
  if (messageAuthConfig.keyField) {
    delete body[messageAuthConfig.keyField];
  }

  var secret = null;
  var keyId = messageAuthConfig.keyField && metadata.data[messageAuthConfig.keyField];
  if (keyId && messageAuthConfig.keys[keyId]) {
    secret = messageAuthConfig.keys[keyId];
  }
  if (!secret && client && client.id && messageAuthConfig.keys[client.id]) {
    secret = messageAuthConfig.keys[client.id];
  }
  if (!secret && client && client.user && messageAuthConfig.keys[client.user]) {
    secret = messageAuthConfig.keys[client.user];
  }

  if (!secret) {
    return false;
  }

  var canonical = canonicalizePayloadValue(body);
  var expected;
  switch (messageAuthConfig.scheme.toLowerCase()) {
    case 'hmac-sha256':
      expected = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
      break;
    default:
      console.warn('Unsupported message authentication scheme', messageAuthConfig.scheme);
      return false;
  }

  return normalizeSignature(signature) === expected;
}

var authorizePublish = function(client, topic, payload, callback) {
  try {
    if (enableMessageAuthentication && client && topic) {
      if (!verifyMessageAuthentication(client, topic, payload)) {
        console.warn('Message authentication failed for', client && client.id || client && client.user, 'topic', topic);
        callback(null, false);
        return;
      }
    }

    if (enableAttack && client && topic) {
      var id = client.id || client.user || 'unknown';
      var metadata = parsePayloadMetadata(payload);
      var now = Date.now();
      var fingerprint;

      if (metadata.data && typeof metadata.data === 'object') {
        var timestamp = metadata.data[replayConfig.timestampField];
        var nonce = metadata.data[replayConfig.nonceField];

        if (timestamp == null || nonce == null) {
          console.warn('Replay attack payload missing timestamp or nonce for', id, 'topic', topic);
          callback(null, false);
          return;
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
          callback(null, false);
          return;
        }

        if (Math.abs(now - messageTime) > replayConfig.maxSkewSeconds * 1000) {
          console.warn('Replay attack timestamp out of skew for', id, 'topic', topic, 'timestamp:', timestamp);
          callback(null, false);
          return;
        }

        fingerprint = id + '|' + topic + '|' + nonce;
      } else {
        var payloadText = metadata.raw;
        fingerprint = id + '|' + topic + '|' + crypto.createHash('sha256').update(payloadText).digest('hex');
      }

      if (replayCache[fingerprint] && now - replayCache[fingerprint] < replayConfig.windowSeconds * 1000) {
        console.warn('Replay attack blocked for', id, 'topic', topic);
        callback(null, false);
        return;
      }
      if (replayConfig.ignoreTopics.indexOf(topic) === -1) {
        replayCache[fingerprint] = now;
      }
    }

    if (enableACL) {
      var id = client && (client.id || client.user);
      var aclEntry = id && aclMap[id];
      var allowed = false;
      if (aclEntry && Array.isArray(aclEntry.publish)) {
        for (var i = 0; i < aclEntry.publish.length; i++) {
          if (topicMatches(aclEntry.publish[i], topic)) {
            allowed = true;
            break;
          }
        }
      }
      callback(null, allowed);
    } else {
      callback(null, client.user);
    }
  } catch (ex) {
    // console.log(ex);
    callback(null, false);
  }
};
var authorizeSubscribe = function(client, topic, callback) {
  try {
    if (enableACL) {
      var id = client && (client.id || client.user);
      var aclEntry = id && aclMap[id];
      var allowed = false;
      if (aclEntry && Array.isArray(aclEntry.subscribe)) {
        for (var i = 0; i < aclEntry.subscribe.length; i++) {
          if (topicMatches(aclEntry.subscribe[i], topic)) {
            allowed = true;
            break;
          }
        }
      }
      callback(null, allowed);
    } else {
      callback(null, client.user == topic.split('/')[1]);
    }
  } catch (ex) {
    callback(null, false);
  }
}


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

