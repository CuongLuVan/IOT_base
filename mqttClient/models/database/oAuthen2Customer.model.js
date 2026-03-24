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
class oAuthen2Customer extends CommonModel {
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
  /**
   * Table has timestamps.
   */
    checkInvalUserExistingTocken(tocken){
        var authen = squel.select().from("oauthen2customer")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            // console.log(authen.toString(),tocken);
            knex.raw(authen.toString()).then(function(result) {
            //    console.log("checkInvalUserExistingTocken ok",result[0]);
                resolve( result[0] );
            }).catch(function(err){
                // console.log("checkInvalUserExistingTocken erro");
                return reject(err);
            } )
        } );
    }

    responseLogin(res,user){
        var dataTocken= getRamdomData(256);
        var permission_id=user.get('permission_id');
        var current_id=user.get('customer_id');
        var listDataContain="";
        var listDataEnterprise_id="";
        listDataContain+=current_id;
        var authen2 = squel.insert().into("oauthen2customer")
                .set("permission_id",permission_id)
                .set("customeid",current_id)
                .set("tocken",dataTocken)
                .set("id_updated",current_id)
                .set("id_created",current_id)
                .set("deleteflag",0)
                .set("created_at",'NOW()',{dontQuote: true})
                .set("updated_at",'NOW()',{dontQuote: true})
                .set("deleteflag",0)
                .set("time_relase",'NOW() + INTERVAL 1 DAY',{dontQuote: true});
        authen2.set("value_manifest",listDataContain);
        console.log(authen2.toString());
        knex.raw(authen2.toString()).then(function(x) {
            //console.log(" knex err1 .....",x);
            return returnOKCustom(res,{success: true,token:dataTocken,email: user.get('email')});
        }).catch(function(err1){
            //console.log("err1 .....",err1);
            return returnNotAuthen(res,err1);
        });
    }

    addTocken(data){
        //console.log("addTocken begin");
        var authen2 = squel.insert().into("oauthen2customer");
        //console.log("addTocken begi1");
        var fieldToAdd =["permission_id","customeid","tocken","id_updated","id_created",
                            "deleteflag","value_manifest"];
                            //console.log("addTocken begi2");
        for(var i=0;i<fieldToAdd.length;i++){
            authen2.set(fieldToAdd[i],data[fieldToAdd[i]]);
        }
        //console.log("addTocken begi3");
        authen2.set("created_at",`STR_TO_DATE('`+data["created_at"]+`','%Y-%m-%dT%H:%i:%s.%fZ')`,{dontQuote: true});
        //console.log("addTocken begi4");
        authen2.set("updated_at",`STR_TO_DATE('`+data["updated_at"]+`','%Y-%m-%dT%H:%i:%s.%fZ')`,{dontQuote: true});
        //console.log("addTocken begi5");
        authen2.set("time_relase",`STR_TO_DATE('`+data["time_relase"]+`','%Y-%m-%dT%H:%i:%s.%fZ')`,{dontQuote: true});
        //console.log("addTocken authen2.toString()",authen2.toString());
        return new Promise( ( resolve, reject ) => {
            // console.log(authen2.toString());
            knex.raw(authen2.toString()).then(function(x) {
                //console.log("addTocken xxxxxxx",x);
                resolve(true);
            }).catch(function(err1){
                //console.log("addTocken err1",err1);
                reject(false);
            }); 
        });
        
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

    getTockenHeader(req){
        const authorizationHeader = req.headers['authorization'];
        let token;
        var newUser =true;
        if (authorizationHeader) {
            token = authorizationHeader.split(' ')[1];
            newUser=false;
        }
        return {newUser:newUser,token:token};
    }
    checkInvalUserExistingTocken=(tocken)=>{
        var authen = squel.select().from("oauthen2customer")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            knex.raw(authen.toString()).then(function(result) {
                resolve( result[0] );
            }).catch(function(err){
                //console.log("checkInvalUserExistingTocken erro");
                return reject(err);
            } )
        });
    }

    async checkUserInval(tocken){
            var authen = squel.select().from("oauthen2customer")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
            var infoUser= knex.raw(authen.toString());
            if ((infoUser!=null)&&(infoUser.length>0)) {
                return infoUser[0];
            }
            return false;
    }

    
    
}

module.exports =  oAuthen2Customer;
