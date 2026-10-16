const TypeModel = require('../middlewareDatabase/TypeModel.js');
const CustomerAccess = require('../middlewareDatabase/CustomerAcess.js');
const CommonModel = require('../middlewareDatabase/CommonModel.js');

class ServiceProductLimit extends CommonModel {
  static get tableName() { return 'service_product_limit'; }
  getNameTable() { return 'service_product_limit'; }
  getTypeTable() { return TypeModel.SELL_PRODUCT; }
  customerAcess() {
    return { edit: CustomerAccess.ONLY_USER, add: CustomerAccess.ONLY_USER, view: CustomerAccess.ONLY_USER };
  }
  getFieldToAdd() {
    return { valueSetup: ['service_product_cost_id', 'customer_id', 'type', 'cost', 'limit'] };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ['service_product_cost_id', 'customer_id', 'type', 'cost', 'limit', 'created_at', 'id_created'],
      locationSelect: 'service_product_limit_id',
      valueSelect: 'deleteflag',
      userUpdate: 'id_updated'
    };
  }
  getSQLReport() { return 'SELECT service_product_limit.* FROM service_product_limit '; }
  getJsonTofind() { return ['customer_id', 'service_product_cost_id']; }
}

module.exports = ServiceProductLimit;
