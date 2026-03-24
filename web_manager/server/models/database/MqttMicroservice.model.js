const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class MqttMicroservice extends CommonModel {
  get tableName() {  return "mqtt_microservice";}
  getNameTable(){ return 'mqtt_microservice';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id","created_at","id_created"],
          locationSelect:"mqtt_microservice_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT mqtt_microservice.* FROM mqtt_microservice ');
        //  + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
  }

}

module.exports =  MqttMicroservice;
