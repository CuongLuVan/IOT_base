
const app = require('./config/express.js');
const routes = require('./routes/index.js');
var mongoConfig = require('./app/config/mongoConfig.js');
const mongoose = require('mongoose');
const aedes = require('aedes')();
const ws = require('websocket-stream');
const mqtt = require('./mqtt');

// Connecting to the database
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoConfig.dbConfig, {useNewUrlParser: true, useUnifiedTopology: true}).then(() => {
    console.log("Successfully connected to the database");
}).catch(err => {
    console.log('Could not connect to the database. Exiting now...', err);
});

app.use('/api', routes);
app.get('/u', (req, res) => {
  res.send(JSON.stringify({sample:false}));
});





const httpServer = require('http').createServer(app);
ws.createServer({ server: httpServer }, aedes.handle);
httpServer.listen(app.get('port'), function () {
  console.log('server listening on port ', app.get('port'));
})