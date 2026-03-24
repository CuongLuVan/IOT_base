const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');

/**
 * User model.
 */
class DetailBank extends CommonModel {
  get tableName() {  return "detailbank";}
  getNameTable(){ return 'detailbank';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ALL  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["info","bank"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["info","bank" ,"created_at","id_created"],
          locationSelect:"bank_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT detailbank.* FROM detailbank ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["info","bank"];
  }

}

module.exports =  DetailBank;
