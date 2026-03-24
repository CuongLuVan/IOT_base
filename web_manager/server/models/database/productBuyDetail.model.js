const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ProductBuyDetail extends CommonModel {
  get tableName() {  return "product_buy_detail";} 
  getNameTable(){ return 'product_buy_detail';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd=()=>{
      return {
          valueSetup: ["buyproduct_id","image_id","quantity","KM"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["buyproduct_id","image_id","quantity","KM","created_at","id_created"],
          locationSelect:"id_buy_detail",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product_buy_detail.* ,product_image.name_image_detail,product_image.image_info_detail,product_image.cost_detail FROM product_buy_detail LEFT JOIN product_image on product_image.image_id=product_buy_detail.image_id ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["product_image","quantity","KM"];
  }

}

module.exports =  ProductBuyDetail;
