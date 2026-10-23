const crypto = require('crypto');
const qs = require('qs');
const knex = require('../config/knex.js');
const { returnOK, returnFalse, returnNotFound } = require('../utils/returnResponse.js');
const WarningInfo = require('../config/warningInfo.js');

function sortObject(value) {
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = value[key];
    return result;
  }, {});
}

function createSignature(params, secret) {
  const signData = qs.stringify(sortObject(params), { encode: false });
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData, 'utf8')).digest('hex');
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function formatPaymentDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return String(date.getFullYear()) + pad(date.getMonth() + 1) + pad(date.getDate()) +
    pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds());
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) return forwarded.split(',')[0].trim();
  return req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
}

function gatewayConfiguration() {
  return {
    terminalCode: process.env.VNP_TMNCODE,
    hashSecret: process.env.VNP_HASHSECRET,
    paymentUrl: process.env.VNP_URL,
    returnUrl: process.env.VNP_RETURNURL
  };
}

function configuredGateway(config) {
  return Boolean(config.terminalCode && config.hashSecret && config.paymentUrl && config.returnUrl);
}

function createOrderId() {
  return formatPaymentDate(new Date()) + crypto.randomBytes(6).toString('hex');
}

function requestParams(input) {
  const result = {};
  Object.keys(input || {}).forEach((key) => {
    if (key.indexOf('vnp_') === 0 && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      result[key] = input[key];
    }
  });
  return result;
}

function validationError(res, message) {
  return res.status(400).json({ error: { message }, error_code: WarningInfo.VALIDATE_WORNG });
}

async function findPlan(id, type) {
  return knex('service_product_cost')
    .where({ service_product_cost_id: id, type, deleteflag: 0 })
    .first();
}

async function paymentRecordForRequest(orderId, customerId) {
  return knex('service_product_bill')
    .where({ provider_order_id: orderId, id_created: customerId, deleteflag: 0 })
    .first();
}

exports.registerInvoice = async function (req, res) {
  const planId = Number(req.body && req.body.id_invoice);
  const type = Number(req.body && req.body.type);
  if (!Number.isSafeInteger(planId) || planId < 1 || !Number.isSafeInteger(type) || type < 0) {
    return validationError(res, 'A valid service plan is required');
  }

  try {
    const plan = await findPlan(planId, type);
    if (!plan) return returnNotFound(res, { message: 'Service plan not found' }, WarningInfo.DATA_NOT_EXSITING);

    const amount = Number(plan.cost);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      return returnFalse(res, { message: 'Service plan has an invalid price' }, WarningInfo.ERROR_SERVER);
    }

    const orderId = createOrderId();
    const invoice = {
      service_product_cost_id: plan.service_product_cost_id,
      detail_bill: JSON.stringify({ planId: plan.service_product_cost_id, planTitle: plan.title }),
      type: plan.type,
      cost: amount,
      limit: Number(plan.limit) || 0,
      km: 0,
      provider_order_id: orderId,
      payment_status: amount === 0 ? 'PAID' : 'PENDING',
      id_created: req.currentUser.users_id,
      id_updated: req.currentUser.users_id,
      deleteflag: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      paid_at: amount === 0 ? knex.fn.now() : null,
      expires_at: Number(plan.expried_day) > 0 ? knex.raw('DATE_ADD(NOW(), INTERVAL ? DAY)', [Number(plan.expried_day)]) : null
    };

    await knex('service_product_bill').insert(invoice);

    if (amount === 0) {
      return returnOK(res, { orderId, paymentUrl: null, status: 'PAID' });
    }

    const config = gatewayConfiguration();
    if (!configuredGateway(config)) {
      await knex('service_product_bill').where({ provider_order_id: orderId }).update({
        payment_status: 'FAILED',
        updated_at: knex.fn.now()
      });
      return res.status(503).json({ error: { message: 'Payment gateway is not configured' }, error_code: WarningInfo.ERROR_SERVER });
    }

    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: config.terminalCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: 'Service plan ' + plan.service_product_cost_id,
      vnp_OrderType: 'billpayment',
      vnp_Amount: amount * 100,
      vnp_ReturnUrl: config.returnUrl,
      vnp_IpAddr: clientIp(req),
      vnp_CreateDate: formatPaymentDate(new Date())
    };
    params.vnp_SecureHash = createSignature(params, config.hashSecret);

    return returnOK(res, {
      orderId,
      paymentUrl: config.paymentUrl + '?' + qs.stringify(sortObject(params), { encode: false }),
      status: 'PENDING'
    });
  } catch (error) {
    return returnFalse(res, { message: 'Unable to create payment request' }, WarningInfo.ERROR_SERVER);
  }
};

exports.checkInvoice = async function (req, res) {
  const orderId = typeof (req.body && req.body.orderId) === 'string' ? req.body.orderId : '';
  if (!/^[a-zA-Z0-9]{16,64}$/.test(orderId)) return validationError(res, 'A valid order identifier is required');

  try {
    const invoice = await paymentRecordForRequest(orderId, req.currentUser.users_id);
    if (!invoice) return returnNotFound(res, { message: 'Invoice not found' }, WarningInfo.DATA_NOT_EXSITING);
    return returnOK(res, {
      orderId: invoice.provider_order_id,
      status: invoice.payment_status,
      paidAt: invoice.paid_at,
      expiresAt: invoice.expires_at
    });
  } catch (error) {
    return returnFalse(res, { message: 'Unable to check payment status' }, WarningInfo.ERROR_SERVER);
  }
};

async function processGatewayResponse(params) {
  const config = gatewayConfiguration();
  const secureHash = params && params.vnp_SecureHash;
  if (!configuredGateway(config) || !safeEqual(secureHash, createSignature(requestParams(params), config.hashSecret))) {
    return { valid: false, reason: 'Invalid payment signature' };
  }

  const orderId = params.vnp_TxnRef;
  const amount = Number(params.vnp_Amount);
  if (typeof orderId !== 'string' || !/^[a-zA-Z0-9]{16,64}$/.test(orderId) || !Number.isSafeInteger(amount)) {
    return { valid: false, reason: 'Invalid payment response' };
  }

  return knex.transaction(async (trx) => {
    const invoice = await trx('service_product_bill').where({ provider_order_id: orderId, deleteflag: 0 }).first().forUpdate();
    if (!invoice || Number(invoice.cost) * 100 !== amount) return { valid: false, reason: 'Invoice validation failed' };

    const paid = params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00';
    const nextStatus = paid ? 'PAID' : 'FAILED';
    if (invoice.payment_status !== 'PAID') {
      await trx('service_product_bill').where({ service_product_bill_id: invoice.service_product_bill_id }).update({
        payment_status: nextStatus,
        payment_transaction_no: typeof params.vnp_TransactionNo === 'string' ? params.vnp_TransactionNo.slice(0, 64) : null,
        payment_payload: JSON.stringify(requestParams(params)),
        paid_at: paid ? trx.fn.now() : null,
        updated_at: trx.fn.now()
      });
    }
    return { valid: true, paid, orderId };
  });
}

exports.paymentReturn = async function (req, res) {
  try {
    const result = await processGatewayResponse(req.query || {});
    if (!result.valid) return res.status(400).send('Invalid payment response');
    const status = result.paid ? 'success' : 'failed';
    return res.redirect('/service_detail?order=' + encodeURIComponent(result.orderId) + '&payment=' + status);
  } catch (error) {
    return res.status(500).send('Unable to process payment response');
  }
};

exports.checkStatusInvoice = async function (req, res) {
  try {
    const source = Object.keys(req.body || {}).length ? req.body : req.query;
    const result = await processGatewayResponse(source || {});
    if (!result.valid) return res.status(400).json({ RspCode: '97', Message: result.reason });
    return res.status(200).json({ RspCode: '00', Message: result.paid ? 'Confirm Success' : 'Payment failed' });
  } catch (error) {
    return res.status(500).json({ RspCode: '99', Message: 'Unknown error' });
  }
};
