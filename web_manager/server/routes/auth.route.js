const express = require('express');
const  authCtrl = require('../controllers/auth.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');
const validate = require('../config/joi.validate.js');
const schema = require('../utils/validator.js');
const User = require('../models/database/user.model.js');
const Customer = require('../models/database/customer.model.js');
const authenticateCustomer = require('../middlewares/authenticateCustomer.js')
const router = express.Router();
const bcrypt = require('bcrypt');
const  customerCtrl = require('../controllers/customer.controller.js');
const {returnNotFound,returnOKCustom ,returnNotAuthen} = require('../utils/returnResponse.js');
const WarningInfo = require("../config/warningInfo.js");
const { authLimiter } = require('../config/rateLimit.js');
const authSessionCtrl = require('../controllers/authSession.controller.js');
const authenticateMutile = require('../middlewares/authenticateMutile.js');
const crypto = require('crypto');
const knex = require('../config/knex.js');
const passport = require('passport');
const { isProviderEnabled } = require('../config/passport.js');




router.route('/login').post(authLimiter, validate(schema.login),authCtrl.login);
router.route('/login_customer').post(authLimiter, validate(schema.login),authCtrl.loginCustomer);
router.route('/login_customer_manage').post(authLimiter, validate(schema.login),authCtrl.loginCustomerAdmin);
router.route('/tocken').get( authCtrl.getTocken);
router.route('/tocken_customer').get(authCtrl.getTockenCustomer);
router.route('/refresh').post(authLimiter, authSessionCtrl.refresh);
router.route('/logout').post(authenticateMutile, authSessionCtrl.logout);
router.route('/logout-all').post(authenticateMutile, authSessionCtrl.logoutAll);
router.route('/user').get(isAuthenticated, (req, res) => {
  User.query().where( { users_id: req.currentUser.users_id })
  .select(
      'users_id',
      'email',
      'username',
      'permission_id',
      'phone',
      'avatar',
      'fullname',
    ).first()
  .fetch({ require: false })
  .then((user) => {
      if (!user) 
        returnNotFound(res,{ error: 'No such user' },WarningInfo.EXPRIED_LOGIN);
      else 
        returnOKCustom(res,{ user: user});
  });
});

router.route('/info_customer').get(authenticateCustomer, (req, res) => {
  Customer.query().where({ customer_id: req.currentUser.users_id })
  .select(
      'customer_id',
      'email',
      'username',
      'phone',
      'avatar',
      'permission_id',
      'fullname',
      'address'
    ).first()
  .fetch({ require: false })
  .then((user) => {
      if (!user)  returnNotFound(res,{ error: 'No such user' },WarningInfo.EXPRIED_LOGIN);
      else returnOKCustom( res,{ user: user,});

  });
});

router.route('/customer').get(isAuthenticated, (req, res) => {

  User.query().where({ users_id: req.currentUser.users_id })
  .select(
      'users_id',
      'email',
      'username',
      'phone',
      'avatar',
      'fullname',
      'birthday',
      'passport',
      'address',
    ).first()
  .fetch({ require: false })
  .then((user) => {
      if (!user) {
        returnNotFound(res,{ error: 'No such user' },WarningInfo.EXPRIED_LOGIN);
      } else returnOKCustom( res,{ user: user });
  });
});



var tockenToCheck=[];

router.route('/generateTocken').post((req, res) => {
  /*if(req.action=="create"){
    tockenToCheck.push({tocken1:"sample1",tocken2:"sample2",time:new Date()});
  }
  else
  {
    let item=tockenToCheck.filter(function (i,n){
      return n.tocken1===tocken1;
    });
    if(!!item){
      tockenToCheck.push({tocken1:"sample1",tocken2:"sample2",time:new Date()});
    }
    
  }*/

  returnOKCustom( res,{ user: "user"});
  
});

// change information for customer

router.route('/changePassword').put(validate(schema.changePassword), isAuthenticated,(req, res) => {
Customer.query().where({ customer_id: req.currentUser.users_id },)
.select(
      'customer_id','username','email','password','token_reset','phone','avatar',
      'fullname','permission_id','address','note','oldid'
    ).first()
  .fetch({ require: false })
  .then((user) => {
      if (!user) {
        returnNotFound(res,{ error: 'No such user' });
      } else {
        bcrypt.compare(req.body['oldPassword'],  user.password).then(function(result) {
          if(result) {
            for(var k in user) {
                req.body[k]=user[k];
            }
            bcrypt.hash(req.body['newPassword'], saltRounds).then(function(hash) {
              // Store hash in your password DB.
              req.body['password']=hash;
              customerCtrl.updateData(req, res);
            });
          }
          else
            returnNotFound(res,{ error: 'No such user' });
                  
        })
        .catch(()=>{
          returnNotFound(res,{ error: 'No such user' });
        })
      }
  });

})
  


function safeReturnUrl(value) {
  if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || value.includes('\\')) return '/';
  return value;
}

function rememberReturnUrl(req, res, next) {
  req.session.returnUrl = safeReturnUrl(req.query.returnUrl);
  next();
}

function requireSocialProvider(provider) {
  return (req, res, next) => {
    if (!isProviderEnabled(provider)) {
      return res.status(503).json({ error: { message: provider + ' sign-in is not configured' }, error_code: WarningInfo.ERROR_SERVER });
    }
    return next();
  };
}

function completeSocialLogin(req, res) {
  if (!req.user) return res.redirect('/login-google?error=oauth-failed');
  if (!req.user.password) return res.redirect('/set-password-authen');
  return res.redirect(safeReturnUrl(req.session.returnUrl));
}

function validCsrfToken(expected, actual) {
  if (typeof expected !== 'string' || typeof actual !== 'string') return false;
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

router.get('/google', authLimiter, rememberReturnUrl, requireSocialProvider('google'),
  passport.authenticate('google', { scope: ['email', 'profile'], state: true })
);
router.get('/google/callback', authLimiter, requireSocialProvider('google'),
  passport.authenticate('google', { failureRedirect: '/login-google?error=oauth-failed' }),
  completeSocialLogin
);
router.get('/facebook', authLimiter, rememberReturnUrl, requireSocialProvider('facebook'),
  passport.authenticate('facebook', { scope: ['email'], state: true })
);
router.get('/facebook/callback', authLimiter, requireSocialProvider('facebook'),
  passport.authenticate('facebook', { failureRedirect: '/login-google?error=oauth-failed' }),
  completeSocialLogin
);

router.post('/set-password', authLimiter, async (req, res) => {
  if (!req.user) return returnNotAuthen(res, { error: 'Social sign-in is required' });
  if (!validCsrfToken(req.session.socialPasswordCsrf, req.body && req.body.csrfToken)) {
    return res.status(403).json({ error: { message: 'Invalid form token' }, error_code: WarningInfo.VALIDATE_WORNG });
  }
  const password = req.body && req.body.password;
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: { message: 'Password must be 8-128 characters' }, error_code: WarningInfo.VALIDATE_WORNG });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    await knex('customer').where('customer_id', req.user.customer_id).update({
      password: hash,
      id_updated: req.user.customer_id,
      updated_at: knex.fn.now()
    });
    req.user.password = hash;
    delete req.session.socialPasswordCsrf;
    return res.redirect(safeReturnUrl(req.session.returnUrl));
  } catch (error) {
    return res.status(500).json({ error: { message: 'Unable to set password' }, error_code: WarningInfo.ERROR_SERVER });
  }
});

module.exports =  router;
