var mqttConfig = require('./config/mqttConfig.js');
var mongoConfig = require('./config/mongoConfig.js');
const App = require('./controllers/app');
var path = require('path');
const mqtt = require('mqtt');
const mongoose = require('mongoose');
var client = mqtt.connect(mqttConfig.host, mqttConfig);
var chat =new App();
//console.log("Successfully connected to the database",mongoConfig);
chat.register();

/*client.on('connect', function(){
  client.subscribe('#', function (err) { 

  });
});*/
client.on('connect', function(){
  client.subscribe('#', function (err) { });
});
client.on('message', chat.onMessageData);

// Connecting to the database
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoConfig.dbConfig, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
    //console.log("Successfully connected to the database");
}).catch(err => {
    //console.log('Could not connect to the database. Exiting now...', err);
});
