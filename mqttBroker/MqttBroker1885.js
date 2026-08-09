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
    var authorized = userList.some(function(item) {
      return item.username === username && item.password === pwd;
    });
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
  try
  {
      callback(null, client.user);
  }
  catch (ex){
   // console.log(ex);
  }

}

// In this case the client authorized as alice can subscribe to /users/alice taking
// the username from the topic and verifing it is the same of the authorized user
var authorizeSubscribe = function(client, topic, callback) {
  callback(null, client.user == topic.split('/')[1]);
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

