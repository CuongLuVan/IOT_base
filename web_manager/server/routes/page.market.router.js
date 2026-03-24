const express = require('express');
const documentCtrl = require('../controllers/document.controller.js');
const customerCtrl = require('../controllers/customer.controller.js');

const router = express.Router();


/* commonSale */
router.get('/', (req, res) => {
  res.render('main/home');
});
/* other sale*/
/*router.get('/area', (req, res) => {
  res.render('main/area');
});*/
router.get('/shop', (req, res) => {
  res.render('main/productShop');
});
router.get('/product/product_detail', (req, res) => {
  res.render('main/DetailProduct',{ detail: req._parsedOriginalUrl.query });
});
router.get('/product_detail/:typePage', async (req, res) => {
  let option ={name:req.params.typePage, type:"product",type_id:"name_short", colume:"product_id"};
  var  id = await  customerCtrl.getInfoshortName(option);

  res.render('main/DetailProduct',{ detail: id });
});
router.get('/search', (req, res) => {
  res.render('main/search',{ detail:  req.query.type });
});

router.get('/shop/detail', (req, res) => {
  res.render('main/ShopDetail',{ detail: req._parsedOriginalUrl.query });
});
router.get('/shop-detail/:typePage', async (req, res) => {
  let option ={name:req.params.typePage, type:"company",type_id:"company_short", colume:"company_id"};
  var  id = await  customerCtrl.getInfoshortName(option);
  res.render('main/ShopDetail',{ detail: id});
});
router.get('/cart', (req, res) => {
  res.render('main/cart',{ detail:  req.query.type });
});
router.get('/finish', (req, res) => {
  res.render('main/finishInvoiceProduct',{ detail: req.query.type });
});
router.get('/history', (req, res) => {
  res.render('main/historyInvoice',{ detail:  req.query.type});
});
router.get('/start-register', (req, res) => {
  res.render('main/start-register',{info: req.params.typePage});
});
router.get('/noification', (req, res) => {
  res.render('main/noification',{info: req.params.typePage});
});
router.get('/register-customer', (req, res) => {
  res.render('main/register-customer',{info: req.params.typePage});
});
router.get('/register-company', (req, res) => {
  res.render('main/register-company',{info: req.params.typePage});
});
router.get('/register-new-company', (req, res) => {
  res.render('main/register-company-info',{info: req.params.typePage});
});
router.get('/info-user/:typePage', (req, res) => {
  res.render('home/user',{info: req.params.typePage});
});

router.get('/about', (req, res) => {
  res.render('main/about', { route: 'about' });
});
router.get('/product', (req, res) => {
  res.render('other/productSeach');
});
router.get('/tower', (req, res) => {
  res.render('other/groupCompanyFind');
});
router.get('/tower_detail', (req, res) => {
  res.render('other/groupCompanyDetail',{ detail: req._parsedOriginalUrl.query });
});
router.get('/product_info/detail', (req, res) => {
  res.render('sale/DetailProduct',{ detail: req._parsedOriginalUrl.query });
});
router.get('/area/product', (req, res) => {
  res.render('other/GroupProduct',{ detail: req._parsedOriginalUrl.query });
});
router.get('/area/product_detail', (req, res) => {
  res.render('other/DetailProduct',{ detail: req._parsedOriginalUrl.query });
});
router.get('/area/cart', (req, res) => {
  res.render('other/invoiceInfoProduct');
});
router.get('/area/finish', (req, res) => {
  res.render('other/finishInvoiceProduct',{ detail: req._parsedOriginalUrl.query });
});
router.get('/area/history', (req, res) => {
  res.render('other/historyInvoice',);
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

