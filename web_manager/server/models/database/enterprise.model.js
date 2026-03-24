const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class Enterprise extends CommonModel {
  get tableName() {  return "enterprise";}
  getNameTable(){ return 'enterprise';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["name","detail_info"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["name","detail_info","created_at","id_created"],
          locationSelect:"enterprise_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT enterprise.* FROM enterprise ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["name","detail_info"];
  }


}

module.exports =  Enterprise;
