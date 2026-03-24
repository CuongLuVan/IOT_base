const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

/**
 * User model.
 */
class AdvertisementContent extends CommonModel {

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
/*
  verifyPassword(password) {
    return this.get('password') === password;
  } */
  get tableName() {  return "advertisement_content";}
  getNameTable(){ return 'advertisement_content';}
  getTypeTable(){ return TypeModel.NEWS;}
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["group_content_sub_id","group_file","filesave","title","content","content_img","land_image","set_to_fist"]
      };
  }

  getFieldToDelete(){
      return {
          arrayCoppy:["group_content_sub_id","group_file","filesave","title","content","content_img","land_image","set_to_fist","created_at","id_created"],
          locationSelect:"advertisement_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT advertisement_content.*,group_content_sub.group_content FROM advertisement_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=advertisement_content.group_content_sub_id ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["title","content"];
  }

}

module.exports =  AdvertisementContent;
