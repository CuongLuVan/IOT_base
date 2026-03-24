const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();
var fs = require('fs');
var http = require('http');
var https = require('https');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
//var privateKey  = fs.readFileSync(path.join(__dirname, '../../cer/'+process.env.NODE_HTTPS+'/server.key'), 'utf8');
//var certificate = fs.readFileSync(path.join(__dirname, '../../cer/'+process.env.NODE_HTTPS+'/server.cert'), 'utf8');

//var credentials = {key: privateKey, cert: certificate};
//const morgan = require('morgan');
const cors = require('cors');
//const helmet = require('helmet');
//const compression = require('compression');
//const methodOverride = require('method-override');
//const { TrendingUpTwoTone } = require('@material-ui/icons');
//var i18next = require('i18next');
//var middleware = require('i18next-http-middleware');
var i18n = require("i18n");



i18n.configure({
  locales: [ 'en','vi'],
  directory: path.join(__dirname, '../locales/'),
  // setup some locales - other locales default to en silently
  queryParameter: "lang",
  // sets a custom cookie name to parse locale settings from
  defaultLocale: 'en',
  cookie: 'lang',
});

const app = express();
app.use(cookieParser('MY SECRET'));
app.use(session({
  secret: 'secret',
  saveUninitialized: true,
  resave: true
}));

app.use(i18n.init);
app.set('port', process.env.APP_PORT || 3000);
app.set('host', process.env.APP_HOST || 'localhost');

//https://tecadmin.net/setup-ssl-certificate-with-node-js-in-linux/
/*https.createServer(credentials, app).listen( process.env.APP_PORT || 3000, () => {
    console.log("Listening…")
}); */

//app.use(express.json({limit: '100mb'}));
//app.use(express.urlencoded({limit: '100mb'}));
app.use(cors());
app.options('*', cors()) // include before other routes
//app.use(helmet());
//app.use(compression());
//app.use(methodOverride());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false  }));
//app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, '../../public')));
app.engine('ejs', require('ejs-locals'));
app.set("view engine", "ejs");
app.set('views', path.join(__dirname, '../View'));


module.exports =  app;
