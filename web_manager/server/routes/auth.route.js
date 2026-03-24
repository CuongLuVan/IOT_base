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




router.route('/login').post(validate(schema.login),authCtrl.login);
router.route('/login_customer').post(validate(schema.login),authCtrl.loginCustomer);
router.route('/login_customer_manage').post(validate(schema.login),authCtrl.loginCustomerAdmin);
router.route('/tocken').get( authCtrl.getTocken);
router.route('/tocken_customer').get(authCtrl.getTockenCustomer);
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
  


module.exports =  router;
