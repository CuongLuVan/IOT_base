const express = require('express');
const  userCtrl = require('../controllers/user.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');
const authenticateCustomer = require('../middlewares/authenticateCustomer.js')
const acessReadTable = require('../middlewares/acessReadTable.js');
const validate = require('../config/joi.validate.js');
const schema = require('../utils/validator.js');

const router = express.Router();

  router.route('/report').post(isAuthenticated,acessReadTable,userCtrl.getTableData);
  router.route('/report-by-group').post(isAuthenticated,acessReadTable, userCtrl.getTableDataByGroup);
  router.route('/report-page').post(isAuthenticated,acessReadTable,userCtrl.getNumberPages);
  router.route('/manager_add').post(isAuthenticated,acessReadTable,userCtrl.addDataToTable);
  router.route('/manager_delete').post(isAuthenticated,acessReadTable, userCtrl.deleteData);  
  router.route('/manager_update').post(isAuthenticated,acessReadTable, userCtrl.updateData);
  router.route('/fist_pages').post(isAuthenticated, userCtrl.updateFistPages);
  router.route('/register').post( userCtrl.registerUser);
  router.route('/lst_user').get(isAuthenticated,userCtrl.getAllUserTochat);
  // router.route('/list_user_comment').get(authenticateCustomer,userCtrl.getAllUserToComment);
  router.route('/list_user_comment').get(userCtrl.getAllUserToComment);
  router.route('/get_image_product').post(isAuthenticated,userCtrl.getInfoImageInfoId);
  router.route('/get_all_product_of_company').post(isAuthenticated,userCtrl.getProductByCompany);
  router.route('/get_all_image_of_product').post(isAuthenticated,userCtrl.getProductImageByCompany);

  router.route('/report_admin/buy_lastday').post(isAuthenticated,userCtrl.getLastdayProductBuy);
  router.route('/report_admin/buy_all').post(isAuthenticated,userCtrl.getAllDataYearProductBuy);

  router.route('/get_approved').get(isAuthenticated,userCtrl.getAllDataApprovedInfo);
  router.route('/set_approved').post(isAuthenticated,userCtrl.setDataApprovedInfo);
  router.route('/set_approved_company').post(isAuthenticated,userCtrl.setApprovedCompany);
  router.route('/get-tag-name').post(userCtrl.getTagName);

  router.route('/report-detail').post(isAuthenticated,acessReadTable,userCtrl.getTableDetailInfo);
  router.route('/report-special').post(isAuthenticated,userCtrl.getReportSpecial);
  
module.exports =  router;
