const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 * 
 */
class SocialType extends CommonModel {
  get tableName() {  return "social_type";}
  getNameTable(){ return 'social_type';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ALL,
             add:CustomerAcess.ALL,
             view:CustomerAcess.ALL  }; 
  }
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["name"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["name","created_at","id_created"],
          locationSelect:"social_type_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT social_type.* FROM social_type ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["name"];
  }

}

module.exports =  SocialType;
