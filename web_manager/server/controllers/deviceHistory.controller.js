const knex = require('../config/knex.js');
const TableManifest = require('../models/middlewareDatabase/TableManifest.js');
const { getDeviceHistory, readLimit, getSwitchStats, readPeriod, getSensorData } = require('../services/mongo/deviceHistory.js');

// Admin pages (admin/src/container/manager/mqtt/DeviceStatusHistory.js):
// device list from MySQL, status history from MongoDB.
const DEVICE_TABLE = 'mqtt_microservice';
// Columns sent to the page; mqtt_user (account key), mqtt_id and mqtt_sub are not exposed.
const DEVICE_COLUMNS = ['mqtt_microservice_id', 'content', 'mqtt_pub'];

// 4xx: input errors raised by this code, safe to show. 5xx: generic message,
// details (MongoDB / MySQL driver, configuration) only in the server log.
function sendError(res, error) {
  const status = Number(error && error.statusCode) || 500;
  if (status >= 400 && status < 500) {
    return res.status(status).json({ error: error.message || 'Bad request' });
  }
  // MongoDB MaxTimeMSExpired (maxTimeMS in services/mongo/deviceHistory.js).
  if (error && (error.code === 50 || error.codeName === 'MaxTimeMSExpired')) {
    return res.status(503).json({ error: 'Truy vấn quá lâu, hãy chọn khoảng thời gian ngắn hơn' });
  }
  console.error('Device history query failed:', error);
  return res.status(500).json({ error: 'Device history query failed' });
}

// Devices the user may see: MASTER sees all; other accounts see the devices of
// the accounts in their manifest (themselves and the users they created).
// Keys follow mqttDevice.controller.js getAccountKey(): "<token type>_<users_id>".
function ownedDevices(req) {
  const query = knex(DEVICE_TABLE).where({ deleteflag: 0 });
  const user = req.currentUser || {};
  if (Number(user.permission_id) === TableManifest.MASTER) return query;
  const type = req.auth && req.auth.type;
  const ids = String(user.value_manifest || '').split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id));
  if (user.users_id !== undefined && user.users_id !== null) ids.push(String(user.users_id));
  const keys = Array.from(new Set(ids)).map((id) => type + '_' + id);
  return query.whereIn('mqtt_user', keys);
}

// The device when it belongs to the user, otherwise null (answered as 404 so
// the ids of other accounts' devices are not revealed).
function findOwnedDevice(req, id) {
  return ownedDevices(req)
    .select(DEVICE_COLUMNS)
    .where({ mqtt_microservice_id: id })
    .first();
}

// At most one running query per user and API (the page sends history, sensor-data
// and switch-stats together); another one while it runs is answered with 429.
const runningQueries = new Set();

async function runOnce(req, res, name, handler) {
  const user = req.currentUser || {};
  const key = name + ':' + (req.auth && req.auth.type) + '_' + user.users_id;
  if (runningQueries.has(key)) {
    return res.status(429).json({ error: 'Truy vấn trước vẫn đang chạy, hãy thử lại sau' });
  }
  runningQueries.add(key);
  try {
    return await handler();
  } finally {
    runningQueries.delete(key);
  }
}

exports.listDevices = async function listDevices(req, res) {
  try {
    const devices = await ownedDevices(req)
      .select(DEVICE_COLUMNS.concat('updated_at'))
      .orderBy('updated_at', 'desc');
    return res.status(200).json({ result: devices });
  } catch (error) {
    return sendError(res, error);
  }
};

// Body: { mqtt_microservice_id, limit (1..50, default 10) }.
exports.getHistory = async function getHistory(req, res) {
  try {
    const body = req.body || {};
    const id = Number(body.mqtt_microservice_id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'mqtt_microservice_id is required' });
    }
    const limit = readLimit(body.limit);
    const device = await findOwnedDevice(req, id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    return await runOnce(req, res, 'history', async () => {
      const { history, scanned } = await getDeviceHistory(device.mqtt_pub, limit);
      return res.status(200).json({ device, limit, scanned, history });
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// Body: { mqtt_microservice_id, days (1..31) | months (1..12) | from, to ("YYYY-MM-DD"), groupBy? };
// mặc định 7 ngày. Số lần bật / tắt mỗi kênh theo ngày hoặc theo tháng;
// bản tin trùng trạng thái không được tính.
exports.getSwitchStats = async function getSwitchStatsHandler(req, res) {
  try {
    const body = req.body || {};
    const id = Number(body.mqtt_microservice_id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'mqtt_microservice_id is required' });
    }
    const period = readPeriod(body);
    const device = await findOwnedDevice(req, id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    return await runOnce(req, res, 'switch-stats', async () => {
      const stats = await getSwitchStats(device.mqtt_pub, period);
      return res.status(200).json(Object.assign({ device }, stats));
    });
  } catch (error) {
    return sendError(res, error);
  }
};

// Body: { mqtt_microservice_id, days (1..31) | months (1..12) | from, to ("YYYY-MM-DD"), groupBy? };
// mặc định 7 ngày. Giá trị cảm biến ("va") cho biểu đồ: trung bình theo khung phút
// (theo ngày) hoặc theo tháng; bản tin trùng giá trị không được lấy.
exports.getSensorData = async function getSensorDataHandler(req, res) {
  try {
    const body = req.body || {};
    const id = Number(body.mqtt_microservice_id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'mqtt_microservice_id is required' });
    }
    const period = readPeriod(body);
    const device = await findOwnedDevice(req, id);
    if (!device) return res.status(404).json({ error: 'Device not found' });
    return await runOnce(req, res, 'sensor-data', async () => {
      const data = await getSensorData(device.mqtt_pub, period);
      return res.status(200).json(Object.assign({ device }, data));
    });
  } catch (error) {
    return sendError(res, error);
  }
};
