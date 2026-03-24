const express = require('express');
const fs = require('fs');
const  customerCtrl = require('../controllers/customer.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');
const isAuthenticatedCustomer = require('../middlewares/authenticateCustomer.js');
const acessReadTable = require('../middlewares/acessReadTable.js');
const registerNewCustomer = require('../middlewares/registerCustomer.js');
const schema = require('../utils/validator.js');
const validate = require('../config/joi.validate.js');
const {checkRegisterInfo,checkRegisterCompany} = require('../utils/Validate.js');


const router = express.Router();
const multer = require('multer');
const files = require('../utils/files.js');
const urlStaticLink=  require('../config/urlSetting.js');


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = 'public/uploads/datas';
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    cb(null, folder);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

let upload = multer({ storage: storage, fileFilter: files.excelFilter });

router.route('/import-data').post(isAuthenticatedCustomer, upload.single('file'), customerCtrl.importDataInfo);

let uploadImage = multer({ storage: storage, fileFilter: files.imageFilter });

router.route('/import-image-admin').post(isAuthenticated, uploadImage.single('file'), customerCtrl.importDataInfo);
router.route('/import-image').post(uploadImage.single('file'), customerCtrl.importDataInfo);
router.route('/import-image-customer').post(uploadImage.single('file'), customerCtrl.importDataInfo);




router.route('/report').post(isAuthenticatedCustomer,acessReadTable,customerCtrl.getTableData);
router.route('/report-by-group').post(isAuthenticatedCustomer,acessReadTable,customerCtrl.getTableDataByGroup);
router.route('/report-page').post(isAuthenticatedCustomer,acessReadTable, customerCtrl.getNumberPages);
router.route('/manager_add').post(isAuthenticatedCustomer,acessReadTable, customerCtrl.addDataToTable);
router.route('/manager_delete').post(isAuthenticatedCustomer,acessReadTable, customerCtrl.deleteData);  
router.route('/manager_update').post(isAuthenticatedCustomer,acessReadTable,customerCtrl.updateData);

router.route('/register').post(customerCtrl.registerUser);
router.route('/advertisement').get(customerCtrl.getAllAdvertisementContent);
router.route('/info_ads').get(customerCtrl.getAllInfoAdvertisementProduct)
                          .post(customerCtrl.getAllInfoAdvertisementFromID);

router.route('/info_ads_custom').post(customerCtrl.getAllInfoAdvertisementProductFromID);

router.route('/lst_product').post(customerCtrl.getInfoProductStore);
router.route('/info_product').get(customerCtrl.getAllInfoProduct)
                              .post(customerCtrl.getInfoProduct);
router.route('/detail_product').get(customerCtrl.getDetailProduct)
                                .post(customerCtrl.getDetailProduct);
router.route('/detail_shop').get(customerCtrl.getDetailShop);

function checkInfoValueToLock(req, res, next){
  if(req.body.hasOwnProperty("is_s_lock")||req.body.hasOwnProperty("phone_info_lock")){
    req.currentUser = { permission_id:1000, users_id:0, enterprise_id:0, value_manifest:0};
    next();
  } else isAuthenticatedCustomer(req, res, next);
}

router.route('/bill').post(checkInfoValueToLock,customerCtrl.setTheBillData);
// giang fixes bill ignore add token function
router.route('/set_bill').post(isAuthenticatedCustomer, customerCtrl.setDataInBill);

router.route('/all_bill').post(isAuthenticatedCustomer,customerCtrl.getDetailAllTheBill);
router.route('/all_error').post(isAuthenticatedCustomer,customerCtrl.getDetailAllTheBillCancel);
router.route('/all_back').post(isAuthenticatedCustomer,customerCtrl.getDetailAllProductBack);
router.route('/all_product').post(isAuthenticatedCustomer,customerCtrl.getLstProduct);
router.route('/detail_bill').post(checkInfoValueToLock,customerCtrl.getDetailTheBill);
router.route('/services').get(customerCtrl.getAllInfoServices);
router.route('/page_product').get(customerCtrl.getDetailProductPages);

router.route('/new_register').post(validate(schema.registerNewCustomer), registerNewCustomer, customerCtrl.registerNewCustomer);

router.route('/info_chat').post(customerCtrl.getAllinfoUserChat);
router.route('/new-product-check').post(customerCtrl.getAllinfoNewProduct);
router.route('/customer-in-company').post(customerCtrl.customerInCompany);

router.route('/lst_bill').post(isAuthenticatedCustomer,customerCtrl.getLstCustomerBill);
router.route('/cancel_bill').post(isAuthenticatedCustomer,customerCtrl.cancelCustomerBill);
router.route('/buy_again').post(isAuthenticatedCustomer,customerCtrl.customerBuyAgainBill);
router.route('/buy_status').post(isAuthenticatedCustomer,customerCtrl.getStatusOrder);
router.route('/search_location').post(customerCtrl.searchLocation);
router.route('/search_product').post(customerCtrl.searchProduct);
router.route('/get_shop').post(customerCtrl.getProductOfShop);
router.route('/find_group_company').post(customerCtrl.searchGroupCompany);
router.route('/get_group_company').post(customerCtrl.getGroupCompany);

router.route('/lst_location').post(customerCtrl.getInfoLoactionStore);
router.route('/shop_product').post(customerCtrl.getAllInfoProductCompany);
router.route('/shop_info').post(customerCtrl.getInfoOfCompany);
router.route('/lst_group_info').post(customerCtrl.getInfoGroupProductCompany);
router.route('/company_lst').post(customerCtrl.getInfoCompanyTopStore);

router.route('/save_user_info').post(isAuthenticatedCustomer,customerCtrl.saveUserInfo);
router.route('/register_customer').post(checkRegisterInfo,customerCtrl.registerCustomer);
router.route('/register_company').post(isAuthenticatedCustomer,checkRegisterCompany,customerCtrl.regisisterCompany);
router.route('/get_all_bill').post(isAuthenticatedCustomer,customerCtrl.getAllBillInfoValue);
router.route('/report_cus/buy_lastday').post(isAuthenticatedCustomer,customerCtrl.getLastdayProductBuy);
router.route('/report_cus/buy_all').post(isAuthenticatedCustomer,customerCtrl.getAllDataYearProductBuy); 
router.route('/set_status_product').post(isAuthenticatedCustomer,customerCtrl.setStatusProduct);
router.route('/get_page_detail').post(customerCtrl.getPageDetail);
router.route('/ads_product').post(customerCtrl.getAdsProduct);

module.exports =  router;
