const TypeModel= require('../middlewareDatabase/TypeModel.js');
const CommonModel= require('../middlewareDatabase/CommonModel.js');
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ProductGroup extends CommonModel {
    get tableName() {  return "product_group";}
    getNameTable(){ return 'product_group';}
    getTypeTable(){ return TypeModel.SELL_PRODUCT;}
    customerAcess(){ 
        return  {edit:CustomerAcess.ONLY_USER,
                add:CustomerAcess.ONLY_USER,
                view:CustomerAcess.ONLY_USER  }; 
    }
    getFieldToAdd(){
        return {
            valueSetup: ["product_group_content"]
        };
    }
    getFieldToDelete(){
        return {
            arrayCoppy:["product_group_content","created_at","id_created"],
          	locationSelect:"product_group_id",
            valueSelect:"deleteflag",
            userUpdate:"id_updated"
        };
    }
    
    
    getSQLReport(currentUser){
        return ('SELECT product_group.* FROM product_group ');
            // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
    }
    getJsonTofind(){
        return ["product_group_content"];
    }

}

module.exports =  ProductGroup;
