const fs = require('fs');
const path = require('path');
const knex = require('../config/knex.js');
const nodemailer = require('nodemailer');
const { returnOK, returnFalse, returnNotFound } = require('../utils/returnResponse.js');
const WarningInfo = require('../config/warningInfo.js');

const documentTypes = new Set(['CCCD', 'PASSPORT', 'BUSINESS_LICENSE', 'EXPORT_CERT', 'OTHER']);
const documentStatuses = new Set(['APPROVED', 'REJECTED']);

function responseValidationError(res, message) {
  return res.status(400).json({ error: { message }, error_code: WarningInfo.VALIDATE_WORNG });
}

function safeOptionalText(value, maximum) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maximum) return undefined;
  return value.trim();
}

function safeUploadPath(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 255) return undefined;
  const normalized = value.trim();
  if (!/^\/uploads\/[a-zA-Z0-9._/-]+$/.test(normalized) || normalized.includes('..')) return undefined;
  return normalized;
}

function renderTemplate(templateName, data) {
  const filePath = path.join(__dirname, '../template', templateName + '.hbs');
  const source = fs.readFileSync(filePath, 'utf8');
  return source
    .replace(/{{fullName}}/g, data.fullName || '')
    .replace(/{{reason}}/g, data.reason || '')
    .replace(/{{systemName}}/g, process.env.SYSTEM_NAME || 'IoT Manager')
    .replace(/{{systemUrl}}/g, process.env.SYSTEM_URL || process.env.APP_LINK_STORGATE || '');
}

async function notifyCustomer(templateName, customer, reason) {
  if (!process.env.MAIL_CLIENT_INFO || !process.env.MAIL_PASS_INFO || !customer.email) return;
  const content = renderTemplate(templateName, { fullName: customer.fullname, reason });
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.MAIL_CLIENT_INFO, pass: process.env.MAIL_PASS_INFO }
  });
  await transporter.sendMail({
    from: process.env.MAIL_CLIENT_INFO,
    to: customer.email,
    subject: 'Document verification update',
    text: content
  });
}

exports.uploadDocument = async function (req, res) {
  const body = req.body || {};
  if (!documentTypes.has(body.document_type)) return responseValidationError(res, 'Invalid document type');

  const documentNumber = safeOptionalText(body.document_number, 100);
  const documentName = safeOptionalText(body.document_name, 255);
  const imageFront = safeUploadPath(body.image_front);
  const imageBack = safeUploadPath(body.image_back);
  if ([documentNumber, documentName, imageFront, imageBack].some((value) => value === undefined)) {
    return responseValidationError(res, 'Invalid document data');
  }
  if (!imageFront && !imageBack) return responseValidationError(res, 'At least one document image is required');

  try {
    const inserted = await knex('customer_documents').insert({
      customer_id: req.currentUser.users_id,
      document_type: body.document_type,
      document_number: documentNumber,
      document_name: documentName,
      image_front: imageFront,
      image_back: imageBack,
      status: 'PENDING',
      reject_reason: null,
      id_created: req.currentUser.users_id,
      id_updated: req.currentUser.users_id,
      deleteflag: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    });
    return returnOK(res, { customer_documents_id: inserted[0], status: 'PENDING' });
  } catch (error) {
    return returnFalse(res, { message: 'Unable to submit verification document' }, WarningInfo.ERROR_SERVER);
  }
};

exports.listPendingDocuments = async function (req, res) {
  try {
    const rows = await knex('customer_documents as document')
      .join('customer as customer', 'customer.customer_id', 'document.customer_id')
      .where('document.status', 'PENDING')
      .where('document.deleteflag', 0)
      .select(
        'document.customer_documents_id',
        'document.customer_id',
        'document.document_type',
        'document.document_number',
        'document.document_name',
        'document.image_front',
        'document.image_back',
        'document.created_at',
        'customer.fullname',
        'customer.email',
        'customer.phone'
      )
      .orderBy('document.created_at', 'asc');
    return returnOK(res, rows);
  } catch (error) {
    return returnFalse(res, { message: 'Unable to load verification documents' }, WarningInfo.ERROR_SERVER);
  }
};

exports.reviewDocument = async function (req, res) {
  const id = Number(req.params.id || (req.body && req.body.customer_documents_id));
  const status = req.body && req.body.status;
  const rejectReason = safeOptionalText(req.body && req.body.reject_reason, 255);
  if (!Number.isSafeInteger(id) || id < 1 || !documentStatuses.has(status) || rejectReason === undefined) {
    return responseValidationError(res, 'Invalid document review');
  }
  if (status === 'REJECTED' && !rejectReason) return responseValidationError(res, 'A rejection reason is required');

  try {
    const document = await knex.transaction(async (trx) => {
      const record = await trx('customer_documents as document')
        .join('customer as customer', 'customer.customer_id', 'document.customer_id')
        .where('document.customer_documents_id', id)
        .where('document.deleteflag', 0)
        .select('document.customer_documents_id', 'customer.fullname', 'customer.email')
        .first()
        .forUpdate();
      if (!record) return null;

      await trx('customer_documents')
        .where('customer_documents_id', id)
        .update({
          status,
          reject_reason: status === 'REJECTED' ? rejectReason : null,
          id_updated: req.currentUser.users_id,
          updated_at: trx.fn.now()
        });
      return record;
    });

    if (!document) return returnNotFound(res, { message: 'Document not found' }, WarningInfo.DATA_NOT_EXSITING);
    try {
      await notifyCustomer(status === 'APPROVED' ? 'approved' : 'rejected', document, rejectReason);
    } catch (mailError) {
      // The review has been committed; do not disclose mail configuration details.
    }
    return returnOK(res, { customer_documents_id: id, status });
  } catch (error) {
    return returnFalse(res, { message: 'Unable to review verification document' }, WarningInfo.ERROR_SERVER);
  }
};
