const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ProductLost extends CommonModel {
  get tableName() {  return "product_lost";}
  getNameTable(){ return  'product_lost';}
  getTypeTable(){ return TypeModel.SELL_PRODUCT;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
  getFieldToAdd(){
      return {
          valueSetup: ["image_id","company_id","content","number","contain","expridate"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["image_id","company_id","content","number","contain","expridate","created_at","id_created"],
          locationSelect:"stord_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product_lost.* ,company.companyname,product_image.name_image_detail FROM product_lost LEFT JOIN company on company.company_id=product_lost.company_id LEFT JOIN product_image on product_image.image_id=product_lost.image_id  ');
         // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["product_id","content","number","contain"];
  }


}

module.exports =  ProductLost;
