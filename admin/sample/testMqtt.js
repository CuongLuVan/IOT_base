var mqtt = require('mqtt')
var option={
	port:1885,
	clientId : 'message_' + Math.random().toString(16).substr(2, 8),
	username : "test",
	useNewUrlParser: true,
	password: 'testadmin'
};
var client  = mqtt.connect('mqtt://mqtt.airsense.vn',option)

client.on('connect', function () {
  client.subscribe('presence', function (err) {
    if (!err) {
      client.publish('presence', 'Hello mqtt')
    }
  })
})

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
  client.end()
})