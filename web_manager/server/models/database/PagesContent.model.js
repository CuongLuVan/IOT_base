const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');


class PagesContent extends CommonModel {
    get tableName() {  return "gro_pages_content";}
  getNameTable(){ return 'gro_pages_content';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["group_content_sub_id","group_file","filesave","title","name_short","content","content_img","support_product","is_main_pages_id","set_to_fist","type_langue","detail_content_id"]
      };
  }
  getFieldLinkShort(){
    return { valueSetup:"title",data:"name_short" } ;
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["group_content_sub_id","group_file","filesave","title","name_short","content","content_img","support_product","is_main_pages_id","set_to_fist","created_at","id_created","type_langue","detail_content_id"],
          locationSelect:"pages_content_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
    
      return ('SELECT gro_pages_content.*,group_content_sub.group_content FROM gro_pages_content LEFT JOIN group_content_sub on group_content_sub.group_content_sub_id=gro_pages_content.group_content_sub_id ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["group_file","filesave","title","content","content_img","pages_content_id","detail_content_id","is_main_pages_id"];
  }

}

module.exports =  PagesContent;
