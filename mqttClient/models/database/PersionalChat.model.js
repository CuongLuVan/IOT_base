const TypeModel= require('../middlewareDatabase/TypeModel.js');
const TableView= require('../middlewareDatabase/TableView.js');
const TABLE_NAME = 'persional_chat';
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
class PersionalChat extends CommonModel {
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
            valueSetup: [ "name","color","icon","user_friend_id1","user_friend_id2"]
        };
    }
    getFieldToDelete(){
        return {
            arrayCoppy:["name","color","icon","user_friend_id1","user_friend_id2","created_at","id_created"],
            locationSelect:"persional_chat_id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }
    
    getSQLReport(currentUser){
        return ('SELECT persional_chat.* FROM persional_chat ');
       // return 'SELECT oauthen2customer.*, db.username As namecreate ,dc.username As nameupdate ,dg.content as contentauthen,dn.username as userauthen FROM oauthen2 LEFT JOIN users db ON db.users_id=oauthen2.id_created LEFT JOIN users dc ON dc.users_id=oauthen2.id_updated LEFT JOIN permission dg ON dg.permission_id=oauthen2.permission_id LEFT JOIN users dn ON dn.users_id=oauthen2.userid';
    }

    getAllInfoUser(id){
        var sqlData ='SELECT persional_chat.* FROM persional_chat where ( persional_chat.user_friend_id1='+id +' or persional_chat.user_friend_id2='+id+') AND persional_chat.deleteflag =0';
        return new Promise( ( resolve, reject ) => {
            knex.raw(sqlData).then(function(x) {
                resolve(x[0]);
            }).catch(function(err1){
                reject([]);
            });
        });
    }

    getAllInfoUserChatFriend(id,id1){
        var sqlData ='SELECT persional_chat.* FROM persional_chat where ( persional_chat.user_friend_id1='
        +id +' and persional_chat.user_friend_id2='+id1+') OR ( persional_chat.user_friend_id1='
        +id1+' and persional_chat.user_friend_id2='+id
        +') AND persional_chat.deleteflag =0';
        //console.log("getRoomChatFriend.......1",sqlData);
        return new Promise( ( resolve, reject ) => {
            knex.raw(sqlData).then(function(x) {
                resolve(x[0]);
            }).catch(function(err1){
                reject([]);
            });
        });
    }
    
    addInfoUserChatFriend(req){
        var sqlData = this.checkSqlUpdateAdmin(req,req.body);
        return new Promise( ( resolve, reject ) => {
            knex.raw(sqlData).then(function(x) {
                resolve(x[0]);
            }).catch(function(err1){
                reject([]);
            });
        });
    }
    

}

module.exports =  PersionalChat;
