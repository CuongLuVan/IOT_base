const TypeModel= require('../middlewareDatabase/TypeModel.js');
var squel = require("squel");
const knex = require('../../config/knex.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class User extends CommonModel {

  static  get tableName() {  return 'users';}
  getNameTable=()=>{ return 'users';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["username","email","password","phone","avatar","fullname","permission_id","address","note" ]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["username","email","password","phone","avatar","fullname","permission_id","address","note" ,"created_at","id_created"],
          locationSelect:"users_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT users.users_id,users.username,users.email,users.phone,users.avatar,users.fullname,users.permission_id,users.address,users.note'
      +',db.username  As name_create, dc.username  As name_update ,de.content As manifest_content FROM users LEFT JOIN users db ON db.users_id=users.id_created LEFT JOIN users dc ON dc.users_id=users.id_updated  LEFT JOIN permission de ON de.permission_id=users.permission_id');
   //       + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }

  getAllInfoToChat(){
      return ('SELECT users.users_id,users.username,users.email,users.phone,users.avatar,users.fullname FROM users where users.deleteflag=0 ');
   //       + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }

  getAllInfoToComment(){
    return ('SELECT username, email, phone, avatar, fullname, permission_id, address, note FROM customer WHERE deleteflag =0 UNION ALL SELECT username, email, phone, avatar, fullname, permission_id, address, note FROM users WHERE deleteflag =0;');
}
  getConditionManisfest(info){
    return "users.deleteflag=0 AND users.permission_id>"+info.permission_id+ " ";
  }

  getJsonTofind(){
      return ["username","email","phone","avatar","fullname","address","note" ];
  }

  async checkValueEmailData(email){
    var squelGet=squel.select().from('users').where('email="' + email +'"').where('deleteflag=0');
    var info= await knex.raw(squelGet.toString());
    if((info!=null)&&(info.length>0)) {
      return true;
    }
    return false;
  }

  async checkUserExistingSql(data){
      var userToget = squel.select().from('users').
      where( squel.expr()
                  .and("phone='"+data["phone"]+"'")
                  .or("email='"+data["email"]+"'")
      ).where("deleteflag=0");
      return await this.queryDatabase(userToget.toString());
  }
  async registerToUserSql(data){
      let dataUser=  this.getFieldToAdd();//  DataTableFieldAdd[table];
      var authen = squel.insert().into(this.getNameTable());
      for(var i=0;i<dataUser.valueSetup.length;i++){
          let item=dataUser.valueSetup[i];
          if(!!!data[item]) authen.set(item,null);
          else
          authen.set(item,data[item]);
      }
      authen.set("id_created",0).set("id_updated",0)
      .set("created_at","NOW()",{dontQuote: true}) 
      .set("updated_at","NOW()",{dontQuote: true})
      .set("deleteflag",0);
      return await this.queryDatabaseDetail(authen.toString());;
  }


}

module.exports =  User;
