const TypeModel = require("../middlewareDatabase/TypeModel.js");
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ServiceGroup extends CommonModel {
  get tableName() {  return "service_group";}
  getNameTable() {
    return "service_group";
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
      valueSetup: ["image", "title", "content","company_id"],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["image", "title", "content","company_id","created_at", "id_created"],
      locationSelect: "service_group_id",
      valueSelect: "deleteflag",
      userUpdate: "id_updated",
    };
  }

  getSQLReport(currentUser) {
    return "SELECT service_group.* FROM service_group ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return ["title", "content"];
  }
}

module.exports = ServiceGroup;
