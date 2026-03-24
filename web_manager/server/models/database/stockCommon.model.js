const TypeModel = require("../middlewareDatabase/TypeModel.js");
var TABLE_NAME = "stock_common";
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class StockCommon extends CommonModel {
  get tableName() {  return TABLE_NAME;}
  getNameTable() {
    return TABLE_NAME;
  }
  setNameTable(name) {
    TABLE_NAME=name;
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
      valueSetup: ["date", "open","high","low","close","volume" ],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["date", "open","high","low","close","volume"],
      locationSelect: "date",
      valueSelect: "",
      userUpdate: "",
    };
  }

  getSQLReport() {
    return "SELECT stock_info_"+TABLE_NAME+".*  FROM stock_info_"+TABLE_NAME+" ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getSQLStock(table,startTime=null,endTime=null) {
    var SqlQuerry= "SELECT "+table+".*  FROM "+table;
    var enableStart = false;
    if(startTime!=null) {
      SqlQuerry = SqlQuerry + " where date>" +startTime;
      enableStart = true;
    }
    if(endTime!=null){
      if(enableStart){
        SqlQuerry = SqlQuerry + " where ";
      }
      else {
        SqlQuerry = SqlQuerry + " and ";
      }
      SqlQuerry = SqlQuerry + " date < "+endTime;
    }
    return SqlQuerry;
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return [ "open","high","low","close","volume"];
  }
}

module.exports = StockCommon;
