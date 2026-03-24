const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();
const Oauthen2 = require('../models/database/oAuthen2.model.js');
const {returnNotFound,returnNotAuthen} = require('../utils/returnResponse.js');
var oauthen2=new Oauthen2();
/**
 * Route authentication middleware to verify a token
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */

module.exports =  (req, res, next) => {
  const authorizationHeader = req.headers['authorization'];
  var token="";
  //console.log("authorizationHeader",authorizationHeader);
  if (authorizationHeader) {
      token = authorizationHeader.split(' ')[1];
  }
  if (token) {
    oauthen2.checkInvalUserExistingTocken(token).then((user) => {
        //console.log("checkInvalUserExistingTocken user",user);
       
        req.currentUser = {
          permission_id:user[0].permission_id, 
          users_id:user[0].userid,
          enterprise_id:user[0].enterprise_id,
          value_manifest:user[0].value_manifest
        };
        next();
      })
      .catch(function(err){
        
          var headers = {headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-XSRF-TOKEN': token,
                            authorization: 'Beard '+ token,
                          }
                        }; 

          axios.get( process.env.ADMIN_API +"auth/tocken",headers)
            .then(data =>{
                  if(data.data.user==null){
                    returnNotAuthen(res," not existing tockenr");
                    return;
                  } 
                  oauthen2.addTocken(data.data.user).then(info =>{
                        req.currentUser = {
                          permission_id:data.data.user.permission_id,
                          users_id:data.data.user.userid,
                          enterprise_id:data.data.user.enterprise_id,
                          value_manifest:data.data.user.value_manifest
                        };
                        next();
                    })
                    .catch(err=>{ returnNotFound(res,err,204); });
            })
            .catch(err=>{  
               // console.log("checkInvalUserExistingTocken 2",err.response);
                returnNotFound(res,err,210);
            })
      });
  } else {returnNotAuthen(res,'No token False'); }
};
