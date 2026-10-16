const TypeModel = require('../middlewareDatabase/TypeModel.js');
const CustomerAccess = require('../middlewareDatabase/CustomerAcess.js');
const CommonModel = require('../middlewareDatabase/CommonModel.js');

class ServiceProductBill extends CommonModel {
  static get tableName() { return 'service_product_bill'; }
  getNameTable() { return 'service_product_bill'; }
  getTypeTable() { return TypeModel.SELL_PRODUCT; }
  customerAcess() {
    return { edit: CustomerAccess.ONLY_USER, add: CustomerAccess.ONLY_USER, view: CustomerAccess.ONLY_USER };
  }
  getFieldToAdd() {
    return { valueSetup: ['service_product_cost_id', 'detail_bill', 'type', 'cost', 'limit', 'km'] };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ['service_product_cost_id', 'detail_bill', 'type', 'cost', 'limit', 'km', 'created_at', 'id_created'],
      locationSelect: 'service_product_bill_id',
      valueSelect: 'deleteflag',
      userUpdate: 'id_updated'
    };
  }
  getSQLReport() { return 'SELECT service_product_bill.* FROM service_product_bill '; }
  getJsonTofind() { return ['detail_bill', 'provider_order_id', 'payment_status']; }
}

module.exports = ServiceProductBill;
