const express = require('express');
const multer = require('multer');
const router = express.Router();
const isAuthenticated = require('../middlewares/authenticate.js');
const isAuthenMutile = require('../middlewares/authenticateMutile');
const documentCtrl = require('../controllers/document.controller.js');
const urlStaticLink=  require('../config/urlSetting.js');
const {uploadFileS3} = require('../models/S3UploadFile.js');
const {returnOK,returnFalse,returnOKCustom,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');
const WarningInfo = require("../config/warningInfo.js");
var fs = require('fs');

var storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, dirFolder + '/public/img/')
    },
    filename: (req, file, cb) => {
      cb(null,Date.now().toString()+ file.originalname)
    }
  });
  
var upload = multer({storage: storage});

router.post('/uploadimage', upload.single("resumeFileBrowser"), async function (req, res) {
  
  res.send(JSON.stringify({path:req.file.path,
    file:req.file,
    url:urlStaticLink+ '/uploads/datas/'+ req.file.filename})
  );

  /*
  var url= await uploadFileS3(req.file.path,req.file.filename);
  if(url!=null) returnOKCustom(res,{url:url});
  else returnFalse(res,{error: true,data: { message: "Not upload file" } },WarningInfo.NOT_UPLOAD_FILE);
  */
});

// writer pages
router.route('/registerPages').post(isAuthenticated,  documentCtrl.postAddPageToDataBase);
// writer pages
router.route('/updatePages').post(isAuthenticated, documentCtrl.postUpdatePageToDataBase);
router.route('/registerProductPages').post(isAuthenMutile,  documentCtrl.postAddProductPageToDataBase);
// writer pages
router.route('/updateProductPages').post(isAuthenticated, documentCtrl.postUpdateProductPageToDataBase);
router.route('/registerServicePages').post(isAuthenticated,  documentCtrl.postAddServicePageToDataBase);
router.route('/updatServicePages').post(isAuthenticated,  documentCtrl.postUpdateServicePageToDataBase);

// writer Advertisement
router.route('/registerAdvertisement').post(isAuthenticated,  documentCtrl.postAddAdvertisementToDataBase);
// writer Advertisement
router.route('/updateAdvertisement').post(isAuthenticated,  documentCtrl.postUpdateAdvertisementToDataBase);
router.route('/document_detail/:typePage').get(documentCtrl.getAllContentDetailPage);
router.route('/lastest_detail/:typePage').get(documentCtrl.getAllContentLatestPage);
router.route('/get_new').get(documentCtrl.getAllContentStartPage);
router.route('/get_tool').get( documentCtrl.getAllInfoTool);
router.route('/get_home').get(documentCtrl.getAllInfoHome);
router.route('/group_page').post( documentCtrl.getAllInGroupPage);
router.route('/get_advertisement').post(documentCtrl.getAllContentAdvertisement);
router.route('/ramdom').post(documentCtrl.getRamdomContent);

router.route('/test_upload').post((req, res) => {
    
  res.setHeader("content-type", "application/pdf");
  fs.createReadStream("./server/routes/acc.pdf").pipe(res);
 // res.send(JSON.stringify({sample:false}));
});

module.exports =  router;

