const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ProductBuyReturn extends CommonModel {
  get tableName() {  return "product_buy_return";}
  getNameTable(){ return 'product_buy_return';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["buyproduct_id","content","status","cost_confirm","user_comfirm","customer_id"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["buyproduct_id","content","status","cost_confirm","user_comfirm","customer_id","created_at","id_created"],
          locationSelect:"product_buy_return_id",
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

module.exports =  ProductBuyReturn;
