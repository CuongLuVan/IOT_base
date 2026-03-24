const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

/**
 * User model.
 */
class ProductBack extends CommonModel {

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  get tableName() {  return "product_back";}
  getNameTable(){ return 'product_back';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  
  getFieldToAdd(){
      return {
          valueSetup: ["product_id","quantity","KM"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["product_id","quantity","KM" ,"created_at","id_created"],
          locationSelect:"buyproduct_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  

  getSQLReport(currentUser){
      return ('SELECT product_back.*,product.name FROM product_back LEFT JOIN product ON product.product_id=product_back.product_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["quantity","KM"];
  }

  
}

module.exports =  ProductBack;
