const express = require('express');

const router = express.Router();
const pageToken = /^[A-Za-z0-9,_-]{1,120}$/;
const sampleToken = /^[A-Za-z0-9-]{1,80}$/;

function validPageToken(value) {
  return typeof value === 'string' && pageToken.test(value);
}

router.get('/', (req, res) => {
  res.render('book/index', { route: 'home' });
});

router.get('/sub/:typePage', (req, res, next) => {
  if (!validPageToken(req.params.typePage)) return next();
  res.render('book/sub', { detail: req.params.typePage, route: '' });
});

router.get('/group_page/:typePage', (req, res, next) => {
  if (!validPageToken(req.params.typePage)) return next();
  res.render('book/group_page', { detail: req.params.typePage, route: '' });
});

router.get('/detail/:typePage', (req, res, next) => {
  if (!validPageToken(req.params.typePage)) return next();
  res.render('book/detailpages', { detail: '', route: '', type: req.params.typePage });
});

router.get('/document', (req, res) => {
  res.render('book/sub', { detail: '21,22,23,24,25,26,27', route: '', type: '' });
});

router.get('/share', (req, res) => {
  res.render('book/sub', { detail: '31,32,33,34', route: '', type: '' });
});

router.get('/tool', (req, res) => {
  res.render('book/tool_info', { detail: '41,42,43,44,45,46', route: '', type: '' });
});

router.get('/perspective', (req, res) => {
  res.render('book/sub', { detail: '1,2,3,4,5,6,7', route: '', type: '' });
});

router.get('/warning_for_site', (req, res) => {
  res.render('teznews/report_warning', { detail: '', route: 'tool' });
});

router.get('/info-user/:typePage', (req, res, next) => {
  if (!validPageToken(req.params.typePage)) return next();
  res.render('home/user', { info: req.params.typePage });
});

router.get('/check-info/history', (req, res) => {
  res.render('other/historyInvoice');
});

router.get('/sample_pages/:typePage/:detailPage', (req, res, next) => {
  if (!sampleToken.test(req.params.typePage) || !sampleToken.test(req.params.detailPage)) return next();
  res.render('newPages/' + req.params.typePage + '/' + req.params.detailPage);
});

module.exports = router;
