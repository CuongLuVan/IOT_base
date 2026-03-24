const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class SocialUser extends CommonModel {
  get tableName() {  return "social_user";}
  getNameTable(){ return 'social_user';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["id_user","id_adress","social_type_id","adress_detail"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["id_user","id_adress","social_type_id","adress_detail","created_at","id_created"],
          locationSelect:"id_social",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT social_user.*,customer.email As email ,social_type.name as name_social FROM social_user  LEFT JOIN customer ON customer.customer_id=social_user.id_user LEFT JOIN social_type ON social_type.social_type_id=social_user.social_type_id ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["id_adress","adress_detail"];
  }

}

module.exports =  SocialUser;
