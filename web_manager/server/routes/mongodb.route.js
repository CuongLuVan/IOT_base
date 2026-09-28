const express = require('express');
const controller = require('../controllers/mongodb.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');

const router = express.Router();

// Bao ve ca truy van va file export; job chi co the duoc xem/tai boi nguoi tao.
router.use(isAuthenticated);
router.post('/data', controller.getData);
router.get('/exports/:jobId', controller.getExportStatus);
router.get('/exports/:jobId/download', controller.downloadExport);

module.exports = router;
