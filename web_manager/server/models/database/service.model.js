const TypeModel = require("../middlewareDatabase/TypeModel.js");
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class Service extends CommonModel {
  get tableName() {  return "service";}
  getNameTable() {
    return "service";
  }
  getTypeTable() {
    return TypeModel.SELL_PRODUCT;
  }
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.NOT_ACESS,
             view:CustomerAcess.ALL  }; 
  }
  getFieldToAdd() {
    return {
      valueSetup: ["name", "content", "image", "cost", "downloads","service_group_id"],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["name", "content","image", "cost","downloads","service_group_id","created_at", "id_created"],
      locationSelect: "service_id",
      valueSelect: "deleteflag",
      userUpdate: "id_updated",
    };
  }

  getSQLReport(currentUser) {
    return "SELECT service.*,service_group.title FROM service LEFT JOIN service_group on service_group.service_group_id=service.service_group_id ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return ["name", "content", "image","cost", "downloads"];
  }
}

module.exports = Service;
