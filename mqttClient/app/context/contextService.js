const knex = require('../../config/knex.js');
const broker = require('./brokerClient.js');
const { ContextEngine, CONDITIONS } = require('./contextEngine.js');

/**
 * Ngữ cảnh của mqttClient: lưu trong bảng MySQL mqtt_context, nạp vào RAM khi
 * khởi động; thêm/sửa/xóa ghi SQL rồi cập nhật RAM ngay. Logic chạy trong
 * contextEngine.js; ở đây nối với SQL và broker MQTT (brokerClient.js):
 *   - nghe bản tin trạng thái trên topic publish của thiết bị (sự kiện MQTT),
 *   - hỏi trạng thái định kỳ ({"com":2}) để có cảm biến / trạng thái mới (thời gian),
 *   - gửi {"com":1,...,"pa"} tới topic subscribe của thiết bị đích,
 *   - nghe topic subscribe của thiết bị: lệnh com:1 không do mqttClient gửi
 *     (web_manager, app) là điều khiển thủ công -> ưu tiên thủ công.
 * Thiết bị lấy từ bảng mqtt_microservice (cùng database với web_manager).
 */
const TABLE = 'mqtt_context';
const DEVICE_TABLE = 'mqtt_microservice';
const TICK_MS = 1000;
// {"com":2} (full status) to every device used by a context; keeps sensors and
// the online check fresh (DeviceIOT does not publish sensor changes on its own).
const POLL_MS = 30000;
const COMMAND_STATUS = 2;
const RESULT_WRONG_PASSWORD = 6;
const PASSWORD_ERROR = 'Thiết bị từ chối lệnh: sai mật khẩu thiết bị (mqtt_pass khác mật khẩu đã cài trên thiết bị).';
const LIMITS = {
  content: [1, 12], state: [-1000000000, 1000000000], action: [0, 0xFFFF], priority: [0, 100],
  cooldown_s: [0, 86400], timeout_s: [1, 600], retry: [0, 10],
};

const devices = new Map();       // mqtt_microservice_id -> device row
const pubToDevice = new Map();   // device publish topic -> id (status)
const subToDevice = new Map();   // device subscribe topic -> id (commands)
const engine = new ContextEngine({
  send: (deviceId, command) => {
    const device = devices.get(deviceId);
    if (!device) return Promise.reject(new Error('thiết bị đích không còn tồn tại'));
    return broker.publish(device.mqtt_sub, withPassword(device, command));
  },
  log: (level, message) => (level === 'warn' ? console.warn : console.log)('[Context] ' + message),
});
let started = false;
let loaded = false;

// "pa": the device password, checked by the firmware on every command.
function withPassword(device, command) {
  return device.mqtt_pass ? Object.assign({}, command, { pa: device.mqtt_pass }) : command;
}

// mqttClient has no migrations: the table is created on the first start.
async function ensureTable() {
  if (await knex.schema.hasTable(TABLE)) return;
  await knex.schema.createTable(TABLE, (table) => {
    table.increments('mqtt_context_id').primary().unsigned();
    // Account that owns the context (same key as mqtt_microservice.mqtt_user).
    table.string('mqtt_user', 40).notNullable().index();
    table.string('name', 100).nullable();
    table.integer('source_device_id').notNullable().index();
    table.integer('target_device_id').notNullable().index();
    table.tinyint('content').notNullable();
    table.integer('state').notNullable();
    table.integer('action').notNullable();
    table.tinyint('enabled').notNullable().defaultTo(1);
    table.integer('priority').notNullable().defaultTo(0);
    table.integer('cooldown_s').notNullable().defaultTo(30);
    table.integer('timeout_s').notNullable().defaultTo(10);
    table.integer('retry').notNullable().defaultTo(2);
    table.datetime('created_at').nullable();
    table.datetime('updated_at').nullable();
    table.integer('id_created').nullable();
    table.integer('id_updated').nullable();
    table.integer('deleteflag').notNullable().defaultTo(0);
  });
  console.log('[Context] Created table ' + TABLE);
}

function toContext(row) {
  return {
    id: row.mqtt_context_id,
    owner: row.mqtt_user,
    name: row.name || '',
    sourceDeviceId: row.source_device_id,
    targetDeviceId: row.target_device_id,
    content: row.content,
    state: row.state,
    action: row.action,
    enabled: row.enabled === 1 || row.enabled === true,
    priority: row.priority,
    cooldownS: row.cooldown_s,
    timeoutS: row.timeout_s,
    retry: row.retry,
  };
}

async function loadDevices() {
  const rows = await knex(DEVICE_TABLE)
    .select('mqtt_microservice_id', 'mqtt_pub', 'mqtt_sub', 'mqtt_pass', 'mqtt_user')
    .where({ deleteflag: 0 });
  devices.clear();
  pubToDevice.clear();
  subToDevice.clear();
  rows.forEach((row) => {
    devices.set(row.mqtt_microservice_id, row);
    pubToDevice.set(row.mqtt_pub, row.mqtt_microservice_id);
    subToDevice.set(row.mqtt_sub, row.mqtt_microservice_id);
  });
}

// Devices used by at least one context.
function usedDevices() {
  const ids = new Set();
  engine.contexts.forEach((context) => {
    ids.add(context.sourceDeviceId);
    ids.add(context.targetDeviceId);
  });
  return [...ids].map((id) => devices.get(id)).filter(Boolean);
}

function watchUsedDevices() {
  const topics = [];
  usedDevices().forEach((device) => topics.push(device.mqtt_pub, device.mqtt_sub));
  broker.subscribe(topics);
}

function parseStatus(data) {
  const status = {};
  const co = String(data.co == null ? '' : data.co).split(',').map(Number);
  if (data.co !== undefined && Number.isInteger(co[0])) status.port = co[0];
  if (data.co !== undefined && Number.isInteger(co[1])) status.button = co[1];
  if (data.va !== undefined) status.sensors = String(data.va).split(',').map(Number);
  return status;
}

function handleMessage(topic, payload) {
  if (!loaded) return;
  let data;
  try {
    data = JSON.parse(payload);
  } catch (e) {
    return;
  }
  if (!data || typeof data !== 'object') return;

  // A command sent to a device by someone else: manual control.
  const commandedId = subToDevice.get(topic);
  if (commandedId !== undefined) {
    if (data.com === 1 && !broker.isOwnMessage(payload)) engine.noteManual(commandedId);
    return;
  }

  const deviceId = pubToDevice.get(topic);
  if (deviceId === undefined) return;
  if (data.rs === RESULT_WRONG_PASSWORD && data.va === undefined && data.co === undefined) {
    engine.handleRejected(deviceId, PASSWORD_ERROR);
    return;
  }
  if (data.va === undefined && data.co === undefined) return;
  engine.handleStatus(deviceId, parseStatus(data));
}

async function poll() {
  try {
    await loadDevices();
    watchUsedDevices();
    if (!broker.isConnected()) return;
    usedDevices().forEach((device) => {
      broker.publish(device.mqtt_sub, withPassword(device, { com: COMMAND_STATUS })).catch(() => {});
    });
  } catch (error) {
    console.warn('[Context] ' + error.message);
  }
}

// Called once at server start; retries the SQL load until it works.
async function start() {
  if (started) return;
  started = true;
  broker.on('message', handleMessage);
  try {
    broker.connect();
  } catch (error) {
    console.error('[Context] ' + error.message + '; contexts cannot send commands');
  }
  const load = async () => {
    try {
      await ensureTable();
      await loadDevices();
      const rows = await knex(TABLE).where({ deleteflag: 0 });
      engine.setContexts(rows.map(toContext));
      loaded = true;
      console.log('[Context] Loaded ' + rows.length + ' context(s)');
      poll();
      setInterval(poll, POLL_MS);
      setInterval(() => engine.tick(), TICK_MS);
    } catch (error) {
      console.warn('[Context] Cannot load contexts (' + error.message + '); retrying in 60 s');
      setTimeout(load, 60000);
    }
  };
  await load();
}

function badRequest(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readInt(body, field, fallback) {
  const raw = body[field];
  const value = raw == null || raw === '' ? fallback : Number(raw);
  const [min, max] = LIMITS[field];
  if (!Number.isInteger(value) || value < min || value > max) {
    throw badRequest(field + ' phải là số nguyên từ ' + min + ' đến ' + max + '.');
  }
  return value;
}

async function ownDevice(owner, id) {
  const device = await knex(DEVICE_TABLE)
    .select('mqtt_microservice_id')
    .where({ mqtt_microservice_id: Number(id) || 0, mqtt_user: owner, deleteflag: 0 })
    .first();
  if (!device) throw badRequest('Thiết bị ' + id + ' không thuộc tài khoản này.');
  return device.mqtt_microservice_id;
}

async function readContext(owner, body) {
  const row = {
    name: String(body.name == null ? '' : body.name).trim().slice(0, 100),
    source_device_id: await ownDevice(owner, body.source_device_id),
    target_device_id: await ownDevice(owner, body.target_device_id),
    content: readInt(body, 'content'),
    state: readInt(body, 'state'),
    action: readInt(body, 'action'),
    enabled: body.enabled === false || body.enabled === 0 || body.enabled === '0' ? 0 : 1,
    priority: readInt(body, 'priority', 0),
    cooldown_s: readInt(body, 'cooldown_s', 30),
    timeout_s: readInt(body, 'timeout_s', 10),
    retry: readInt(body, 'retry', 2),
  };
  if (!CONDITIONS[row.content]) throw badRequest('content không hợp lệ.');
  if (row.content <= 4 && (row.state < 1 || row.state > 255)) {
    throw badRequest('Với content 1..4, state là bitmask cổng 1..255.');
  }
  return row;
}

function describe(context) {
  return Object.assign({}, context, { runtime: engine.status(context.id) });
}

function list(owner) {
  const result = [];
  engine.contexts.forEach((context) => {
    if (context.owner === owner) result.push(describe(context));
  });
  return result.sort((a, b) => a.id - b.id);
}

// Creates (no id) or updates a context: SQL first, then RAM.
async function save(owner, userId, body) {
  if (!loaded) throw badRequest('Ngữ cảnh chưa nạp xong từ SQL.', 503);
  const row = await readContext(owner, body);
  const now = knex.fn.now();
  let id = Number(body.mqtt_context_id) || 0;
  if (id) {
    const updated = await knex(TABLE).where({ mqtt_context_id: id, mqtt_user: owner, deleteflag: 0 })
      .update(Object.assign({}, row, { updated_at: now, id_updated: userId }));
    if (!updated) throw badRequest('Không tìm thấy ngữ cảnh ' + id + '.', 404);
  } else {
    const inserted = await knex(TABLE).insert(Object.assign({}, row, {
      mqtt_user: owner, created_at: now, updated_at: now, id_created: userId, id_updated: userId, deleteflag: 0,
    }));
    id = inserted[0];
  }
  const saved = await knex(TABLE).where({ mqtt_context_id: id }).first();
  await loadDevices();
  engine.upsertContext(toContext(saved));
  watchUsedDevices();
  return describe(engine.contexts.get(id));
}

async function remove(owner, id) {
  const removed = await knex(TABLE).where({ mqtt_context_id: Number(id) || 0, mqtt_user: owner, deleteflag: 0 })
    .update({ deleteflag: 1, updated_at: knex.fn.now() });
  if (!removed) throw badRequest('Không tìm thấy ngữ cảnh ' + id + '.', 404);
  engine.removeContext(Number(id));
}

module.exports = { start, list, save, remove, engine };
