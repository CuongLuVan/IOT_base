const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ServiceCharging extends CommonModel {
  get tableName() {  return "service_charging";}
  getNameTable(){ return 'service_charging';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["customer_id","service_id","value","bank","detail_bank","content"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["customer_id","service_id","value","bank","detail_bank","content","created_at","id_created"],
          locationSelect:"bill_service_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT service_charging.*,customer.email,service.name FROM service_charging LEFT JOIN customer ON customer.customer_id=service_charging.bill_service_id LEFT JOIN service ON service.service_id=service_charging.service_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["value","bank","detail_bank","content"];
  }

}

module.exports =  ServiceCharging;
