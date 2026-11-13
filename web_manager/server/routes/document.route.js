const express = require('express');
const multer = require('multer');
const router = express.Router();
const isAuthenticated = require('../middlewares/authenticate.js');
const isAuthenMutile = require('../middlewares/authenticateMutile');
const documentCtrl = require('../controllers/document.controller.js');
const mqttDeviceCtrl = require('../controllers/mqttDevice.controller.js');
const urlStaticLink=  require('../config/urlSetting.js');
const files = require('../utils/files.js');
const { uploadLimiter } = require('../config/rateLimit.js');
const {uploadFileS3} = require('../models/S3UploadFile.js');
const {returnOK,returnFalse,returnOKCustom,returnNotFound,returnInfoQuery } = require('../utils/returnResponse.js');
const WarningInfo = require("../config/warningInfo.js");
var fs = require('fs');

var upload = multer({
  storage: files.storage,
  limits: files.uploadLimits,
  fileFilter: files.imageFilter
});

router.post('/uploadimage', uploadLimiter, isAuthenticated, files.handleUpload(upload.single("resumeFileBrowser")), async function (req, res) {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  
  res.send(JSON.stringify({
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
router.route('/document_info_data').post(documentCtrl.getAllContentDocumentData);
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


router.route('/saveCertificateMqtt').post(isAuthenticated,  documentCtrl.saveCertificateMqtt);
router.route('/getCertificateMqtt').post(isAuthenticated,  documentCtrl.getCertificateMqtt);
router.route('/revokeCertificateMqtt').post(isAuthenticated,  documentCtrl.revokeCertificateMqtt);
router.route('/antiCloneStatusMqtt').post(isAuthenticated,  documentCtrl.antiCloneStatusMqtt);
router.route('/releaseAntiCloneMqtt').post(isAuthenticated,  documentCtrl.releaseAntiCloneMqtt);

// Devices added from the Wi-Fi setup page; admin or customer accounts.
router.route('/registerDeviceMqtt').post(isAuthenMutile, mqttDeviceCtrl.registerDevice);
router.route('/listDeviceMqtt').post(isAuthenMutile, mqttDeviceCtrl.listDevices);
router.route('/deleteDeviceMqtt').post(isAuthenMutile, mqttDeviceCtrl.deleteDevice);
router.route('/deviceStatusMqtt').post(isAuthenMutile, mqttDeviceCtrl.deviceStatus);
router.route('/controlDeviceMqtt').post(isAuthenMutile, mqttDeviceCtrl.controlDevice);
// Schedules stored on the device itself (SCHEDULE_* MQTT commands).
router.route('/scheduleListMqtt').post(isAuthenMutile, mqttDeviceCtrl.listSchedules);
router.route('/scheduleCommandMqtt').post(isAuthenMutile, mqttDeviceCtrl.sendScheduleCommand);
// Auto OFF on-timer stored on the device (TIMER_SET / TIMER_GET).
router.route('/onTimerMqtt').post(isAuthenMutile, mqttDeviceCtrl.onTimerCommand);
// Countdown auto ON on the device ({"com":4,"value":seconds}).
router.route('/countdownMqtt').post(isAuthenMutile, mqttDeviceCtrl.countdownCommand);
// Sensor threshold control stored on the device ({"com":14,"id","value"}).
router.route('/thresholdMqtt').post(isAuthenMutile, mqttDeviceCtrl.thresholdCommand);


module.exports =  router;

