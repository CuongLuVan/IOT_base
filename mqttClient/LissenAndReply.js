// Stores every MQTT message from mqttBroker/MqttBroker1885.js in MongoDB.
// The broker requires mutual TLS with an ECDSA P-256 client certificate whose
// fingerprint is registered for MQTT_CLIENT_ID in mqtt_device_certs.json, and
// only allows the topics listed for that clientId in mqtt_acl.json.
require('dotenv').config();
var fs = require('fs');
var path = require('path');
var mqtt = require('mqtt');
var events = require('events');
var mongoose = require('mongoose');
var mongoConfig = require('./app/config/mongoConfig.js');
var SensorData = require('./app/models/SensorData.model');
var emitter = new events.EventEmitter();

var blocks = [
  { status: 'active', memory: [] },
  { status: 'free', memory: [] }
];
var activeBlock = 0;

mongoose.set('useCreateIndex', true);
mongoose.connect(mongoConfig.dbConfig, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).catch(function (err) {
  console.error('MongoDB connection failed:', err);
});
var mqttHost = process.env.MQTT_HOST || 'localhost';
var mqttPort = Number(process.env.MQTT_PORT || 1885);
var clientId = process.env.MQTT_CLIENT_ID || 'iot_data_logger';
var certDir = process.env.MQTT_CERTS || path.resolve(__dirname, '..', 'mqttBroker', 'certs');
// Topic filters allowed for this clientId in mqtt_acl.json ('#' is refused).
var subscribeTopics = (process.env.MQTT_SUBSCRIBE_TOPICS || 'pub_c/+,devices/+/data,iot/power/#,iot/alert/#')
  .split(',').map(function (topic) { return topic.trim(); }).filter(Boolean);

function readCredential(envName, fileName) {
  var file = process.env[envName] || path.join(certDir, fileName);
  if (!fs.existsSync(file)) {
    console.error('MQTT credential not found: ' + file + ' (set ' + envName + ' or MQTT_CERTS)');
    process.exit(1);
  }
  return fs.readFileSync(file);
}

var options = {
  clientId: clientId,
  ca: readCredential('MQTT_CA_CERT', 'ca.crt'),
  cert: readCredential('MQTT_CLIENT_CERT', clientId + '.crt'),
  key: readCredential('MQTT_CLIENT_KEY', clientId + '.key'),
  rejectUnauthorized: true,
  // Only needed when the broker runs without mTLS (mqtt_users.json).
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  clean: true,
  reconnectPeriod: 5000,
  connectTimeout: 10000
};

var client = mqtt.connect('mqtts://' + mqttHost + ':' + mqttPort, options);
client.on('connect', function () {
  console.log('MQTT connected to ' + mqttHost + ':' + mqttPort + ' as ' + clientId);
  client.subscribe(subscribeTopics, { qos: 1 }, function (err, granted) {
    if (err) {
      console.error('MQTT subscribe failed:', err.message);
      return;
    }
    granted.filter(function (grant) { return grant.qos >= 128; }).forEach(function (grant) {
      // SUBACK 0x80: the broker refused this filter.
      console.error('MQTT subscribe rejected for ' + grant.topic + ': not allowed for ' + clientId + ' in mqtt_acl.json');
    });
  });
});

client.on('error', function (err) {
  console.error('MQTT error:', err.message);
  // CONNACK 4/5: retrying with the same credentials only counts as more
  // failures for the broker's brute-force protection.
  if (err.code === 4 || err.code === 5 || err.code === 134 || err.code === 135) {
    console.error('Broker rejected the credentials: check mqtt_device_certs.json for ' + clientId + '. Not retrying.');
    client.end(true);
  }
});


client.on('message', function (topic, message,packet) {
  var payload = message.toString('utf-8');
  var parsedPayload = payload;

  try {
    parsedPayload = JSON.parse(payload);
  } catch (err) {
    // Keep non-JSON MQTT payloads as strings.
  }

  blocks[activeBlock].memory.push({
    topic: topic.toString('utf-8'),
    content: {
      payload: parsedPayload,
      packet: packet
    },
    time: Date.now()
  });
});

function flushBlock(block) {
  if (block.status !== 'flushing' || block.memory.length === 0) {
    block.status = 'free';
    block.memory = [];
    return;
  }

  var batch = block.memory;
  SensorData.insertMany(batch, { ordered: false })
    .then(function () {
      block.memory = [];
      block.status = 'free';
    })
    .catch(function (err) {
      console.error('Could not save MQTT block:', err);
      setTimeout(function () {
        flushBlock(block);
      }, 1000);
    });
}

setInterval(function () {
  var nextBlock = activeBlock === 0 ? 1 : 0;
  var currentBlock = blocks[activeBlock];

  if (blocks[nextBlock].status !== 'free') {
    return;
  }

  currentBlock.status = 'flushing';
  activeBlock = nextBlock;
  blocks[activeBlock].status = 'active';
  flushBlock(currentBlock);
}, 1000);





