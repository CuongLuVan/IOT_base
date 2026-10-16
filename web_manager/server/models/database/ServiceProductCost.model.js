const TypeModel = require('../middlewareDatabase/TypeModel.js');
const CustomerAccess = require('../middlewareDatabase/CustomerAcess.js');
const CommonModel = require('../middlewareDatabase/CommonModel.js');

class ServiceProductCost extends CommonModel {
  static get tableName() { return 'service_product_cost'; }
  getNameTable() { return 'service_product_cost'; }
  getTypeTable() { return TypeModel.SELL_PRODUCT; }
  customerAcess() {
    return { edit: CustomerAccess.ONLY_USER, add: CustomerAccess.ONLY_USER, view: CustomerAccess.ONLY_USER };
  }
  getFieldToAdd() {
    return { valueSetup: ['type', 'cost', 'limit', 'title', 'content', 'cost_info', 'detail', 'expried_day'] };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ['type', 'cost', 'limit', 'title', 'content', 'cost_info', 'detail', 'expried_day', 'created_at', 'id_created'],
      locationSelect: 'service_product_cost_id',
      valueSelect: 'deleteflag',
      userUpdate: 'id_updated'
    };
  }
  getSQLReport() { return 'SELECT service_product_cost.* FROM service_product_cost '; }
  getJsonTofind() { return ['title', 'content', 'cost_info', 'detail']; }
}

module.exports = ServiceProductCost;
