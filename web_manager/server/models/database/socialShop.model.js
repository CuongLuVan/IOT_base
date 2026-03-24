const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class SocialShop extends CommonModel {
  get tableName() {  return "social_shop";}
  getNameTable(){ return 'social_shop';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["name_shop","product_id","link"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["name_shop","product_id","link","created_at","id_created"],
          locationSelect:"social_shop_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT social_shop.* FROM social_shop ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["product_id","name"];
  }

}

module.exports =  SocialShop;
