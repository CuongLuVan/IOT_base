require('dotenv').config();

module.exports =  {
  host: process.env.APP_MQTT,
  port: process.env.APP_MQTT_PORT,
  clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
  username: process.env.APP_MQTT_USER,
  useNewUrlParser: true,
  password: process.env.APP_MQTT_PASS,
};