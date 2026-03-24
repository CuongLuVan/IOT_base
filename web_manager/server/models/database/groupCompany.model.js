const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

class GroupCompany extends CommonModel {
  get tableName() {  return "group_company";}
  getNameTable(){ return 'group_company';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  
  getFieldToAdd(){
      return {
          valueSetup: ["name_group_company","image","adress","location_lat","location_long","city_id","province_id","village_id"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["name_group_company","image","adress","location_lat","location_long","city_id","province_id","village_id" ,"created_at","id_created"],
          locationSelect:"group_company_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT group_company.* FROM group_company ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["name","contactPhoneNumber","province","city","streetaddr","postCode"];
  }

  
}

module.exports =  GroupCompany;
