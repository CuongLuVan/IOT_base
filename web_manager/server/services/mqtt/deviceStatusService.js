const fs = require('fs');
const path = require('path');
const mqttService = require('./mqttService.js');

/**
 * Trạng thái thiết bị cho trang điều khiển (View/mqtt/device-control.ejs).
 * Dùng chung kết nối MQTT duy nhất của mqttService: theo dõi topic publish
 * của từng thiết bị và gửi lệnh tới topic subscribe của nó.
 *
 * Firmware (DeviceIOT / DeviceIOT8266):
 *   Mọi lệnh là {"com":<số>,...}; mọi trả lời mang "rc" (com được trả lời) và "rs" (kết quả).
 *   lệnh   {"com":1,"value":<bitmask kênh>}   {"com":2} = yêu cầu trạng thái đầy đủ
 *   trạng thái {"va":"<cảm biến>","co":"device_port,button_click,button_status,count_info",
 *               "set":["giờ,phút,weekday,port_state,auto_off", ...],"tim":<giây>,"cd":<giây>,
 *               "cm":<cổng đếm ngược>,"cs":<giây đếm ngược gần nhất>}
 *   "set" (lịch đang hoạt động, sắp theo giờ), "tim" (hẹn giờ tự tắt, 0 = tắt),
 *   "cd" (đếm ngược tự bật còn lại, 0 = không đếm), "cm" và "cs" chỉ có trong
 *   trả lời com 2, 4, 5, 8..12, 14 (cùng bản tin đầy đủ, thêm "rc"/"rs");
 *   trả lời com 1 là bản tin ngắn + "rc":1.
 *   Mọi lệnh mang "pa" = mật khẩu thiết bị (mqtt_pass); sai mật khẩu thiết bị
 *   trả {"rc":<com>,"rs":6} và không chạy lệnh.
 *   "ip" (bản tin đầy đủ) là địa chỉ LAN của thiết bị.
 *   "th":[n,n] là 2 cài đặt điều khiển theo ngưỡng sensor (4 byte gộp, 0 = trống). Server chỉ chuyển nó cho
 *   trang; điều khiển LAN do trình duyệt gửi thẳng tới thiết bị, không qua server.
 */
const COMMAND_CONTROL = 1;
const COMMAND_STATUS = 2;
const STATUS_REQUEST = { com: COMMAND_STATUS };
const STATUS_REQUEST_INTERVAL_MS = 15000;
// Dashboard health policy: status older than two minutes is considered silent.
const DEVICE_OFFLINE_AFTER_MS = 120000;
// The firmware replies to a command before its device task applies it.
const STATUS_AFTER_CONTROL_MS = 1500;
const SUBSCRIBE_RETRY_MS = 60000;
const ON_TIMER_MAX_SECONDS = 86400;
const RESULT_WRONG_PASSWORD = 6;
// A wrong-password reply is shown on the page this long.
const PASSWORD_ERROR_MS = 60000;
const PASSWORD_ERROR = 'Thiết bị từ chối lệnh: sai mật khẩu thiết bị (mqtt_pass của web_manager khác mật khẩu đã cài trên thiết bị).';

const statuses = new Map();          // topic -> { data, receivedAt }
const watchedTopics = new Set();
const subscribeErrors = new Map();   // topic -> { message, at }
const lastStatusRequest = new Map(); // topic -> ms
const passwordRejections = new Map(); // publish topic -> ms of the last wrong-password reply
let connecting = null;

mqttService.on('message', (item) => {
  if (!watchedTopics.has(item.topic)) return;
  let data;
  try {
    data = JSON.parse(item.payload);
  } catch (e) {
    return;
  }
  if (!data || typeof data !== 'object') return;
  if (isPasswordRejection(data)) {
    passwordRejections.set(item.topic, Date.now());
    return;
  }
  const previous = statuses.get(item.topic);
  if (data.va === undefined && data.co === undefined && data.rc === undefined) return;
  // Status messages the device sends on its own (e.g. after a button press)
  // and the reply to com:1 carry no "set"/"tim"; keep the values of the last full report.
  const settings = Array.isArray(data.set) ? data.set : previous ? previous.settings : null;
  const onTimer = isOnTimerSeconds(data.tim) ? data.tim : previous ? previous.onTimer : null;
  // "cd" counts down on the device; "at" lets describeStatus() age it.
  let countdown = previous ? previous.countdown : null;
  if (isOnTimerSeconds(data.cd)) {
    // "cm": ports the countdown switches on (full report); older data keeps the last known mask.
    let mask = Number.isInteger(data.cm) ? data.cm : countdown ? countdown.mask : null;
    if (data.cd === 0) mask = null;
    countdown = { remaining: data.cd, mask, at: Date.now() };
  }
  const ip = isLanIp(data.ip) ? data.ip : previous ? previous.ip : null;
  const thresholds = isThresholdList(data.th) ? data.th : previous ? previous.thresholds : null;
  // mqttService stamps item.time when the broker message reaches this server;
  // use that server-side time as last-seen, never a device clock in the payload.
  const receivedAt = Number.isFinite(Date.parse(item.time)) ? new Date(item.time).toISOString() : new Date().toISOString();
  statuses.set(item.topic, { data: Object.assign({}, previous && previous.data, data), settings, onTimer, countdown, ip, thresholds, receivedAt });
});

// "th": the device's two threshold rules, each a 4-byte value (0 = empty).
function isThresholdList(value) {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 0x7FFFFFFF);
}

function isPasswordRejection(data) {
  return data.rs === RESULT_WRONG_PASSWORD && data.va === undefined && data.co === undefined;
}

// Private IPv4 only (10.x, 172.16-31.x, 192.168.x).
function isLanIp(ip) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || ''));
  if (!match) return false;
  const bytes = match.slice(1).map(Number);
  if (bytes.some((b) => b > 255)) return false;
  return bytes[0] === 10 || (bytes[0] === 172 && bytes[1] >= 16 && bytes[1] <= 31) ||
    (bytes[0] === 192 && bytes[1] === 168);
}

function isOnTimerSeconds(value) {
  return Number.isInteger(value) && value >= 0 && value <= ON_TIMER_MAX_SECONDS;
}

// Same wildcard rules as the broker's topicMatches().
function topicMatches(pattern, topic) {
  if (typeof pattern !== 'string' || !pattern) return false;
  let re = pattern.replace(/[[\]{}()*?.\\^$|]/g, (m) => '\\' + m);
  re = re.replace(/\+/g, '[^/]+').replace(/#/g, '.*');
  return new RegExp('^' + re + '$').test(topic);
}

// The broker closes the web_manager connection on a refused publish, so
// commands are checked against its ACL entry first. Without a readable
// mqtt_acl.json the broker decides.
function isAllowedByAcl(action, topic) {
  const certDir = process.env.MQTT_CERTS;
  if (!certDir) return true;
  try {
    const acl = JSON.parse(fs.readFileSync(path.join(path.dirname(path.resolve(certDir)), 'mqtt_acl.json'), 'utf8'));
    const clientId = (mqttService.options && mqttService.options.clientId) || process.env.MQTT_CLIENT_ID || 'web_manager';
    let entry = null;
    (Array.isArray(acl.rules) ? acl.rules : []).forEach((rule) => {
      if (rule && (rule.clientId === clientId || rule.username === clientId)) entry = rule;
    });
    const patterns = entry && Array.isArray(entry[action]) ? entry[action] : [];
    return patterns.some((pattern) => topicMatches(pattern, topic));
  } catch (e) {
    return true;
  }
}

// Connects with the .env settings when nobody has connected yet; an existing
// connection (also one made from /mqtt) is reused as is.
async function ensureConnected() {
  if (mqttService.isConnected()) return;
  if (mqttService.client) {
    throw new Error('MQTT broker đang ' + mqttService.connectionStatus);
  }
  if (!connecting) {
    connecting = mqttService.connect({}).finally(() => { connecting = null; });
  }
  await connecting;
}

async function watch(topic) {
  watchedTopics.add(topic);
  if (mqttService.subscriptions.includes(topic)) return null;
  const failed = subscribeErrors.get(topic);
  if (failed && Date.now() - failed.at < SUBSCRIBE_RETRY_MS) return failed.message;
  if (!isAllowedByAcl('subscribe', topic)) {
    const message = 'Broker không cho web_manager theo dõi topic ' + topic + ' (mqtt_acl.json)';
    subscribeErrors.set(topic, { message, at: Date.now() });
    return message;
  }
  try {
    await mqttService.subscribe(topic);
    subscribeErrors.delete(topic);
    return null;
  } catch (e) {
    subscribeErrors.set(topic, { message: e.message, at: Date.now() });
    return e.message;
  }
}

// Adds the device password ("pa") the firmware checks on every command.
function withPassword(device, command) {
  return device.mqtt_pass ? Object.assign({}, command, { pa: device.mqtt_pass }) : command;
}

function publishCommand(device, command) {
  const topic = device.mqtt_sub;
  if (!isAllowedByAcl('publish', topic)) {
    const error = new Error('Broker không cho web_manager gửi lệnh tới topic ' + topic + ' (mqtt_acl.json)');
    error.status = 400;
    return Promise.reject(error);
  }
  return mqttService.publish(topic, JSON.stringify(withPassword(device, command)));
}

async function requestStatus(device, force) {
  const topic = device.mqtt_sub;
  const last = lastStatusRequest.get(topic) || 0;
  if (!force && Date.now() - last < STATUS_REQUEST_INTERVAL_MS) return;
  lastStatusRequest.set(topic, Date.now());
  try {
    await publishCommand(device, STATUS_REQUEST);
  } catch (e) {
    // The status stays unknown; the page shows the subscribe/publish error.
  }
}

async function control(device, value) {
  await publishCommand(device, { com: COMMAND_CONTROL, value });
  setTimeout(() => { requestStatus(device, true); }, STATUS_AFTER_CONTROL_MS);
}

// Error text while the device recently refused a command for its password.
function getPasswordError(publishTopic) {
  const at = passwordRejections.get(publishTopic);
  return at && Date.now() - at < PASSWORD_ERROR_MS ? PASSWORD_ERROR : null;
}

function toNumbers(text) {
  return String(text == null ? '' : text).split(',').map((part) => Number(part.trim()));
}

// "8,20,1,4,5" -> 08:20, weekday bits (bit0 = Monday, 0 = once), port_state, auto_off seconds.
function parseSettings(settings) {
  if (!Array.isArray(settings)) return null;
  return settings.map(toNumbers).filter((values) => values.length === 5 && values.every(Number.isInteger))
    .map((values) => ({
      hour: values[0], minute: values[1], weekday: values[2], portState: values[3], autoOff: values[4],
    }));
}

// DeviceIOT sends 7 sensor values and drives 2 outputs; DeviceIOT8266 sends
// 3 and drives 1 output. Both send humidity/temperature in hundredths.
function describeStatus(entry) {
  if (!entry) return null;
  const lastSeenMs = Date.parse(entry.receivedAt);
  const ageMs = Number.isFinite(lastSeenMs) ? Math.max(0, Date.now() - lastSeenMs) : null;
  const rs = Number.isInteger(entry.data.rs) ? entry.data.rs : null;
  const healthReason = rs != null && rs !== 0 ? 'DEVICE_RESULT_' + rs : null;
  const va = toNumbers(entry.data.va);
  const co = toNumbers(entry.data.co);
  const esp32 = va.length >= 7;
  const sensors = esp32 ? [
    { label: 'Độ ẩm', value: va[0] / 100, unit: '%' },
    { label: 'Nhiệt độ', value: va[1] / 100, unit: '°C' },
    { label: 'Bụi', value: va[2], unit: '' },
    { label: 'PM2.5', value: va[3], unit: 'µg/m³' },
    { label: 'PM10', value: va[4], unit: 'µg/m³' },
    { label: 'PM1', value: va[5], unit: 'µg/m³' },
  ] : [
    { label: 'Độ ẩm', value: va[0] / 100, unit: '%' },
    { label: 'Nhiệt độ', value: va[1] / 100, unit: '°C' },
    { label: 'ADC', value: va[2], unit: '' },
  ];
  const port = Number.isInteger(co[0]) ? co[0] : null;
  return {
    rc: Number.isInteger(entry.data.rc) ? entry.data.rc : null,
    rs,
    connectionStatus: ageMs == null ? 'UNKNOWN' : ageMs <= DEVICE_OFFLINE_AFTER_MS ? 'ONLINE' : 'OFFLINE',
    lastSeenAt: entry.receivedAt,
    lastSeenAgeMs: ageMs,
    healthStatus: ageMs == null ? 'UNKNOWN' : ageMs > DEVICE_OFFLINE_AFTER_MS ? 'STALE' : healthReason ? 'ERROR' : 'HEALTHY',
    healthReason,
    model: esp32 ? 'DeviceIOT' : 'DeviceIOT8266',
    channels: esp32 ? 2 : 1,
    port,
    on: port == null ? null : port !== 0,
    buttonClick: Number.isFinite(co[1]) ? co[1] : null,
    buttonStatus: Number.isFinite(co[2]) ? co[2] : null,
    commandCount: Number.isFinite(co[3]) ? co[3] : null,
    sensors: sensors.filter((sensor) => Number.isFinite(sensor.value)),
    // Active schedules from the full status report ({"com":2}); null until the device has answered one.
    settings: parseSettings(entry.settings),
    // Auto OFF on-timer in seconds (0 = off); null until the device reported it.
    onTimer: entry.onTimer == null ? null : entry.onTimer,
    // Countdown auto ON: seconds left now (0 = idle), null until reported.
    countdown: describeCountdown(entry.countdown),
    countdownMask: entry.countdown && entry.countdown.mask ? entry.countdown.mask : null,
    // LAN address the device reported (used by the page for LAN control).
    ip: entry.ip || null,
    // Threshold rules [rule 1, rule 2] (4-byte values), null until reported.
    thresholds: entry.thresholds || null,
    receivedAt: entry.receivedAt,
  };
}

function describeCountdown(countdown) {
  if (!countdown) return null;
  if (countdown.remaining === 0) return 0;
  return Math.max(0, countdown.remaining - Math.floor((Date.now() - countdown.at) / 1000));
}

function getStatus(topic) {
  return describeStatus(statuses.get(topic));
}

module.exports = {
  ensureConnected, watch, publishCommand, requestStatus, control, getStatus, getPasswordError,
  isPasswordRejection, PASSWORD_ERROR, DEVICE_OFFLINE_AFTER_MS,
};
