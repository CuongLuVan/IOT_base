const express = require('express');
const mqttCtrl = require('../controllers/mqtt.controller.js');

const router = express.Router();

router.route('/status').get(mqttCtrl.getStatus);
router.route('/config').get(mqttCtrl.getConfig);
router.route('/connect').post(mqttCtrl.connect);
router.route('/disconnect').post(mqttCtrl.disconnect);
router.route('/messages').get(mqttCtrl.getMessages);
router.route('/messages').delete(mqttCtrl.clearMessages);
router.route('/publish').post(mqttCtrl.publish);
router.route('/subscribe').post(mqttCtrl.subscribe);
router.route('/unsubscribe').post(mqttCtrl.unsubscribe);
router.route('/push/key').get(mqttCtrl.pushKey);
router.route('/push/status').get(mqttCtrl.pushStatus);
router.route('/push/subscribe').post(mqttCtrl.pushSubscribe);
router.route('/push/unsubscribe').post(mqttCtrl.pushUnsubscribe);

module.exports = router;