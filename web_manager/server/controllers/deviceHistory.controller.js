const knex = require('../config/knex.js');
const { getDeviceHistory, readLimit, getSwitchStats, readPeriod, getSensorData } = require('../services/mongo/deviceHistory.js');

// Admin pages (admin/src/container/manager/mqtt/DeviceStatusHistory.js):
// device list from MySQL, status history from MongoDB.
const DEVICE_TABLE = 'mqtt_microservice';

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({ error: error.message || 'Device history query failed' });
}

exports.listDevices = async function listDevices(req, res) {
  try {
    const devices = await knex(DEVICE_TABLE)
      .select('mqtt_microservice_id', 'content', 'mqtt_id', 'mqtt_pub', 'mqtt_sub', 'mqtt_user', 'updated_at')
      .where({ deleteflag: 0 })
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
    const device = await knex(DEVICE_TABLE)
      .select('mqtt_microservice_id', 'content', 'mqtt_id', 'mqtt_pub', 'mqtt_sub', 'mqtt_user')
      .where({ mqtt_microservice_id: id, deleteflag: 0 })
      .first();
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const { history, scanned } = await getDeviceHistory(device.mqtt_pub, limit);
    return res.status(200).json({ device, limit, scanned, history });
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
    const device = await knex(DEVICE_TABLE)
      .select('mqtt_microservice_id', 'content', 'mqtt_id', 'mqtt_pub', 'mqtt_sub', 'mqtt_user')
      .where({ mqtt_microservice_id: id, deleteflag: 0 })
      .first();
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const stats = await getSwitchStats(device.mqtt_pub, period);
    return res.status(200).json(Object.assign({ device }, stats));
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
    const device = await knex(DEVICE_TABLE)
      .select('mqtt_microservice_id', 'content', 'mqtt_id', 'mqtt_pub', 'mqtt_sub', 'mqtt_user')
      .where({ mqtt_microservice_id: id, deleteflag: 0 })
      .first();
    if (!device) return res.status(404).json({ error: 'Device not found' });
    const data = await getSensorData(device.mqtt_pub, period);
    return res.status(200).json(Object.assign({ device }, data));
  } catch (error) {
    return sendError(res, error);
  }
};
