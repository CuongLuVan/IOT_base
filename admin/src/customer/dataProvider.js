// Customer screens call their narrowly scoped Customer API directly. Keeping a
// rejecting data provider prevents a new resource from accidentally using the
// Admin JSON-server endpoint.
const unsupported = () => Promise.reject(new Error('Customer resources must use the Customer API.'));

export default {
  getList: unsupported,
  getOne: unsupported,
  getMany: unsupported,
  getManyReference: unsupported,
  create: unsupported,
  update: unsupported,
  updateMany: unsupported,
  delete: unsupported,
  deleteMany: unsupported
};

