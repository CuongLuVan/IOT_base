const TypeModel= require('../middlewareDatabase/TypeModel.js');
const TableView= require('../middlewareDatabase/TableView.js');
const TABLE_NAME = 'oauthen2customer';
const TableManifest= require('../middlewareDatabase/TableManifest.js');
const knex = require('../../config/knex.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
var squel = require("squel");
const  defineManifest  = require('../../middlewares/CheckManifest.js');
const HttpStatus = require('http-status-codes');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const  {getRamdomData}  = require('../../utils/utilsString.js');
const {returnOK,returnNotAuthen,returnOKCustom } = require('../../utils/returnResponse.js');

/**
 * Enterprise model.
 */
class ListFriendChat extends CommonModel {
    /**
     * Get table name.
     */
    get tableName() {
        return TABLE_NAME;
    }
    getTypeTable(){ return TypeModel.SELL_PRODUCT;}
    customerAcess(){ 
        return  {edit:CustomerAcess.NOT_ACESS,
                add:CustomerAcess.NOT_ACESS,
                view:CustomerAcess.NOT_ACESS  }; 
    }

    get hasTimestamps() {
        return true;
    }
    getNameTable(){ return TABLE_NAME;}

    getJsonTofind(){
        return [];
    }
    getFieldToAdd(){
        return {
            valueSetup: [ "name","color","icon","user_friend_id"]
        };
    }
    getFieldToDelete(){
        return {
            arrayCoppy:["name","color","icon","user_friend_id","created_at","id_created"],
            locationSelect:"id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }
    
    getSQLReport(currentUser){
        return ('SELECT list_friend_chat.* FROM list_friend_chat ');
       // return 'SELECT oauthen2customer.*, db.username As namecreate ,dc.username As nameupdate ,dg.content as contentauthen,dn.username as userauthen FROM oauthen2 LEFT JOIN users db ON db.users_id=oauthen2.id_created LEFT JOIN users dc ON dc.users_id=oauthen2.id_updated LEFT JOIN permission dg ON dg.permission_id=oauthen2.permission_id LEFT JOIN users dn ON dn.users_id=oauthen2.userid';
    }

    getAllInfoUser(id){
        var sqlData ='SELECT list_friend_chat.* FROM list_friend_chat where  list_friend_chat.deleteflag =0 AND list_friend_chat.created_at='+id;
        //console.log("listUser sqlData",sqlData);
        return new Promise( ( resolve, reject ) => {
            knex.raw(sqlData).then(function(x) {
                resolve(x[0]);
            }).catch(function(err1){
                reject([]);
            });
        });
    }

}

module.exports =  ListFriendChat;
