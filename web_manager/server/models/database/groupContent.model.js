const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class GroupContent extends CommonModel {
  get tableName() {  return "group_content";} 
  getNameTable(){ return 'group_content';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.NOT_ACESS  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["group_content","name_short","title"]
      };
  }
  getFieldLinkShort(){
    return { valueSetup:"group_content",data:"name_short" } ;
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["group_content","name_short","title" ,"created_at","id_created"],
          locationSelect:"group_content_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT group_content.* FROM group_content ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["group_content","title"];
  }


}

module.exports =  GroupContent;
