const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');


class Company extends CommonModel {
  get tableName() {  return "company";}
  getNameTable(){ return 'company';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["companyname","company_short","adresss","phone","icon_company","top","fax"]
      };
  }
  getFieldLinkShort(){
    return { valueSetup:"companyname",data:"company_short" } ;
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["companyname","company_short","adresss","phone","icon_company","top","fax","created_at","id_created"],
          locationSelect:"company_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  getValidate(){
    return { 
      //"companyname","adresss","phone","icon_company","top","fax"
        companyname:{type:"string" ,length:2,name :" Tên công ty "},
        company_short:{type:"string" ,length:2,name :" địa chỉ truy cập "},
        adresss:{type:"string" ,length:5,name :" Địa chỉ "},
        icon_company:{type:"string" ,length:10,name :" Icon link "},
        phone:{type:"phone" ,length:7,name :" số điện thoại "},
    };
  }
  
  getSQLReport(currentUser){
      return ('SELECT company.* FROM company ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["companyname","adresss","phone","fax"];
  }


  
}

module.exports =  Company;
