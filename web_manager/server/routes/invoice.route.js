const express = require('express');
const invoiceController = require('../controllers/invoice.controller.js');
const authenticateCustomer = require('../middlewares/authenticateCustomer.js');
const { authLimiter } = require('../config/rateLimit.js');

const router = express.Router();

router.post('/register_invoice', authLimiter, authenticateCustomer, invoiceController.registerInvoice);
router.post('/check_invoice', authenticateCustomer, invoiceController.checkInvoice);
router.get('/payment-return', invoiceController.paymentReturn);
router.get('/check_invoice', invoiceController.paymentReturn);
router.get('/check_status_invoice', invoiceController.checkStatusInvoice);
router.post('/check_status_invoice', invoiceController.checkStatusInvoice);

module.exports = router;
