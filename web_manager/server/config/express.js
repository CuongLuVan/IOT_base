const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const i18n = require('i18n');
const passport = require('passport');
const { apiLimiter } = require('./rateLimit.js');
const { configurePassport } = require('./passport.js');

require('dotenv').config();

i18n.configure({
  locales: ['en', 'vi'],
  directory: path.join(__dirname, '../locales/'),
  queryParameter: 'lang',
  defaultLocale: 'en',
  cookie: 'lang'
});

const app = express();
app.set('port', process.env.APP_PORT || 3000);
app.set('host', process.env.APP_HOST || 'localhost');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);

app.use(cookieParser(process.env.COOKIE_SECRET || 'MY SECRET'));
app.use(session({
  name: process.env.SESSION_COOKIE_NAME || 'web_manager.sid',
  secret: process.env.SESSION_SECRET || 'secret',
  saveUninitialized: false,
  resave: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SESSION_SECURE === 'true' || process.env.NODE_ENV === 'production',
    maxAge: 30 * 60 * 1000
  }
}));

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use(i18n.init);
app.use(cors());
app.options('*', cors());
app.use(helmet());
app.use('/api', apiLimiter);
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }));
app.use(express.static(path.join(__dirname, '../../public')));
app.engine('ejs', require('ejs-locals'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../View'));

module.exports = app;
