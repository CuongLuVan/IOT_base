var mosca = require('mosca')
var events=require('events');
var fs = require('fs');
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


var authorizePublish = function(client, topic, payload, callback) {
  try {
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
}

// In this case the client authorized as alice can subscribe to /users/alice taking
// the username from the topic and verifing it is the same of the authorized user
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
 // server.authorizePublish = authorizePublish;
}

