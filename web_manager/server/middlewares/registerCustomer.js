/**
 * Route authentication middleware to register new customer
 *
 * @param {object} req
 * @param {object} res
 * @param {function} next
 *
 */

module.exports =  (req, res, next) => {
 
        req.currentUser = {
          permission_id:1,
          users_id:0,
          enterprise_id:1,
          value_manifest:1
        };
        next();
    
};
