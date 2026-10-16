const crypto = require('crypto');
const express = require('express');

const router = express.Router();

function passwordCsrfToken(req) {
  if (!req.session.socialPasswordCsrf) {
    req.session.socialPasswordCsrf = crypto.randomBytes(32).toString('hex');
  }
  return req.session.socialPasswordCsrf;
}

router.get('/test-authen', (req, res) => {
  res.render('main/SaleOnline');
});

router.get('/login-google', (req, res) => {
  res.render('main/loginGoogle');
});

router.get('/set-password-authen', (req, res) => {
  if (!req.user) return res.redirect('/login-google?error=authentication-required');
  res.set('Cache-Control', 'no-store');
  return res.render('main/passwordGoogle', { csrfToken: passwordCsrfToken(req) });
});

module.exports = router;
