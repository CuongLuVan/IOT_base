const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');


class CostTransport extends CommonModel {
    get tableName() {  return "cost_transport";}
  getNameTable(){ return  'cost_transport';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["value","content"]
      };
  }

  getFieldToDelete(){
      return {
          arrayCoppy:["value","content","created_at","id_created"],
          locationSelect:"id_cost_transport",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser=null){
      return ('SELECT cost_transport.* FROM cost_transport ');
  }
  getJsonTofind(){
      return ["content"];
  }

  
}

module.exports =  CostTransport;
