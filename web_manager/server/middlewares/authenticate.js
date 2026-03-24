const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');

const Oauthen2 = require('../models/database/oAuthen2.model.js');
const {returnNotFound ,returnNotAuthen} = require('../utils/returnResponse.js');
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
  let token;
  if (authorizationHeader) {
      token = authorizationHeader.split(' ')[1];
  }
  
  if (token) {
    oauthen2.checkInvalUserExistingTocken(token).then((user) => {
        if((user == null)||(user.length==0)){
          returnNotAuthen(res,{ error: 'No token provided'});
        }
        else
        {
          req.currentUser = {
            permission_id:user[0].permission_id,
            users_id:user[0].userid,
            enterprise_id:user[0].enterprise_id,
            value_manifest:user[0].value_manifest
          };
          next();
        }
       
      })
      .catch(function(err){
          returnNotFound(res,"cannot querry sql",204);
      });
  } else {
    returnNotAuthen(res,{ error: 'Have not token '});
  }
};
