const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');

/**
 * User model.
 */
class AdvertisementProduct extends CommonModel {

  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }
/*
  verifyPassword(password) {
    return this.get('password') === password;
  } */
  get tableName() {  return "advertisement_product";}
  getNameTable(){ return 'advertisement_product';}
  getTypeTable(){ return TypeModel.NEWS;}
  //	group_content_id	group_file	filesave	title	content	content_img
  getFieldToAdd(){
      return {
          valueSetup: ["group_product_id","filesave","title","content","content_img","land_image","set_to_fist"]
      };
  }

  getFieldToDelete(){
      return {
          arrayCoppy:["group_product_id","filesave","title","content","content_img","land_image","set_to_fist","created_at","id_created"],
          locationSelect:"advertisement_product_id",
          valueSelect:"deleteflag",
          userUpdate:"id_updated"
      };
  }
  
  
  getSQLReport(currentUser){
      return ('SELECT advertisement_product.*,product_group.product_group_content FROM advertisement_product LEFT JOIN product_group on product_group.product_group_id=advertisement_product.group_product_id ');
       //   + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind(){
      return ["title","content"];
  }

}

module.exports =  AdvertisementProduct;
