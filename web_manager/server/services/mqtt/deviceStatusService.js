const fs = require('fs');
const path = require('path');
const mqttService = require('./mqttService.js');
const lan = require('./deviceLanService.js');

/**
 * Trạng thái thiết bị cho trang điều khiển (View/mqtt/device-control.ejs).
 * Dùng chung kết nối MQTT duy nhất của mqttService: theo dõi topic publish
 * của từng thiết bị và gửi lệnh tới topic subscribe của nó.
 *
 * Firmware (DeviceIOT / DeviceIOT8266):
 *   lệnh   {"com":1,"value":<bitmask kênh>}   {"cmd":"STATUS_GET"} = yêu cầu trạng thái
 *   trạng thái {"va":"<cảm biến>","co":"device_port,button_click,button_status,count_info",
 *               "set":["giờ,phút,weekday,port_state,auto_off", ...],"tim":<giây>,"cd":<giây>}
 *   "set" (lịch đang hoạt động, sắp theo giờ), "tim" (hẹn giờ tự tắt, 0 = tắt)
 *   và "cd" (đếm ngược tự bật còn lại, 0 = không đếm) chỉ có trong trả lời
 *   STATUS_GET và trong trả lời các lệnh com 5, 8..12 (cùng bản tin, thêm
 *   "rc"/"rs"); COUNTDOWN_ACK cũng mang "cd".
 *   "ip" (STATUS_GET) là địa chỉ LAN, dùng khi gửi lệnh qua LAN.
 *
 * Đường gửi lệnh (mode): 'mqtt', 'lan' (deviceLanService) hoặc 'auto' = MQTT
 * khi broker và thiết bị đều đang trả lời qua MQTT, ngược lại LAN nếu đã biết IP.
 */
const COMMAND_CONTROL = 1;
const STATUS_REQUEST = { cmd: 'STATUS_GET' };
const STATUS_REQUEST_INTERVAL_MS = 15000;
// A LAN status request is one HTTP call to the device; the page polls every 3 s.
const LAN_STATUS_REQUEST_INTERVAL_MS = 5000;
// 'auto' keeps MQTT while the device answered over MQTT this recently.
const MQTT_FRESH_MS = 60000;
// The firmware replies to a command before its device task applies it.
const STATUS_AFTER_CONTROL_MS = 1500;
const SUBSCRIBE_RETRY_MS = 60000;
const ON_TIMER_MAX_SECONDS = 86400;

const statuses = new Map();          // topic -> { data, receivedAt }
const watchedTopics = new Set();
const subscribeErrors = new Map();   // topic -> { message, at }
const lastStatusRequest = new Map(); // topic -> ms
const lanErrors = new Map();         // topic -> last LAN error message
let connecting = null;

mqttService.on('message', (item) => {
  if (watchedTopics.has(item.topic)) handleMessage(item);
});
// Replies of LAN commands (deviceLanService), same format as MQTT messages.
lan.on('message', handleMessage);

function handleMessage(item) {
  let data;
  try {
    data = JSON.parse(item.payload);
  } catch (e) {
    return;
  }
  if (!data || typeof data !== 'object') return;
  if (lan.isLanIp(data.ip)) lan.rememberIp(item.topic, data.ip);
  const previous = statuses.get(item.topic);
  if (data.cmd === 'COUNTDOWN_ACK') {
    if (previous && isOnTimerSeconds(data.remain)) {
      previous.countdown = { remaining: data.remain, mask: Number.isInteger(data.mask) ? data.mask : null, at: Date.now() };
    }
    return;
  }
  if (data.va === undefined && data.co === undefined) return;
  // Status messages the device sends on its own (e.g. after a button press)
  // carry no "set"/"tim"; keep the values of the last STATUS_GET reply.
  const settings = Array.isArray(data.set) ? data.set : previous ? previous.settings : null;
  const onTimer = isOnTimerSeconds(data.tim) ? data.tim : previous ? previous.onTimer : null;
  // "cd" counts down on the device; "at" lets describeStatus() age it.
  let countdown = previous ? previous.countdown : null;
  if (isOnTimerSeconds(data.cd)) {
    const mask = countdown && data.cd > 0 ? countdown.mask : null;
    countdown = { remaining: data.cd, mask, at: Date.now() };
  }
  const ip = lan.isLanIp(data.ip) ? data.ip : previous ? previous.ip : null;
  const via = item.via === 'lan' ? 'lan' : 'mqtt';
  const mqttAt = via === 'mqtt' ? Date.now() : previous ? previous.mqttAt : null;
  statuses.set(item.topic, { data, settings, onTimer, countdown, ip, via, mqttAt, receivedAt: item.time });
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

function publishCommand(topic, command) {
  if (!isAllowedByAcl('publish', topic)) {
    const error = new Error('Broker không cho web_manager gửi lệnh tới topic ' + topic + ' (mqtt_acl.json)');
    error.status = 400;
    return Promise.reject(error);
  }
  return mqttService.publish(topic, JSON.stringify(command));
}

function clientId() {
  return (mqttService.options && mqttService.options.clientId) || process.env.MQTT_CLIENT_ID || 'web_manager';
}

// Which way a command for this device goes: 'mqtt' or 'lan'.
function route(device, mode) {
  if (mode === 'lan' || mode === 'mqtt') return mode;
  const hasIp = !!lan.getIp(device.mqtt_pub);
  if (!hasIp) return 'mqtt';
  if (!mqttService.isConnected()) return 'lan';
  const entry = statuses.get(device.mqtt_pub);
  return entry && entry.mqttAt && Date.now() - entry.mqttAt < MQTT_FRESH_MS ? 'mqtt' : 'lan';
}

/**
 * Sends a command (the same JSON for both ways). Over LAN the device's
 * replies arrive as messages on device.mqtt_pub before this resolves; over
 * MQTT they arrive later. Resolves with the route used.
 */
async function sendCommand(device, command, mode) {
  const way = route(device, mode);
  if (way === 'lan') {
    watchedTopics.add(device.mqtt_pub);
    try {
      await lan.request(device, command, clientId());
      lanErrors.delete(device.mqtt_pub);
    } catch (error) {
      lanErrors.set(device.mqtt_pub, error.message);
      throw error;
    }
  } else {
    await publishCommand(device.mqtt_sub, command);
  }
  return way;
}

async function requestStatus(device, force, mode) {
  const way = route(device, mode);
  const topic = device.mqtt_pub;
  const interval = way === 'lan' ? LAN_STATUS_REQUEST_INTERVAL_MS : STATUS_REQUEST_INTERVAL_MS;
  const last = lastStatusRequest.get(topic) || 0;
  if (!force && Date.now() - last < interval) return;
  lastStatusRequest.set(topic, Date.now());
  try {
    await sendCommand(device, STATUS_REQUEST, way);
  } catch (e) {
    // The status stays unknown; the page shows the MQTT or LAN error.
  }
}

async function control(device, value, mode) {
  const way = await sendCommand(device, { com: COMMAND_CONTROL, value }, mode);
  setTimeout(() => { requestStatus(device, true, way); }, STATUS_AFTER_CONTROL_MS);
  return way;
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
// humidity/temperature in hundredths plus an ADC value and drives 1 output.
function describeStatus(entry) {
  if (!entry) return null;
  const va = toNumbers(entry.data.va);
  const co = toNumbers(entry.data.co);
  const esp32 = va.length >= 7;
  const sensors = esp32 ? [
    { label: 'Độ ẩm', value: va[0], unit: '%' },
    { label: 'Nhiệt độ', value: va[1], unit: '°C' },
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
    model: esp32 ? 'DeviceIOT' : 'DeviceIOT8266',
    channels: esp32 ? 2 : 1,
    port,
    on: port == null ? null : port !== 0,
    buttonClick: Number.isFinite(co[1]) ? co[1] : null,
    buttonStatus: Number.isFinite(co[2]) ? co[2] : null,
    commandCount: Number.isFinite(co[3]) ? co[3] : null,
    sensors: sensors.filter((sensor) => Number.isFinite(sensor.value)),
    // Active schedules from STATUS_GET; null until the device has answered one.
    settings: parseSettings(entry.settings),
    // Auto OFF on-timer in seconds (0 = off); null until the device reported it.
    onTimer: entry.onTimer == null ? null : entry.onTimer,
    // Countdown auto ON: seconds left now (0 = idle), null until reported.
    countdown: describeCountdown(entry.countdown),
    countdownMask: entry.countdown && entry.countdown.mask ? entry.countdown.mask : null,
    // LAN address the device reported; how the last status arrived.
    ip: entry.ip || null,
    via: entry.via || 'mqtt',
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

// LAN details for the page: known address and the last LAN error.
function getLan(topic) {
  return Object.assign(lan.describe(topic), { error: lanErrors.get(topic) || null });
}

module.exports = {
  ensureConnected, watch, publishCommand, route, sendCommand, requestStatus, control, getStatus, getLan,
  setLanIp: lan.setManualIp,
};
