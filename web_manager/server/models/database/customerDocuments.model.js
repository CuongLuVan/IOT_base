const TypeModel = require('../middlewareDatabase/TypeModel.js');
const CustomerAccess = require('../middlewareDatabase/CustomerAcess.js');
const CommonModel = require('../middlewareDatabase/CommonModel.js');

class CustomerDocuments extends CommonModel {
  static get tableName() { return 'customer_documents'; }
  getNameTable() { return 'customer_documents'; }
  getTypeTable() { return TypeModel.SELL_PRODUCT; }
  customerAcess() {
    return { edit: CustomerAccess.ONLY_USER, add: CustomerAccess.ONLY_USER, view: CustomerAccess.ONLY_USER };
  }
  getFieldToAdd() {
    return { valueSetup: ['document_type', 'document_number', 'document_name', 'image_front', 'image_back', 'status', 'reject_reason'] };
  }
  getFieldToDelete() {
    return {
      arrayCoppy: ['document_type', 'document_number', 'document_name', 'image_front', 'image_back', 'status', 'reject_reason', 'created_at', 'id_created'],
      locationSelect: 'customer_documents_id',
      valueSelect: 'deleteflag',
      userUpdate: 'id_updated'
    };
  }
  getSQLReport() { return 'SELECT customer_documents.* FROM customer_documents '; }
  getJsonTofind() { return ['document_type', 'document_number', 'document_name', 'status']; }
}

module.exports = CustomerDocuments;
