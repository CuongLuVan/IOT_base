const TypeModel = require("../middlewareDatabase/TypeModel.js");
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ServicePages extends CommonModel {
  get tableName() {  return "service_pages";}
  getNameTable() {
    return "service_pages";
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
      valueSetup: ["service_group_id", "filesave"],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["service_group_id", "filesave","created_at", "id_created"],
      locationSelect: "service_id",
      valueSelect: "deleteflag",
      userUpdate: "id_updated",
    };
  }

  getSQLReport(currentUser) {
    return "SELECT service_pages.*,service_group.title FROM service_pages  LEFT JOIN service_group ON service_group.service_group_id=service_pages.service_group_id ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return ["filesave"];
  }
}

module.exports = ServicePages;
