const TypeModel = require("../middlewareDatabase/TypeModel.js");
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class StockName extends CommonModel {
  get tableName() {  return 'stock_name';}
  getNameTable() {
    return "stock_name";
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
      valueSetup: ["stockname", "company", "note"],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["stockname", "company", "note","created_at", "id_created"],
      locationSelect: "stock_id",
      valueSelect: "deleteflag",
      userUpdate: "id_updated",
    };
  }

  getSQLReport(currentUser) {
    return "SELECT stock_name.*  FROM stock_name ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return ["stockname", "company", "note"];
  }
}

module.exports = StockName;
