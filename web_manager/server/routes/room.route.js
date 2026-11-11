const express = require('express');
const isAuthenticated = require('../middlewares/authenticate.js');
const rooms = require('../controllers/room.controller.js');

const router = express.Router();
router.use(isAuthenticated);
router.get('/', rooms.list);
router.post('/', rooms.create);
router.get('/roles', rooms.roles);
router.get('/overview', rooms.overview);
router.post('/:id/devices', rooms.addDevice);
router.delete('/:id/devices/:deviceId', rooms.removeDevice);
router.post('/:id/members', rooms.setMember);
router.delete('/:id/members/:memberId', rooms.removeMember);
router.get('/:id/summary', rooms.summary);
router.get('/:id', rooms.get);
router.put('/:id', rooms.update);
router.delete('/:id', rooms.remove);
module.exports = router;
