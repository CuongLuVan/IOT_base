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
class GroupChat extends CommonModel {
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
            valueSetup: [ "name"]
        };
    }
    getFieldToDelete(){
        return {
            arrayCoppy:["name","created_at","id_created"],
            locationSelect:"group_chat_id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }
    
    getSQLReport(currentUser){
        return ('SELECT group_chat.* FROM group_chat ');
       // return 'SELECT oauthen2customer.*, db.username As namecreate ,dc.username As nameupdate ,dg.content as contentauthen,dn.username as userauthen FROM oauthen2 LEFT JOIN users db ON db.users_id=oauthen2.id_created LEFT JOIN users dc ON dc.users_id=oauthen2.id_updated LEFT JOIN permission dg ON dg.permission_id=oauthen2.permission_id LEFT JOIN users dn ON dn.users_id=oauthen2.userid';
    }

    getAllInfoUser(id){
        var infolistGroup ='(SELECT group_chat_detail.group_chat_id FROM group_chat_detail  where group_chat_detail.deleteflag =0 AND group_chat_detail.userid='+id+' )';
        var sqlData ='SELECT group_chat_detail.*,group_chat.name FROM group_chat_detail LEFT JOIN group_chat  ON group_chat.group_chat_id=group_chat_detail.group_chat_id  WHERE group_chat_detail.deleteflag =0 AND  group_chat_detail.group_chat_id IN '+infolistGroup;
        //console.log("listUser  group_chat sqlData",sqlData);
        return new Promise( ( resolve, reject ) => {
            knex.raw(sqlData).then(function(x) {
                resolve(x[0]);
            }).catch(function(err1){
                //console.log("listUser  group_chat sqlData",err1);
                reject([]);
            });
        });
    }

}

module.exports =  GroupChat;
