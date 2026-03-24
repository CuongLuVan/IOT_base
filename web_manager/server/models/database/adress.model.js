const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

class Adress extends CommonModel {
  get tableName() {  return "address";}
  getNameTable(){ return 'address';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["user_id","contactPhoneNumber","streetaddr","location_long","location_lat"]
      };
  }

  getFieldToDelete(){
      return {
          arrayCoppy:["user_id","contactPhoneNumber","streetaddr","location_long","location_lat","created_at","id_created"],
          locationSelect:"addr_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT address.* FROM address ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["name","contactPhoneNumber","province","city","streetaddr","postCode"];
  }

  
}

module.exports =  Adress;
