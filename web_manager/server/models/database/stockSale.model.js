const TypeModel = require("../middlewareDatabase/TypeModel.js");
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class StockSale extends CommonModel {
  get tableName() {  return 'stock_sale';}
  getNameTable() {
    return  "stock_sale";
  }
  getTypeTable() {
    return TypeModel.SELL_PRODUCT;
  }
  customerAcess(){ 
    return  {edit:CustomerAcess.ONLY_USER,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ALL  }; 
  }
  getFieldToAdd() {
    return {
      valueSetup: ["stock_id", "customer_buy", "number","cost","user_approved_id","note"],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["stock_id", "customer_buy", "number","cost","user_approved_id","note","created_at", "id_created"],
      locationSelect: "stock_sale_id",
      valueSelect: "deleteflag",
      userUpdate: "id_updated",
    };
  }

  getSQLReport(currentUser) {
    return "SELECT stock_sale.*  FROM stock_sale ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return ["customer_buy", "number","cost","note"];
  }
}

module.exports = StockSale;
