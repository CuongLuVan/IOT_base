const express = require('express');
const controller = require('../controllers/mongodb.controller.js');
const deviceHistory = require('../controllers/deviceHistory.controller.js');
const isAuthenticated = require('../middlewares/authenticate.js');

const router = express.Router();

// Bao ve ca truy van va file export; job chi co the duoc xem/tai boi nguoi tao.
router.use(isAuthenticated);
router.post('/data', controller.getData);
router.get('/exports/:jobId', controller.getExportStatus);
router.get('/exports/:jobId/download', controller.downloadExport);
// Admin: devices and their latest distinct states (MongoDB sensor_data).
router.get('/device-history/devices', deviceHistory.listDevices);
router.post('/device-history', deviceHistory.getHistory);
// Admin: on/off counts per day ({ days: 1..31 }), per month ({ months: 12 } = 1 year) or for a
// custom range ({ from, to: "YYYY-MM-DD", groupBy?: 'day' | 'month' }), duplicate states skipped.
router.post('/device-history/switch-stats', deviceHistory.getSwitchStats);
// Admin: sensor values ("va") for charts, averaged per minute bucket ({ days: 1..31 }, default 7),
// per month ({ months: 12 } = 1 year) or over a custom range ({ from, to: "YYYY-MM-DD", groupBy? }),
// duplicates skipped.
router.post('/device-history/sensor-data', deviceHistory.getSensorData);

module.exports = router;
