const TypeModel= require('../middlewareDatabase/TypeModel.js');
const knex = require('../../config/knex.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
var squel = require("squel");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const  {getRamdomData}  = require('../../utils/utilsString.js');
const {returnNotAuthen,returnOKCustom } = require('../../utils/returnResponse.js');
const WarningInfo = require("../../config/warningInfo.js");


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
    checkInvalUserExistingTocken(tocken){
        var authen = squel.select().from("oauthen2customer")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
        return new Promise( ( resolve, reject ) => {
            knex.raw(authen.toString()).then(function(result) {
                resolve( result[0] );
            }).catch(function(err){
                return reject(err);
            } )
        } );
    }

    async responseLogin(res,user){
        try
        {
            var dataTocken= getRamdomData(256);
            var permission_id=user.permission_id;
            //var permission_id = 2;
            var current_id=user.customer_id;
            var listDataContain="";
            //listDataContain+=current_id;
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
                    .set("time_relase",'NOW() + INTERVAL 7 DAY',{dontQuote: true});
    
            if(user.permission_id==2){
                var dataCompany = squel.select().from("company")
                .where("id_created = "+current_id )
                .where("deleteflag = 0");
               
                var infoCompany = await knex.raw(dataCompany.toString());
                if ((infoCompany!=null)&&(infoCompany.length>0)) {
                    for(var i=0;i<infoCompany[0].length;i++)
                    {
                        listDataContain+=infoCompany[0][i].company_id;
                        if(i!==(infoCompany[0].length-1))  listDataContain+=",";
                    }
                }  
            }
            authen2.set("value_manifest",listDataContain);
            var x = await knex.raw(authen2.toString());
            return returnOKCustom(res,{success: true,token:dataTocken,email: user.email,avatar:user.avatar});
        }
        catch(ie){
            return returnNotAuthen(res,ie,WarningInfo.EXPRIED_LOGIN);
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
                return reject(err);
            } )
        });
    }

    async checkUserInval(tocken){
            var authen = squel.select().from("oauthen2customer")
                        .where("tocken = '"+tocken+"'" )
                        .where("deleteflag = 0")
                        .where("time_relase > NOW()");
            var infoUser= await knex.raw(authen.toString());
            if ((infoUser!=null)&&(infoUser.length>0)) {
                return infoUser[0];
            }
            return false;
    }
    
    
}

module.exports =  oAuthen2Customer;
