const TypeModel= require('../middlewareDatabase/TypeModel.js');
const knex = require('../../config/knex.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
var squel = require("squel");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const {returnNotAuthen,returnOKCustom } = require('../../utils/returnResponse.js');
const WarningInfo = require("../../config/warningInfo.js");
const { createAccessSession, createRefreshSession } = require('../../services/authToken.service.js');


class oAuthen2Customer extends CommonModel {
 
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  /**
   * Table has timestamps.
   */
    async responseLogin(res,user){
        try {
            const permissionId = Number(user.permission_id);
            const userId = Number(user.customer_id);
            if (!Number.isSafeInteger(permissionId) || !Number.isSafeInteger(userId)) {
                return returnNotAuthen(res, { success: false, message: 'Unable to create session.' }, WarningInfo.EXPRIED_LOGIN);
            }

            let valueManifest = '';
            if (permissionId === 2) {
                const companies = await knex('company')
                    .select('company_id')
                    .where({ id_created: userId, deleteflag: 0 });
                valueManifest = companies
                    .map((company) => company.company_id)
                    .filter((id, index, values) => Number.isSafeInteger(Number(id)) && values.indexOf(id) === index)
                    .join(',');
            }

            const session = await knex.transaction(async (trx) => {
                const access = await createAccessSession({
                    tokenType: 'customer', userId, permissionId,
                    valueManifest
                }, trx);
                const refresh = await createRefreshSession({
                    tokenType: 'customer', userId, permissionId,
                    valueManifest, sessionId: access.sessionId
                }, trx);
                return { access, refresh };
            });
            return returnOKCustom(res, {
                success: true,
                token: session.access.accessToken,
                accessToken: session.access.accessToken,
                refreshToken: session.refresh.refreshToken,
                expiresIn: '15m',
                email: user.email,
                avatar: user.avatar
            });
        } catch (error) {
            return returnNotAuthen(res, { success: false, message: 'Unable to create session.' }, WarningInfo.EXPRIED_LOGIN);
        }
    }

    get tableName() {  return "oauthen2customer";}
    getNameTable(){ return  'oauthen2customer';}

    

    getJsonTofind(){
        return [];
    }
    getFieldToAdd(){
        return {
            valueSetup: [ "permission_id","userid","tocken","value_manifest"]
        };
    }
    getFieldToDelete(){
        return {
            arrayCoppy:["permission_id","userid","tocken","value_manifest","created_at","id_created"],
            locationSelect:"id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }
    
    
    getSQLReport(currentUser){
        return ('SELECT oauthen2customer.* FROM oauthen2customer ');
       // return 'SELECT oauthen2customer.*, db.username As namecreate ,dc.username As nameupdate ,dg.content as contentauthen,dn.username as userauthen FROM oauthen2 LEFT JOIN users db ON db.users_id=oauthen2.id_created LEFT JOIN users dc ON dc.users_id=oauthen2.id_updated LEFT JOIN permission dg ON dg.permission_id=oauthen2.permission_id LEFT JOIN users dn ON dn.users_id=oauthen2.userid';
    }

    checkInvalUserExistingTocken(tocken){
        var authen = squel.select().from("oauthen2customer")
                        .where("tocken = ?", tocken)
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            var p = authen.toParam();
            knex.raw(p.text, p.values).then(function(result) {
                resolve( result[0] );
            }).catch(function(err){
                return reject(err);
            } )
        });
    }
    
    
}

module.exports =  oAuthen2Customer;
