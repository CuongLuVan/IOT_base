const TypeModel = require("../middlewareDatabase/TypeModel.js");
const CommonModel = require("../middlewareDatabase/CommonModel.js");
const CustomerAcess= require('../middlewareDatabase/CustomerAcess.js');
/**
 * User model.
 */
class ServiceBill extends CommonModel {
  get tableName() {  return "service_bill";}
  customerAcess(){ 
    return  {edit:CustomerAcess.NOT_ACESS,
             add:CustomerAcess.ONLY_USER,
             view:CustomerAcess.ONLY_USER  }; 
  }

  getNameTable() {
    return "service_bill";
  }
  getTypeTable() {
    return TypeModel.SELL_PRODUCT;
  }

  getFieldToAdd() {
    return {
      valueSetup: ["customer_id", "service_id", "value", "content"]// "bank", "status"],
    };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ["customer_id", "service_id", "value", "content", "created_at", "id_created"],
      locationSelect: "bill_service_id",
      valueSelect: "deleteflag",
      userUpdate: "id_updated",
    };
  }

  getSQLReport(currentUser) {
    return "SELECT service_bill.*,customer.email,service.name FROM service_bill LEFT JOIN customer ON customer.customer_id=service_bill.bill_service_id LEFT JOIN service ON service.service_id=service_bill.service_id ";
    // + defineManifest.checkManifestTableUser(currentUser.permission_id,currentUser.users_id,currentUser.value_manifest));
  }
  getJsonTofind() {
    return ["value", "content"];
  }
}

module.exports = ServiceBill;
