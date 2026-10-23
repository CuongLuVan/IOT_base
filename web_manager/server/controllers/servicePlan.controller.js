const knex = require('../config/knex.js');
const { mangerModelUser } = require('../models/database/managerAll.model.js');
const { returnOK, returnNotFound, returnFalse, returnInfoQuery } = require('../utils/returnResponse.js');
const WarningInfo = require('../config/warningInfo.js');

function readInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) return fallback;
  return parsed;
}

function activeSubscriptionQuery(customerId) {
  return knex('service_product_bill as bill')
    .join('service_product_cost as plan', 'plan.service_product_cost_id', 'bill.service_product_cost_id')
    .where('bill.id_created', customerId)
    .where('bill.deleteflag', 0)
    .where('plan.deleteflag', 0)
    .where('bill.payment_status', 'PAID')
    .where(function () {
      this.whereNull('bill.expires_at').orWhere('bill.expires_at', '>', knex.fn.now());
    });
}

exports.getPlans = async function (req, res) {
  try {
    const plans = await knex('service_product_cost')
      .select('service_product_cost_id', 'type', 'cost', 'limit', 'title', 'content', 'cost_info', 'detail', 'expried_day')
      .where('deleteflag', 0)
      .orderBy('service_product_cost_id', 'asc');
    return returnOK(res, plans);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to load service plans' }, WarningInfo.ERROR_SERVER);
  }
};

exports.getCustomerPlans = async function (req, res) {
  try {
    const plans = await activeSubscriptionQuery(req.currentUser.users_id)
      .select(
        'bill.service_product_bill_id',
        'bill.provider_order_id',
        'bill.payment_status',
        'bill.cost',
        'bill.limit',
        'bill.expires_at',
        'plan.title',
        'plan.content',
        'plan.cost_info'
      )
      .orderBy('bill.created_at', 'desc');
    return returnOK(res, plans);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to load customer service plans' }, WarningInfo.ERROR_SERVER);
  }
};

exports.listServiceCatalog = async function (req, res) {
  try {
    const start = readInteger(req.body && req.body.start, 0, 0, 1000000);
    const end = readInteger(req.body && req.body.end, 10, 1, 100);
    const countOnly = Boolean(req.body && req.body.count_data);

    if (countOnly) {
      const row = await knex('service_group').where('deleteflag', 0).count({ number_store: 'service_group_id' }).first();
      return returnOK(res, [{ number_store: Number(row.number_store || 0) }]);
    }

    const services = await knex('service_group as group')
      .leftJoin('service as service', function () {
        this.on('service.service_group_id', '=', 'group.service_group_id').andOn('service.deleteflag', '=', knex.raw('?', [0]));
      })
      .where('group.deleteflag', 0)
      .groupBy('group.service_group_id', 'group.image', 'group.title', 'group.content')
      .select('group.service_group_id', 'group.image', 'group.title', 'group.content')
      .min({ cost: 'service.cost' })
      .orderBy('group.service_group_id', 'desc')
      .limit(end)
      .offset(start);

    return returnOK(res, services);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to load services' }, WarningInfo.ERROR_SERVER);
  }
};

exports.getServiceDetail = async function (req, res) {
  const serviceGroupId = readInteger((req.query && req.query.type) || (req.body && req.body.type), null, 1, Number.MAX_SAFE_INTEGER);
  if (!serviceGroupId) return returnNotFound(res, { message: 'Invalid service identifier' }, WarningInfo.WORNG_FORMAT);

  try {
    const services = await knex('service_group as group')
      .leftJoin('service as service', function () {
        this.on('service.service_group_id', '=', 'group.service_group_id').andOn('service.deleteflag', '=', knex.raw('?', [0]));
      })
      .leftJoin('service_pages as pages', function () {
        this.on('pages.service_group_id', '=', 'group.service_group_id').andOn('pages.deleteflag', '=', knex.raw('?', [0]));
      })
      .where('group.deleteflag', 0)
      .where('group.service_group_id', serviceGroupId)
      .select(
        'group.image',
        'group.title',
        'group.content',
        'group.company_id',
        'service.service_id',
        'service.name',
        'service.content as service_content',
        'service.image as service_image',
        'service.cost',
        'pages.filesave'
      );

    return returnOK(res, services);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to load service details' }, WarningInfo.ERROR_SERVER);
  }
};

exports.searchServices = async function (req, res) {
  const term = typeof (req.body && req.body.nameLocation) === 'string' ? req.body.nameLocation.trim().slice(0, 100) : '';
  if (term.length < 2) return returnOK(res, []);

  try {
    const pattern = '%' + term + '%';
    const services = await knex('service_group as group')
      .leftJoin('service as service', function () {
        this.on('service.service_group_id', '=', 'group.service_group_id').andOn('service.deleteflag', '=', knex.raw('?', [0]));
      })
      .where('group.deleteflag', 0)
      .where(function () {
        this.where('group.title', 'like', pattern).orWhere('group.content', 'like', pattern);
      })
      .groupBy('group.service_group_id', 'group.image', 'group.title', 'group.content')
      .select('group.service_group_id', 'group.image', 'group.title', 'group.content')
      .min({ cost: 'service.cost' })
      .limit(100);

    return returnOK(res, services);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to search services' }, WarningInfo.ERROR_SERVER);
  }
};

exports.addProductWithEntitlement = async function (req, res) {
  try {
    const productModel = mangerModelUser('product');
    if (!productModel || !productModel.checkDataAddDatabaseCustomer(req.currentUser.permission_id)) {
      return returnNotFound(res, { message: 'Product creation is not permitted' }, WarningInfo.NOT_ACESS_DATABASE);
    }

    const usage = await knex('product')
      .where({ id_created: req.currentUser.users_id, deleteflag: 0 })
      .count({ current: 'product_id' })
      .first();
    const entitlement = await activeSubscriptionQuery(req.currentUser.users_id).sum({ maximum: 'bill.limit' }).first();
    const current = Number(usage.current || 0);
    const maximum = Number(entitlement.maximum || 0);

    if (current >= maximum) {
      return res.status(403).json({
        error: { message: 'Active service plan limit reached', max: maximum, current },
        error_code: WarningInfo.NOT_ACESS_DATABASE
      });
    }

    const shortName = productModel.getFieldLinkShort();
    if (shortName) {
      req.body[shortName.data] = await productModel.getTagName(
        productModel.getNameTable(),
        shortName.data,
        req.body[shortName.valueSetup]
      );
    }
    const result = await productModel.checkSqlAddAdmin(req, req.body);
    return returnInfoQuery(res, result);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to add product under service plan' }, WarningInfo.ERROR_SERVER);
  }
};
