const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ReturnService extends CommonModel {
  get tableName() {  return "return_service";}
  getNameTable(){ return 'return_service';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
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
      return ('SELECT return_service.*,customer.email,service.name FROM return_service LEFT JOIN customer ON customer.customer_id=return_service.bill_service_id LEFT JOIN service ON service.service_id=return_service.service_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["value","bank","detail_bank","content"];
  }


}

module.exports =  ReturnService;
