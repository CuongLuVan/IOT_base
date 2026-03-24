const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
var path = require('path');
const app = express();
require('dotenv').config();
app.set('port', process.env.APP_PORT || 3000);
app.set('host', process.env.APP_HOST || '103.1.238.175');
app.use(cors());
app.options('*', cors()) // include before other routes
app.use(bodyParser.json({limit: '50mb'}));
app.use(express.static(path.join(__dirname, '../public')));
//app.engine('ejs', require('ejs-locals'));
//app.set("view engine", "ejs");
//app.set('views', path.join(__dirname, '../View'));

module.exports =  app;
