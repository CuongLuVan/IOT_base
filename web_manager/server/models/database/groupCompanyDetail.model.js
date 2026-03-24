const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

class GroupCompanyDetail extends CommonModel {
  get tableName() {  return "group_company_detail";}
  getNameTable(){ return 'group_company_detail';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["company_id","group_company_id"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["company_id","group_company_id","created_at","id_created"],
          locationSelect:"group_company_detail_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT group_company_detail.*,group_company.name_group_company,group_company.adress,company.companyname FROM group_company_detail LEFT  JOIN group_company on  group_company.group_company_id= group_company_detail.group_company_id LEFT  JOIN company on  company.company_id= group_company_detail.company_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return [];
  }

  
}

module.exports =  GroupCompanyDetail;
