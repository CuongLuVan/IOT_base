const HttpStatus = require('http-status-codes');
const {returnNotFound ,returnNotAuthen} = require('../utils/returnResponse.js');
const oAuthen2Customer = require('../models/database/oAuthen2Customer.model.js');
const { verifyAccessToken } = require('../services/authToken.service.js');
var oauthen2=new oAuthen2Customer();
/**
 * Route authentication middleware to verify a token
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */

module.exports =  (req, res, next) => {
  const parts = (req.headers.authorization || '').split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return returnNotAuthen(res,{ error: 'Bearer token required' });
  }
  try {
    const claims = verifyAccessToken(parts[1]);
    if (claims.type !== 'customer' || !claims.jti) {
      return returnNotAuthen(res,{ error: 'Invalid access token' });
    }
    oauthen2.checkInvalUserExistingTocken(claims.jti).then((user) => {
      if (!user || user.length === 0 || String(user[0].customeid) !== String(claims.sub)) {
        return returnNotAuthen(res,{ error: 'Token revoked or expired' });
      }
      req.currentUser = {
        permission_id:user[0].permission_id,
        users_id:user[0].customeid,
        enterprise_id:user[0].enterprise_id,
        value_manifest:user[0].value_manifest
      };
      req.auth = claims;
      next();
    }).catch(() => returnNotFound(res,'cannot querry sql',204));
  } catch (err) {
    return returnNotAuthen(res,{ error: 'Invalid or expired token' });
  }
};
