require('dotenv').config();

module.exports =  {
  host: process.env.APP_MONGO,
  port: process.env.APP_MONGO_PORT, 
  clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
  username: process.env.APP_MONGO_USER,
  useNewUrlParser: true,
  password: process.env.APP_MONGO_PASS,
  dbConfig:(process.env.APP_MONGO+":"+ process.env.APP_MONGO_PORT+"/"+ process.env.APP_MONGO_TABLE)
};