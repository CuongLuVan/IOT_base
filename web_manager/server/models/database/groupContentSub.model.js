const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class GroupContentSub extends CommonModel {
  get tableName() {  return "group_content_sub";}
  getNameTable(){ return 'group_content_sub';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["group_content","name_short","group_content_id","title"]
      };
  }
  getFieldLinkShort(){
    return { valueSetup:"group_content",data:"name_short" } ;
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["group_content","name_short","group_content_id","title" ,"created_at","id_created"],
          locationSelect:"group_content_sub_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT group_content_sub.* ,group_content.group_content as group_content_main FROM group_content_sub LEFT JOIN group_content ON group_content.group_content_id=group_content_sub.group_content_id ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["group_content","title"];
  }

}

module.exports =  GroupContentSub;
