const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

class PaymentType extends CommonModel {
    get tableName() {  return "payment_type";}
  getNameTable(){ return 'payment_type';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["content"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["content","created_at","id_created"],
          locationSelect:"id_payment_type",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser=null){
      return ('SELECT payment_type.* FROM payment_type ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["content"];
  }

  
}

module.exports =  PaymentType;
