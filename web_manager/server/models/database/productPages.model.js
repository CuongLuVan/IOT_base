const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ProductPages extends CommonModel {
  get tableName() {  return "product_pages";}
  getNameTable(){ return 'product_pages';}
  getTypeTable(){ return TypeModel.NEWS;}
  customerAcess(){ 
    return  {edit:CustomerAcess.ALL,
             add:CustomerAcess.ALL,
             view:CustomerAcess.ALL  }; 
  }
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["product_id","filesave"]
      };
  }
  getFieldToDelete(){
      return {
          arrayCoppy:["product_id","filesave","created_at","id_created"],
          locationSelect:"product_pages_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT product_pages.*,product.name FROM product_pages  LEFT JOIN product  ON product_pages.product_id=product.product_id  ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["product_id","filesave"];
  }

}

module.exports =  ProductPages;
