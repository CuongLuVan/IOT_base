const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const  defineManifest  = require('../../middlewares/CheckManifest.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * Enterprise model.
 */
class Permission extends CommonModel {
    get tableName() {  return "permission";}
  getNameTable(){ return  'permission';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: [ "content"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["content","created_at","id_created"],
          locationSelect:"permission_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return 'SELECT permission.*, db.username  As namecreate ,dc.username  As nameupdate FROM permission LEFT JOIN users db ON db.users_id=permission.id_created LEFT JOIN users dc ON dc.users_id=permission.id_updated '
      + defineManifest.checkManifestTableNomal('permission',currentUser.permission_id,currentUser.users_id,currentUser.value_manifest);
  }
    getJsonTofind(){
        return ["content"];
    }

}

module.exports =  Permission;
