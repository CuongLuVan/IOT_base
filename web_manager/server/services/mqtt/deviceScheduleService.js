const mqttService = require('./mqttService.js');
const deviceStatus = require('./deviceStatusService.js');
const lan = require('./deviceLanService.js');

/**
 * Lịch cục bộ của thiết bị (DeviceIOT / DeviceIOT8266, docs/Schedule.md).
 * Lịch nằm trong EEPROM của thiết bị; web_manager không lưu bản sao nào mà
 * gửi lệnh số tới topic subscribe và chờ thiết bị trả lời trên topic publish:
 *   {"com":8|9,"id","ho","mi","we","po","pos","au"} thêm / sửa, 10 xóa,
 *   11 bật/tắt ("value" 1/0), 12 xóa hết   -> bản tin trạng thái + "rc","rs","id"
 *   {"com":13,"fr":n}                      -> {"rc":13,"mx","cv","nx","it":[[...]]}
 * Hẹn giờ tự tắt (độc lập với lịch, 4 byte trong EEPROM của thiết bị):
 *   {"com":5,"value":n} (0 = tắt) / {"com":5} -> bản tin trạng thái + "rc":5, "tim"
 * Đếm ngược tự bật (một lần, chỉ trong RAM của thiết bị):
 *   {"com":4,"value":n,"mask":m} (0 = hủy, không value = đọc)
 *                                                  -> {"cmd":"COUNTDOWN_ACK","remain":n,"mask":m,"sec":n}
 * mode ('auto' | 'mqtt' | 'lan'): đường gửi, xem deviceStatusService.route().
 * Qua LAN thiết bị trả lời ngay trong HTTP; bản tin được phát lại như tin MQTT.
 */
const REPLY_TIMEOUT_MS = 8000;
const COMMAND_SCHEDULE_LIST = 13;
// "rs" of a command reply (firmware ScheduleEngine::Status).
const RESULT_NAMES = ['SUCCESS', 'CONFLICT', 'INVALID', 'NOT_FOUND', 'ID_EXISTS', 'NOT_READY'];
// The device sends only the code; the reason is in its Serial log.
const RESULT_MESSAGES = {
  INVALID: 'dữ liệu không hợp lệ hoặc thời điểm đã qua',
  NOT_FOUND: 'không có lịch này',
  ID_EXISTS: 'id đã được dùng',
  NOT_READY: 'bộ lập lịch chưa sẵn sàng',
};
// The firmware returns at most 10 rows per {"com":13}; 20 schedules = 2 pages.
const MAX_LIST_PAGES = 3;

const waiters = new Set();

mqttService.on('message', resolveWaiters);
lan.on('message', resolveWaiters);

function resolveWaiters(item) {
  if (!waiters.size) return;
  let data;
  try {
    data = JSON.parse(item.payload);
  } catch (e) {
    return;
  }
  if (!data || typeof data !== 'object') return;
  waiters.forEach((waiter) => {
    if (waiter.topic === item.topic && waiter.match(data)) {
      clearTimeout(waiter.timer);
      waiters.delete(waiter);
      waiter.resolve(data);
    }
  });
}

function waitForReply(topic, match) {
  const waiter = { topic, match };
  waiter.promise = new Promise((resolve, reject) => {
    waiter.resolve = resolve;
    waiter.timer = setTimeout(() => {
      waiters.delete(waiter);
      const error = new Error('Thiết bị không phản hồi sau ' + REPLY_TIMEOUT_MS / 1000 +
        ' giây (thiết bị mất kết nối hoặc firmware chưa hỗ trợ lệnh này).');
      error.status = 504;
      reject(error);
    }, REPLY_TIMEOUT_MS);
  });
  waiters.add(waiter);
  return waiter;
}

// The waiter is registered before publishing so a fast reply is not missed.
async function request(device, command, match, mode) {
  const waiter = waitForReply(device.mqtt_pub, match);
  try {
    await deviceStatus.sendCommand(device, command, mode);
  } catch (error) {
    clearTimeout(waiter.timer);
    waiters.delete(waiter);
    throw error;
  }
  return waiter.promise;
}

// Row of {"com":13}: id,ho,mi,we,po,pos,au,en,dn,date.
function toSchedule(row) {
  return {
    id: Number(row[0]),
    hour: Number(row[1]),
    minute: Number(row[2]),
    weekday: Number(row[3]),
    portMask: Number(row[4]),
    portState: Number(row[5]),
    autoOff: Number(row[6]),
    enabled: Number(row[7]) === 1,
    done: Number(row[8]) === 1,
    date: row[9] || '',
  };
}

function toResult(reply) {
  const status = RESULT_NAMES[reply.rs] || 'ERROR';
  return {
    status,
    message: RESULT_MESSAGES[status] || (status === 'ERROR' ? 'mã kết quả ' + reply.rs : ''),
    conflictId: reply.ci,
    conflictPorts: reply.cp,
  };
}

async function list(device, mode) {
  const schedules = [];
  let from = 1;
  let reply = null;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    reply = await request(device, { com: COMMAND_SCHEDULE_LIST, fr: from },
      (data) => data.rc === COMMAND_SCHEDULE_LIST && Array.isArray(data.it), mode);
    reply.it.forEach((row) => {
      if (Array.isArray(row) && row.length >= 9) schedules.push(toSchedule(row));
    });
    const next = Number(reply.nx) || 0;
    if (next <= from) break;
    from = next;
  }
  return {
    schedules,
    max: Number(reply && reply.mx) || 20,
    clockValid: reply ? Number(reply.cv) === 1 : null,
  };
}

// command: {com:8..12, ...}; the reply carries "rc" = com and "id" (absent for 12).
async function send(device, command, mode) {
  const id = command.id || 0;
  const reply = await request(device, command, (data) =>
    data.rc === command.com && Number.isInteger(data.rs) && (Number(data.id) || 0) === id, mode);
  return toResult(reply);
}

// command is {com:5} (read) or {com:5, value}; seconds is the device's value
// after the command ("tim" of the reply).
async function onTimer(device, command, mode) {
  const reply = await request(device, command, (data) =>
    data.rc === command.com && Number.isInteger(data.rs), mode);
  const result = toResult(reply);
  return {
    status: result.status,
    message: result.status === 'INVALID' ? 'thời gian phải từ 1 giây đến 24 giờ' : result.message,
    seconds: Number.isInteger(reply.tim) ? reply.tim : null,
  };
}

// command is {com:4} (read), {com:4, value:0} (cancel) or {com:4, value, mask}.
async function countdown(device, command, mode) {
  const ack = await request(device, command, (data) => data.cmd === 'COUNTDOWN_ACK', mode);
  return {
    status: ack.status,
    message: ack.message,
    remaining: Number.isInteger(ack.remain) ? ack.remain : null,
    mask: Number.isInteger(ack.mask) ? ack.mask : 0,
    seconds: Number.isInteger(ack.sec) ? ack.sec : null,
  };
}

module.exports = { list, send, onTimer, countdown };
