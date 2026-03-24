const TypeModel= require('../middlewareDatabase/TypeModel.js');
const TableView= require('../middlewareDatabase/TableView.js');
const TABLE_NAME = 'oauthen2';
const TableManifest= require('../middlewareDatabase/TableManifest.js');
const knex = require('../../config/knex.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
var squel = require("squel");
const  defineManifest  = require('../../middlewares/CheckManifest.js');
const HttpStatus = require('http-status-codes');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const  {getRamdomData}  = require('../../utils/utilsString.js');
const {returnOKCustom,returnNotFound} = require('../../utils/returnResponse.js');
/**
 * Enterprise model.
 */
class Oauthen2 extends CommonModel {
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
        var authen = squel.select().from("oauthen2")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            ////console.log(authen.toString(),tocken);
            knex.raw(authen.toString()).then(function(result) {
              //  //console.log("checkInvalUserExistingTocken ok",result[0]);
                if(result[0].length<1)  reject(false);
                else
                    resolve( result[0] );
            }).catch(function(err){
                //console.log("checkInvalUserExistingTocken erro");
                return reject(err);
            } )
        } );
    }
    checkInvalUserExistingTocken(tocken){
        var authen = squel.select().from("oauthen2")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            ////console.log(authen.toString(),tocken);
            knex.raw(authen.toString()).then(function(result) {
              //  //console.log("checkInvalUserExistingTocken ok",result[0]);
              if(result[0].length<1)  reject(false);
              else
                  resolve( result[0] );
            }).catch(function(err){
                //console.log("checkInvalUserExistingTocken erro");
                return reject(err);
            } )
        } );
    }
    addTocken(data){
        //console.log("addTocken begin");
        var authen2 = squel.insert().into("oauthen2");
        //console.log("addTocken begi1");
        var fieldToAdd =["permission_id","userid","tocken","id_updated","id_created",
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
            knex.raw(authen2.toString()).then(function(x) {
                //console.log("addTocken xxxxxxx",x);
                resolve(true);
            }).catch(function(err1){
                //console.log("addTocken err1",err1);
                reject(false);
            }); 
        });
        
    }

    responseLogin(res,user){
        var dataTocken= getRamdomData(256);
        var permission_id=user.permission_id;
        var current_id=user.users_id;
        var listDataContain="";
        var listDataEnterprise_id="";
        listDataContain+=current_id;
        var authen2 = squel.insert().into("oauthen2")
                .set("permission_id",permission_id)
                .set("userid",current_id)
                .set("tocken",dataTocken)
                .set("id_updated",current_id)
                .set("id_created",current_id)
                .set("deleteflag",0)
                .set("created_at",'NOW()',{dontQuote: true})
                .set("updated_at",'NOW()',{dontQuote: true})
                .set("deleteflag",0)
                .set("time_relase",'NOW() + INTERVAL 1 DAY',{dontQuote: true});
        if(permission_id<TableManifest.NEW_REGISTER) {
                authen2.set("value_manifest",listDataContain);
                knex.raw(authen2.toString()).then(function(x) {
                    returnOKCustom(res,{success: true, token:dataTocken, email: user.email});
                }).catch(function(err1){ returnNotFound(res,err1,204); });
        } 
        else 
        {
            var sqlMain="SELECT users_id FROM users WHERE deleteflag=0 and id_created="+current_id;
            if(permission_id<TableManifest.ADMIN)
            {
                    sqlMain +=" UNION "+ "SELECT id_member FROM decentralization_access WHERE id_admin="+current_id
                    + " and deleteflag=0 and id_member!=0";
            }
            knex.raw(sqlMain).then(function(x) {
                for(var i=0;i<x[0].length;i++){
                    listDataContain+=","+x[0][i].users_id; 
                }
                var sqlMain1="SELECT enterprise_id FROM decentralization_access WHERE deleteflag=0 and id_member="+current_id;
                if(permission_id<TableManifest.ADMIN)
                {
                    sqlMain1="SELECT enterprise_id FROM decentralization_access WHERE deleteflag=0 and id_admin="+current_id;
                }
                knex.raw(sqlMain1).then(function(x) {
                    //console.log("sqlMain1 ............... sqlMain1",sqlMain1,x);
                    for(var i=0;i<x[0].length;i++){
                        listDataEnterprise_id+=","+x[0][i].enterprise_id; 
                    }
                    authen2.set("value_manifest",listDataContain)
                        .set("enterprise_id",listDataEnterprise_id);
                    knex.raw(authen2.toString()).then(function(xa) {
                        returnOKCustom(res,{success: true, token:dataTocken, email: user.email});
                    }).catch(function(err1){ returnNotFound(res,err1,204); });
                }).catch(function(err1){ returnNotFound(res,err1,204); });
                
            }).catch(function(err1){ returnNotFound(res,err1,204); });           
        }  
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
        return 'SELECT oauthen2.*, db.username As namecreate ,dc.username As nameupdate ,dg.content as contentauthen,dn.username as userauthen FROM oauthen2 LEFT JOIN users db ON db.users_id=oauthen2.id_created LEFT JOIN users dc ON dc.users_id=oauthen2.id_updated LEFT JOIN permission dg ON dg.permission_id=oauthen2.permission_id LEFT JOIN users dn ON dn.users_id=oauthen2.userid';
    }
    

    
}

module.exports =  Oauthen2;
