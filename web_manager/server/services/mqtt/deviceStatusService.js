const fs = require('fs');
const path = require('path');
const mqttService = require('./mqttService.js');

/**
 * Trạng thái thiết bị cho trang điều khiển (View/mqtt/device-control.ejs).
 * Dùng chung kết nối MQTT duy nhất của mqttService: theo dõi topic publish
 * của từng thiết bị và gửi lệnh tới topic subscribe của nó.
 *
 * Firmware (DeviceIOT / DeviceIOT8266):
 *   lệnh   {"com":1,"value":<bitmask kênh>}   {"com":2} = yêu cầu trạng thái
 *   trạng thái {"va":"<cảm biến>","co":"device_port,button_click,button_status,count_info"}
 */
const COMMAND_CONTROL = 1;
const COMMAND_STATUS = 2;
const STATUS_REQUEST_INTERVAL_MS = 15000;
// The firmware replies to a command before its device task applies it.
const STATUS_AFTER_CONTROL_MS = 1500;
const SUBSCRIBE_RETRY_MS = 60000;

const statuses = new Map();          // topic -> { data, receivedAt }
const watchedTopics = new Set();
const subscribeErrors = new Map();   // topic -> { message, at }
const lastStatusRequest = new Map(); // topic -> ms
let connecting = null;

mqttService.on('message', (item) => {
  if (!watchedTopics.has(item.topic)) return;
  let data;
  try {
    data = JSON.parse(item.payload);
  } catch (e) {
    return;
  }
  if (!data || typeof data !== 'object' || (data.va === undefined && data.co === undefined)) return;
  statuses.set(item.topic, { data, receivedAt: item.time });
});

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

async function requestStatus(topic, force) {
  const last = lastStatusRequest.get(topic) || 0;
  if (!force && Date.now() - last < STATUS_REQUEST_INTERVAL_MS) return;
  lastStatusRequest.set(topic, Date.now());
  try {
    await publishCommand(topic, { com: COMMAND_STATUS });
  } catch (e) {
    // The status stays unknown; the page shows the subscribe/publish error.
  }
}

async function control(subscribeTopic, value) {
  await publishCommand(subscribeTopic, { com: COMMAND_CONTROL, value });
  setTimeout(() => { requestStatus(subscribeTopic, true); }, STATUS_AFTER_CONTROL_MS);
}

function toNumbers(text) {
  return String(text == null ? '' : text).split(',').map((part) => Number(part.trim()));
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
    receivedAt: entry.receivedAt,
  };
}

function getStatus(topic) {
  return describeStatus(statuses.get(topic));
}

module.exports = { ensureConnected, watch, requestStatus, control, getStatus };
