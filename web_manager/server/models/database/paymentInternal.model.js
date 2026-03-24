const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');


class PaymentInternal extends CommonModel {
    get tableName() {  return "payment_internal";}
  getNameTable(){ return 'payment_internal';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["value","type","note"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["value","type","note","created_at","id_created"],
          locationSelect:"id_payment_intenal",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser=null){
      return ('SELECT payment_internal.*,payment_type.content FROM payment_internal  LEFT JOIN payment_type  ON payment_internal.type=payment_type.id_payment_type ');
  }
  getJsonTofind(){
      return ["note"];
  }

  
}

module.exports =  PaymentInternal;
