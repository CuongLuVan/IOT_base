const express = require('express');
const  socialCtrl = require('../controllers/social.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');
const validate = require('../config/joi.validate.js');
const schema = require('../utils/validator.js');
const router = express.Router();
const isAuthenticatedCustomer = require('../middlewares/authenticateCustomer.js');
const multer = require('multer');
const files = require('../utils/files.js');
const { uploadLimiter } = require('../config/rateLimit.js');

const upload = multer({
	storage: files.storage,
	limits: files.uploadLimits,
	fileFilter: files.excelFilter
});

router.route('/check_email').post(socialCtrl.checkEmailRegister);
router.route('/stock_import').post(uploadLimiter, isAuthenticatedCustomer, files.handleUpload(upload.single('file')), socialCtrl.stockImport);
router.route('/stock_report').post(isAuthenticatedCustomer,socialCtrl.stockReportValue);

module.exports =  router;
