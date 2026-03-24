const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/database/user.model.js');
const Customer = require('../models/database/customer.model.js');
const Oauthen2 = require('../models/database/oAuthen2.model.js');
const OAuthen2Customer = require('../models/database/oAuthen2Customer.model.js');
const {returnOK,returnOKCustom, returnNotAuthen,returnNotFound } = require('../utils/returnResponse.js');
const WarningInfo = require("../config/warningInfo.js");



var oauthen2=new Oauthen2();
var oAuthen2Customer=new OAuthen2Customer();
var lstLogin=[];
var lstLoginCustomer=[];
var authCtrl={};


function checkLimitTimerInfo(res,email){
  lstLogin =lstLogin.filter(o=>((Date.now() - o.time)<2000));
  var emailExist=lstLogin.filter(o=>o.email==email);
  if(emailExist.length==1){
    return returnNotAuthen(res,{success: false,message: 'Bạn dang đăng nhập tài khoản hơn 2 lần trong 1s.'},WarningInfo.HACK_ERROR);
  }
  else if(emailExist.length>1)
  {
    return returnNotAuthen(res,{success: false,message: 'Bạn dang đăng nhập tài khoản hơn 2 lần trong 1s.'},WarningInfo.HACK_ERROR);
  }
  lstLogin.push({email:email,time:Date.now()});
}
/**
 * Returns jwt token if valid email and password is provided
 *
 * @param {object} req
 * @param {object} res
 * @returns {*}
 */
 authCtrl.login = function(req, res) {
  const { email, password } = req.body;
  checkLimitTimerInfo(res,email);
  User.query().where({email:email, deleteflag: 0}).first()
    .fetch({ require: false })
    .then((user) => {
      if (user) {
        bcrypt.compare(password,  user.password).then(function(result) {
          if(result)
            oauthen2.responseLogin(res,user);        
          else
            return returnNotAuthen(res,{success: false,message:'Authentication failed. Invalid password'},WarningInfo.WRONG_LOGIN);
        })
        .catch(()=>{
          return returnNotAuthen(res,{success: false,message:'Authentication failed. Invalid password'},WarningInfo.WRONG_LOGIN);
        });
      } else {
        return returnNotAuthen(res,{success: false,message:'Invalid username or password.'},WarningInfo.ACOUNT_NOT_EXIST);
      }
    });
}


authCtrl.loginCustomer = function(req, res) {
  const { email, password } = req.body;
  checkLimitTimerInfo(res,email);
  Customer.query().where({email:email, deleteflag: 0}).first()
    .fetch({ require: false })
    .then((user) => {
      if (user) {
        bcrypt.compare(password,  user.password).then(function(result) {
          if(result)
            oAuthen2Customer.responseLogin(res,user); 
          else
            return returnNotAuthen(res,{success: false,
                  message:'Authentication failed. Invalid password'},WarningInfo.WRONG_LOGIN);
                  
        })
        .catch(()=>{
          return returnNotAuthen(res,{success: false,
                message:'Authentication failed. Invalid password'},WarningInfo.WRONG_LOGIN);
        })
      } else {
        return returnNotAuthen(res,{success: false,
              message:'Authentication failed. Invalid password'},WarningInfo.ACOUNT_NOT_EXIST);
      }
    });
}


authCtrl.loginCustomerAdmin = function(req, res) {
  const { email, password } = req.body;
  checkLimitTimerInfo(res,email);
  Customer.query().where({email:email, deleteflag: 0}).first()
    .fetch({ require: false })
    .then((user) => {
      if (user) {
        if(user.permission_id!=2) return  returnNotAuthen(res,{success: false,
               message:'Không thể truy cập'},WarningInfo.NOT_ACESS_DATABASE);
        bcrypt.compare(password,  user.password).then(function(result) {
          if(result)
            oAuthen2Customer.responseLogin(res,user); 
          else
            return returnNotAuthen(res,{success: false,
                  message:'Authentication failed. Invalid password'},WarningInfo.WRONG_LOGIN);
                  
        })
        .catch(()=>{
          return returnNotAuthen(res,{success: false,
                message:'Authentication failed. Invalid password'},WarningInfo.WRONG_LOGIN);
        })
      } else {
        return returnNotAuthen(res,{success: false,
              message:'Authentication failed. Invalid password'},WarningInfo.ACOUNT_NOT_EXIST);
      }
    });
}


authCtrl.getTocken = function(req, res) {
  const authorizationHeader = req.headers['authorization'];
  let token;
  if (authorizationHeader) {
      token = authorizationHeader.split(' ')[1];
  }
  if (token) {
      oauthen2.checkInvalUserExistingTocken(token).then((user) => {
        returnOKCustom(res,{ user:user[0]});
      })
      .catch(function(err){
        return returnNotAuthen(res,{success: false,message:'No token ex'},WarningInfo.EXPRIED_LOGIN);
      });
  } else {
    return returnNotAuthen(res,{success: false,message:'No token False'},WarningInfo.LOGIN_FAILSE);
  }
}

authCtrl.getTockenCustomer = function(req, res) {
  const authorizationHeader = req.headers['authorization'];
  let token;
  if (authorizationHeader) {
      token = authorizationHeader.split(' ')[1];
  }
  if (token) {
    oAuthen2Customer.checkInvalUserExistingTocken(token).then((user) => {
        returnOKCustom(res,{ user:user[0]});
      })
      .catch(function(err){
        return returnNotAuthen(res,{success: false,message:'No token ex'},WarningInfo.EXPRIED_LOGIN);
      });
  } else {
    return returnNotAuthen(res,{success: false,message:'No token False'},WarningInfo.LOGIN_FAILSE);
  }
}

module.exports =authCtrl;