const express = require('express');
const authenticate = require('../middlewares/authenticate');
const authenticateCustomer = require('../middlewares/authenticateCustomer');
const contextService = require('../app/context/contextService.js');

// Contexts (automation) run by mqttClient (app/context/). A context belongs to
// the account that owns its devices: mqtt_microservice.mqtt_user is
// "admin_<id>" or "customer_<id>", the same key as web_manager.
//   POST /api/context/list | /save | /delete           customer token
//   POST /api/context/admin/list | /save | /delete     admin token
const router = express.Router();

function sendError(res, error, action) {
  if (error.status) return res.status(error.status).json({ error: error.message });
  console.error('[Context] Failed to ' + action + ':', error.message);
  return res.status(500).json({ error: 'Unable to ' + action + '.' });
}

function routes(type, auth) {
  const prefix = type === 'admin' ? '/admin' : '';
  const owner = (req) => type + '_' + req.currentUser.users_id;

  router.post(prefix + '/list', auth, (req, res) => {
    res.status(200).json({ contexts: contextService.list(owner(req)) });
  });

  // Body: mqtt_context_id (omit to create), name, source_device_id,
  // target_device_id, content, state, action, enabled, priority,
  // cooldown_s, timeout_s, retry.
  router.post(prefix + '/save', auth, async (req, res) => {
    try {
      const context = await contextService.save(owner(req), req.currentUser.users_id, req.body || {});
      res.status(200).json({ context });
    } catch (error) {
      sendError(res, error, 'save context');
    }
  });

  router.post(prefix + '/delete', auth, async (req, res) => {
    try {
      await contextService.remove(owner(req), (req.body || {}).mqtt_context_id);
      res.status(200).json({ deleted: true });
    } catch (error) {
      sendError(res, error, 'delete context');
    }
  });
}

routes('customer', authenticateCustomer);
routes('admin', authenticate);

module.exports = router;
