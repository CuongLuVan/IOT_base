const express = require('express');
const documentCtrl = require('../controllers/document.controller.js');
const customerCtrl = require('../controllers/customer.controller.js');
const {getLanggue} = require('../utils/Validate.js');
const router = express.Router();



router.get('/', (req, res) => {
  res.render('teznews/home', { route: 'home' });
});
router.get('/tech/:typePage', async (req, res) => {
  var data = req.params.typePage;
  var itemvalue =["head","news", "it","electric","phy","life","fake","recruitment"];
  var itemDetatal =["","Công nghệ mới", "IT/AI","Điện tử","Cơ khí","Đời sống","Tin giả","Tuyển dụng"];
  var index = itemvalue.findIndex(o=>o==data);
  var dataMAin=index;
  if(index<1) {
    dataMAin = '1,2,3,4,5,6,7';
  }
  res.render('teznews/business', { detail: dataMAin, route: 'Thông tin - '+ itemDetatal[index]});
 // res.render('tech/tech' , { detail: dataMAin, route: 'tech' });
});
router.get('/document/:typePage',async (req, res) => {
  var data = req.params.typePage;
  var itemvalue =["head","math", "program","electric","phy","project","skill"];
  var itemDetatal =["","Toán/Vật lý", "Lập trình","Điện tử","Cơ khí","Đồ án","Kỹ năng"];
  var index = itemvalue.findIndex(o=>o==data);
  var dataMAin=20+index;
  if(dataMAin<21) {
    dataMAin = '21,22,23,24,25,26';
  }
  res.render('teznews/business', { detail: dataMAin, route: 'Tài liệu - '+ itemDetatal[index] });
  //res.render('document/document',  { detail: dataMAin, route: 'document' });
});
router.get('/curriculum/:typePage',async (req, res) => {
  var data = req.params.typePage;
  var itemvalue =["head","math", "program","electric","phy"];
  var itemDetatal =["","Toán/Vật lý", "Lập trình","Điện tử","Cơ khí"];
  var index = itemvalue.findIndex(o=>o==data);
  var dataMAin=30+index;
  if(dataMAin<31) {
    dataMAin = '31,32,33,34';
  }
  res.render('teznews/business', { detail: dataMAin, route:'Giáo trình - '+ itemDetatal[index] });
  //res.render('document/document', { detail: dataMAin, route: 'curriculum' });
});
router.get('/tool/:typePage',async (req, res) => {
  var data = req.params.typePage;
  var itemvalue =["head","math","economy", "image","design","iot"];
  var itemDetatal =["","Toán/Vật lý", "Kinh tế","Xử lý ảnh","Công cụ design","Công cụ IOT"];
  var index = itemvalue.findIndex(o=>o==data);
  var dataMAin=40+index;
  if(dataMAin<41) {
    dataMAin = '41,42,43,44,45';
  }
  res.render('teznews/business', { detail: dataMAin, route:'Công cụ - '+ itemDetatal[index]});
  //res.render('document/document',  { detail: dataMAin, route: 'tool' });
});
router.get('/tool/detail/:typePage', (req, res) => {
  res.render('teznews/business', { detail: dataMAin, route: 'tool' });
 // res.render('tool/toolDetail', { detail: data, route: 'tool' });
});
router.get('/recruitment/:typePage', (req, res) => {
  var data = req.params.typePage;
  res.render('teznews/loadTemplate', { detail: data, route: '' });
 // res.render('home/viewDetail', { detail: data, route: '' });
});
router.get('/detail_page/:typePage', (req, res) => {
  var data = req.params.typePage;
  res.render('teznews/article', { detail: data, route: '' });
 // res.render('home/viewDetail', { detail: data, route: '' });
});
router.get('/page_detail/:typePage', async (req, res) => {
  //let option ={name:req.params.typePage, type:"gro_pages_content",type_id:"name_short", colume:"filesave"};
 // var  id = await  customerCtrl.getInfoshortName(option);
  res.render('teznews/article', { detail: "", route: '' ,type:req.params.typePage});
 // res.render('home/viewDetail', { detail: data, route: '' });
});

router.get('/group_page/:typePage', (req, res) => {
  var data = req.params.typePage;
  res.render('teznews/articleGroup', { detail: data, route: '' });
 // res.render('home/groupDetail', { detail: data, route: '' });
});

router.get('/page_group/:typePage', async (req, res) => {
  let option ={name:req.params.typePage, type:"gro_pages_content",type_id:"name_short", colume:"pages_content_id"};
  let  id = await  customerCtrl.getInfoshortName(option,'AND gro_pages_content.type_langue='+ getLanggue(req));
  res.render('teznews/articleGroup', { detail: id, route: '' });
 // res.render('home/groupDetail', { detail: data, route: '' });
});

router.get('/about', (req, res) => {
  res.render('teznews/about', { route: 'about' });
});
router.get('/about', (req, res) => {
  res.render('main/about', { route: 'about' });
});

router.get('/tower', (req, res) => {
  res.render('other/groupCompanyFind');
});
router.get('/tower_detail', (req, res) => {
  res.render('other/groupCompanyDetail',{ detail: req._parsedOriginalUrl.query });
});

router.get('/warning_for_site', (req, res) => {
  res.render('teznews/report_warning',{ detail: "", route: 'tool' });
});

router.get('/abouttest', (req, res) => {
  let options = {
      maxAge: 1000 * 60 * 150, // would expire after 15 minutes
      httpOnly: true, // The cookie only accessible by the web server
      signed: true // Indicates if the cookie should be signed
  }

  let options1 = {
    maxAge: 1000 * 60 * 150, // would expire after 15 minutes
    httpOnly: false, // The cookie only accessible by the web server
    signed: true // Indicates if the cookie should be signed
  }
  let options3 = {
    maxAge: 1000 * 60 * 150, // would expire after 15 minutes
    httpOnly: false, // The cookie only accessible by the web server
    signed: false // Indicates if the cookie should be signed
  }

// Set cookie
  res.cookie('cookie1', 'cookieValue1', options);
  res.cookie('cookie2', 'cookieValue2', options1);
  res.cookie('cookie3', 'cookieValue3', options3); // options is optional
  res.render('main/about', { route: 'about' });
});

router.get('/check-info/history', (req, res) => {
  res.render('other/historyInvoice',);
});

router.get('/sample_pages/:typePage/:detailPages', (req, res) => {
  res.render('newPages/'+req.params.typePage+"/"+req.params.detailPages);
});

module.exports = router;

