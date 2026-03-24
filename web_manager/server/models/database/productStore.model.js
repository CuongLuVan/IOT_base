const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ProductStore extends CommonModel {
  get tableName() {  return "product_store";}
  getNameTable(){ return 'product_store';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["product_id","company_id","content","image_id","number","contain","expridate","addr_id","city_id","province_id","village_id"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["product_id","company_id","content","image_id","number","contain","expridate","addr_id","city_id","province_id","village_id","created_at","id_created"],
          locationSelect:"store_product_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product_store.* ,company.companyname,product.name FROM product_store LEFT JOIN company on company.company_id=product_store.company_id LEFT JOIN product on product.product_id=product_store.store_product_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["product_id","content","number"];
  }


 
}

module.exports =  ProductStore;
