const TypeModel= require('../middlewareDatabase/TypeModel.js');
const TableManifest= require('../middlewareDatabase/TableManifest.js');
const knex = require('../../config/knex.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
var squel = require("squel");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const  {getRamdomData}  = require('../../utils/utilsString.js');
const {returnFalse,returnOKCustom } = require('../../utils/returnResponse.js');
const WarningInfo = require("../../config/warningInfo.js");
const { createAccessSession, createRefreshSession } = require('../../services/authToken.service.js');

/**
 * Enterprise model.
 */
class Oauthen2 extends CommonModel {
    get tableName() {  return "oauthen2";}
    getNameTable(){ return 'oauthen2';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  /**
   * Table has timestamps.
   */
    checkInvalUserExistingTocken(tocken){
        var authen = squel.select().from("oauthen2")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            knex.raw(authen.toString()).then(function(result) {
                resolve( result[0] );
            }).catch(function(err){
                return reject(null);
            } )
        } );
    }
        async responseLogin(res,user){
            try {
                const permission_id = user.permission_id;
                const current_id = user.users_id;
                let valueManifest = String(current_id);
                let enterpriseId = '';
                if (permission_id >= TableManifest.NEW_REGISTER) {
                    let sqlMain = "SELECT users_id FROM users WHERE deleteflag=0 and id_created=" + current_id;
                    if (permission_id < TableManifest.ADMIN) {
                        sqlMain += " UNION SELECT id_member AS users_id FROM decentralization_access WHERE id_admin=" + current_id + " and deleteflag=0 and id_member!=0";
                    }
                    const members = await knex.raw(sqlMain);
                    for (let i = 0; i < members[0].length; i++) {
                        valueManifest += "," + members[0][i].users_id;
                    }
                    let sqlEnterprise = "SELECT enterprise_id FROM decentralization_access WHERE deleteflag=0 and id_member=" + current_id;
                    if (permission_id < TableManifest.ADMIN) {
                        sqlEnterprise = "SELECT enterprise_id FROM decentralization_access WHERE deleteflag=0 and id_admin=" + current_id;
                    }
                    const enterprises = await knex.raw(sqlEnterprise);
                    for (let i = 0; i < enterprises[0].length; i++) {
                        enterpriseId += (i === 0 ? '' : ',') + enterprises[0][i].enterprise_id;
                    }
                }
                const session = await knex.transaction(async (trx) => {
                    const access = await createAccessSession({
                        tokenType: 'admin', userId: current_id, permissionId: permission_id,
                        enterpriseId, valueManifest
                    }, trx);
                    const refresh = await createRefreshSession({
                        tokenType: 'admin', userId: current_id, permissionId: permission_id,
                        enterpriseId, valueManifest, sessionId: access.sessionId
                    }, trx);
                    return { access, refresh };
                });
                returnOKCustom(res, {
                    success: true,
                    token: session.access.accessToken,
                    accessToken: session.access.accessToken,
                    refreshToken: session.refresh.refreshToken,
                    expiresIn: '15m',
                    email: user.email
                });
            } catch (err) {
                returnFalse(res,{success: false, message: 'Problem SQL.'},WarningInfo.ERROR_SERVER);
            }
        }


  

    

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
        return 'SELECT oauthen2.*, db.username As namecreate ,dc.username As nameupdate ,dg.content as contentauthen,dn.username as userauthen FROM oauthen2 LEFT JOIN users db ON db.users_id=oauthen2.id_created LEFT JOIN users dc ON dc.users_id=oauthen2.id_updated LEFT JOIN permission dg ON dg.permission_id=oauthen2.permission_id LEFT JOIN users dn ON dn.users_id=oauthen2.userid';
    }
    

    
}

module.exports =  Oauthen2;
