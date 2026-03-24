var mqtt = require('mqtt')
var mysql = require('mysql');
var events=require('events');
const parseJson = require('parse-json');
emitter=new events.EventEmitter();
//var MongoClient = require('mongodb').MongoClient;
//var url = "mongodb://localhost:27017/mqtt";
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
  // message is Buffer
  var myobj3 = {
				  time: new Date().getTime(),
				  Topic:topic.toString('utf-8'),
				  Packet:packet.toString('utf-8'),
				  User:message.toString('utf-8')
				};
				//console.log("allll................")
				//console.log(myobj3);
   			
});





