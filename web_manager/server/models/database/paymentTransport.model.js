const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');


class PaymentTransport extends CommonModel {
    get tableName() {  return "payment_transport";}
  getNameTable(){ return 'payment_transport';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["value","content","id_cost_transport","id_transport"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["value","content","id_cost_transport","id_transport","created_at","id_created"],
          locationSelect:"id_payment_intenal",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser=null){
      return ('SELECT payment_transport.* ,cost_transport.value as value_cost,cost_transport.content as content_cost,customer.email FROM payment_transport LEFT JOIN cost_transport  ON cost_transport.id_cost_transport=payment_transport.id_cost_transport  LEFT JOIN customer  ON customer.customer_id=payment_transport.id_transport');
  }
  getJsonTofind(){
      return ["content"];
  }

  
}

module.exports =  PaymentTransport;
