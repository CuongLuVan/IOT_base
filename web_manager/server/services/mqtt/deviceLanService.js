const fs = require('fs');
const path = require('path');
const http = require('http');
const EventEmitter = require('events');
const { protectPayload } = require('./mqttSecurity.js');

/**
 * Điều khiển thiết bị qua mạng LAN khi broker / Internet lỗi (firmware
 * ENABLE_LAN_CONTROL, docs/LanControl.md):
 *   POST http://<ip>/lan {"data":<lệnh MQTT>} -> {"ip":"...","data":[<bản tin trả lời>]}
 * Lệnh và bản tin trả lời giống hệt MQTT. Mỗi bản tin trả lời được phát lại
 * như một tin nhắn trên topic publish của thiết bị (sự kiện 'message', cùng
 * dạng với mqttService), nên trạng thái và các lệnh đang chờ trả lời xử lý
 * chung một đường.
 *
 * IP lấy từ trường "ip" thiết bị gửi (STATUS_GET, trả lời LAN) hoặc do người
 * dùng nhập; lưu trong config/device.lan.json để dùng được khi broker lỗi
 * ngay sau khi web_manager khởi động lại.
 */
const STORE_PATH = path.join(__dirname, '..', '..', 'config', 'device.lan.json');
const LAN_PATH = '/lan';
const LAN_PORT = 80;
const REQUEST_TIMEOUT_MS = 6000;
const MAX_RESPONSE_BYTES = 16384;

const emitter = new EventEmitter();
// topic (mqtt_pub) -> { ip, manualIp, seenAt }
const devices = new Map();
let saveTimer = null;

// Only private IPv4 addresses: the server never sends commands outside the LAN.
function isLanIp(ip) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || ''));
  if (!match) return false;
  const bytes = match.slice(1).map(Number);
  if (bytes.some((b) => b > 255)) return false;
  return bytes[0] === 10 ||
    (bytes[0] === 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
    (bytes[0] === 192 && bytes[1] === 168);
}

function load() {
  try {
    if (!fs.existsSync(STORE_PATH)) return;
    const saved = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    Object.keys(saved || {}).forEach((topic) => {
      const entry = saved[topic] || {};
      devices.set(topic, {
        ip: isLanIp(entry.ip) ? entry.ip : null,
        manualIp: isLanIp(entry.manualIp) ? entry.manualIp : null,
        seenAt: entry.seenAt || null,
      });
    });
  } catch (e) {
    console.error('Cannot read ' + STORE_PATH + ':', e.message);
  }
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = {};
    devices.forEach((entry, topic) => { data[topic] = entry; });
    fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), { mode: 0o600 }, (err) => {
      if (err) console.error('Cannot write ' + STORE_PATH + ':', err.message);
    });
  }, 1000);
}

// Called with the "ip" a device reported.
function rememberIp(topic, ip) {
  if (!topic || !isLanIp(ip)) return;
  const entry = devices.get(topic) || { ip: null, manualIp: null, seenAt: null };
  const changed = entry.ip !== ip;
  entry.ip = ip;
  entry.seenAt = new Date().toISOString();
  devices.set(topic, entry);
  if (changed) scheduleSave();
}

// ip null/'' clears the manual address (the reported one is used again).
function setManualIp(topic, ip) {
  if (ip && !isLanIp(ip)) {
    const error = new Error('IP phải là địa chỉ IPv4 trong mạng LAN (10.x, 172.16–31.x, 192.168.x).');
    error.status = 400;
    throw error;
  }
  const entry = devices.get(topic) || { ip: null, manualIp: null, seenAt: null };
  entry.manualIp = ip || null;
  devices.set(topic, entry);
  scheduleSave();
}

// The address used for LAN commands: the manual one wins.
function getIp(topic) {
  const entry = devices.get(topic);
  return entry ? entry.manualIp || entry.ip : null;
}

function describe(topic) {
  const entry = devices.get(topic) || {};
  return { ip: getIp(topic), reportedIp: entry.ip || null, manualIp: entry.manualIp || null };
}

function postJson(ip, body) {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify(body));
    const req = http.request({
      host: ip,
      port: LAN_PORT,
      path: LAN_PATH,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length },
      timeout: REQUEST_TIMEOUT_MS,
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_RESPONSE_BYTES) {
          req.destroy(new Error('phản hồi quá lớn'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        let data = null;
        try {
          data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch (e) {
          // Handled below with the status code.
        }
        resolve({ status: res.statusCode, data });
      });
    });
    req.on('timeout', () => req.destroy(new Error('hết thời gian chờ ' + REQUEST_TIMEOUT_MS / 1000 + ' giây')));
    req.on('error', reject);
    req.end(payload);
  });
}

/**
 * Sends one MQTT-style command to the device over the LAN. Resolves with the
 * replies; each one is also emitted as a 'message' on device.mqtt_pub.
 */
async function request(device, command, clientId) {
  const ip = getIp(device.mqtt_pub);
  if (!ip) {
    const error = new Error('Chưa biết IP LAN của thiết bị: kết nối MQTT một lần để thiết bị báo IP, hoặc nhập IP.');
    error.status = 400;
    throw error;
  }
  // Same protection as an MQTT publish (signature when MQTT_HMAC_SECRET is set).
  const data = JSON.parse(protectPayload(command, clientId));
  let response;
  try {
    response = await postJson(ip, { data });
  } catch (e) {
    const error = new Error('Không gọi được thiết bị qua LAN (' + ip + '): ' + e.message);
    error.status = 504;
    throw error;
  }
  const body = response.data || {};
  if (isLanIp(body.ip)) rememberIp(device.mqtt_pub, body.ip);
  if (response.status !== 200) {
    const error = new Error('Thiết bị (' + ip + ') từ chối lệnh LAN: ' +
      (body.error || 'HTTP ' + response.status) +
      (response.status === 404 ? ' (firmware chưa hỗ trợ điều khiển LAN)' : ''));
    error.status = response.status === 422 || response.status === 400 ? 400 : 502;
    throw error;
  }
  const replies = Array.isArray(body.data) ? body.data : [];
  const time = new Date().toISOString();
  replies.forEach((reply) => {
    if (reply && typeof reply === 'object') {
      emitter.emit('message', { topic: device.mqtt_pub, payload: JSON.stringify(reply), time, via: 'lan' });
    }
  });
  return replies;
}

load();

module.exports = {
  on: emitter.on.bind(emitter),
  isLanIp,
  rememberIp,
  setManualIp,
  getIp,
  describe,
  request,
};
