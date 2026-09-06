const mqttService = require('../services/mqtt/mqttService.js');
const notificationService = require('../services/mqtt/notificationService.js');
const { returnOK, returnFalse } = require('../utils/returnResponse.js');

const mqttCtrl = {};

mqttCtrl.getStatus = function (req, res) {
  returnOK(res, mqttService.getStatus());
};

mqttCtrl.getConfig = function (req, res) {
  const cfg = {
    protocol: process.env.MQTT_PROTOCOL || 'mqtt',
    host: process.env.MQTT_HOST || 'localhost',
    port: process.env.MQTT_PORT || '1883',
    user: process.env.MQTT_USER || '',
    pass: process.env.MQTT_PASS || '',
    clientId: process.env.MQTT_CLIENT_ID || 'web_manager',
    keepalive: process.env.MQTT_KEEPALIVE || '60',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@localhost',
  };
  returnOK(res, cfg);
};

mqttCtrl.connect = async function (req, res) {
  try {
    const info = await mqttService.connect(req.body || {});
    returnOK(res, info);
  } catch (err) {
    returnFalse(res, err.message || err.toString(), 500);
  }
};

mqttCtrl.disconnect = function (req, res) {
  mqttService.disconnect();
  returnOK(res, mqttService.getStatus());
};

mqttCtrl.publish = async function (req, res) {
  try {
    const { topic, message, qos, retain } = req.body || {};
    const info = await mqttService.publish(topic, message, qos, retain);
    returnOK(res, info);
  } catch (err) {
    returnFalse(res, err.message || err.toString(), 500);
  }
};

mqttCtrl.subscribe = async function (req, res) {
  try {
    const { topic, qos } = req.body || {};
    const granted = await mqttService.subscribe(topic, qos);
    returnOK(res, { topic: String(topic).trim(), granted });
  } catch (err) {
    returnFalse(res, err.message || err.toString(), 500);
  }
};

mqttCtrl.unsubscribe = async function (req, res) {
  try {
    const { topic } = req.body || {};
    await mqttService.unsubscribe(topic);
    returnOK(res, { topic: String(topic).trim() });
  } catch (err) {
    returnFalse(res, err.message || err.toString(), 500);
  }
};

mqttCtrl.getMessages = function (req, res) {
  const after = req.query.after || 0;
  returnOK(res, mqttService.getMessages(after));
};

mqttCtrl.clearMessages = function (req, res) {
  returnOK(res, { cleared: mqttService.clearMessages() });
};

mqttCtrl.pushKey = function (req, res) {
  returnOK(res, { publicKey: notificationService.getPublicKey() });
};

mqttCtrl.pushStatus = function (req, res) {
  returnOK(res, { count: notificationService.getCount(), enabled: notificationService.getCount() > 0 });
};

mqttCtrl.pushSubscribe = function (req, res) {
  try {
    const { subscription, topic } = req.body || {};
    notificationService.addSubscription(subscription, topic);
    returnOK(res, { ok: true, count: notificationService.getCount() });
  } catch (err) {
    returnFalse(res, err.message || err.toString(), 500);
  }
};

mqttCtrl.pushUnsubscribe = function (req, res) {
  const { endpoint } = req.body || {};
  const removed = notificationService.removeSubscription(endpoint);
  returnOK(res, { ok: removed, count: notificationService.getCount() });
};

module.exports = mqttCtrl;