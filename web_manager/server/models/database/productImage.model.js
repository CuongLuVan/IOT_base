const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');


class ProductImage extends CommonModel {
  get tableName() {  return "product_image";}
  getNameTable(){ return 'product_image';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }

  getFieldToAdd(){
      return {
          valueSetup: ["product_id","name_image_detail","image_info_detail","cost_detail","cost_real","promotion"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["product_id","name_image_detail","image_info_detail","cost_detail","cost_real","promotion","created_at","id_created"],
          locationSelect:"image_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product_image.* FROM product_image ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["product_id","name_image_detail","image_info_detail","cost_detail","cost_real","promotion"];
  }

  
}

module.exports =  ProductImage;
