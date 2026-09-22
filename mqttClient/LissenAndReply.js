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
var options = {
  port: 1884,
  clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
  username: 'sparc',
  useNewUrlParser: true,
  password: 'auto'
};
  //console.log("Helllo");
var client = mqtt.connect('http://mqtt.link.vn/', options);
client.on('connect', function () {
	//console.log("Helllo connect");
  client.subscribe('#', function (err) {
    if (!err) {
      //console.log("allll");
    }
	else
	{
		//console.log(err);
	}
  })
})


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





