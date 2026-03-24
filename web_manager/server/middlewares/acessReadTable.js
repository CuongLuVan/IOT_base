const HttpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const {mangerModelAdmin} = require('../models/database/managerAll.model.js');

const {returnNotFound } = require('../utils/returnResponse.js');

/**
 * Route authentication middleware to verify a token
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */

module.exports =  (req, res, next) => {
    var tableSelect=mangerModelAdmin(req.body.table);
    if(!!!tableSelect)  
        return  returnNotFound(res,{ error: 'Table not existing'});
    else
    {
        if(!tableSelect.checkAcessGetDatabase(req.currentUser.permission_id,tableSelect.getTypeTable())){
            return   returnNotFound(res,{ error: 'Database inval'},103);
        }
        else
            next();
    }
      
};
