const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class MqttUser extends CommonModel {
    get tableName() {  return "mqtt_user";}
  getNameTable(){ return 'mqtt_user';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["user_id","content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["user_id","content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id","created_at","id_created"],
          locationSelect:"mqtt_user_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT mqtt_user.*,users.username FROM mqtt_user  LEFT JOIN users on users.users_id=mqtt_user.user_id '
          //+ defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest)
          );
  }
  getJsonTofind(){
      return ["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
  }


}

module.exports =  MqttUser;
