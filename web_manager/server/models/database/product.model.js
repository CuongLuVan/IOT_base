const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class Product extends CommonModel {
  get tableName() {  return "product";}
  getNameTable(){ return 'product';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["company_id","name_short","name","detail","image","store","product_group_id","level"]
      };
  }

  getFieldLinkShort(){
    return { valueSetup:"name",data:"name_short" } ;
  }

  getFieldToDelete(){
      return {
          arrayCoppy:["company_id","name_short","name","detail","image","store","product_group_id","level","created_at","id_created"],
          locationSelect:"product_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product.*,company.companyname FROM product LEFT JOIN company on company.company_id=product.company_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["name","detail","image","store"];
  }

}

module.exports =  Product;
