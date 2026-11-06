const { getCollection } = require('./mongoClient.js');

/**
 * Lịch sử trạng thái thiết bị từ MongoDB, do mqttClient/LissenAndReply.js ghi:
 *   { topic: <topic publish của thiết bị>, content: { payload, packet }, time: <ms> }
 * Bản tin trạng thái là payload có "va" (cảm biến) hoặc "co" (cổng, nút, số lệnh).
 *
 * Bỏ trùng: một bản tin chỉ được lấy khi trạng thái (va + co) khác bản tin
 * liền trước nó; bản tin ghi lặp (QoS 1, logger ghi hai lần) và bản tin định
 * kỳ không có gì thay đổi bị bỏ qua. Trạng thái quay lại giá trị cũ sau một
 * thay đổi vẫn được tính (A, B, A).
 *
 * Nên có index { topic: 1, time: -1 } trên collection, nếu không mỗi truy
 * vấn phải quét và sắp xếp toàn bộ bản tin của collection.
 */
const SOURCE = Object.freeze({
  database: process.env.MONGODB_DB || 'iot',
  collection: process.env.MONGODB_DEVICE_COLLECTION || 'sensor_data',
});
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
// Upper bound of documents read for one request (many identical messages in a row).
const MAX_SCAN = 5000;
const BATCH_SIZE = 200;
// Security / replay fields added by the broker path: not part of the state.
const HIDDEN_FIELDS = new Set(['timestamp', 'nonce', 'signature', 'keyId', 'pa']);

function stateKey(payload) {
  return JSON.stringify([payload.va === undefined ? null : payload.va, payload.co === undefined ? null : payload.co]);
}

function cleanPayload(payload) {
  const result = {};
  Object.keys(payload).forEach((key) => {
    if (!HIDDEN_FIELDS.has(key)) result[key] = payload[key];
  });
  return result;
}

/**
 * Newest first. documents: async iterable of { time, content: { payload } }.
 * Returns { history, scanned }.
 */
async function collectDistinct(documents, limit) {
  const history = [];
  let previousKey = null;
  let scanned = 0;
  for await (const document of documents) {
    scanned++;
    const payload = document && document.content ? document.content.payload : null;
    if (!payload || typeof payload !== 'object' || (payload.va === undefined && payload.co === undefined)) continue;
    // {"co":6,"va":"<digits>"}: ASCON key announcement of old firmware (new firmware sends
    // {"rc":7,"rs":0,"ky":..} without va / co), not a status message; never shown.
    if (typeof payload.co === 'number') continue;
    const key = stateKey(payload);
    if (key === previousKey) continue;
    previousKey = key;
    history.push({ time: document.time, payload: cleanPayload(payload) });
    if (history.length >= limit) break;
  }
  return { history, scanned };
}

function readLimit(value) {
  if (value === undefined || value === null || value === '') return DEFAULT_LIMIT;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    const error = new Error('limit phải là số nguyên từ 1 đến ' + MAX_LIMIT);
    error.statusCode = 400;
    throw error;
  }
  return limit;
}

// The newest distinct states published on topic.
async function getDeviceHistory(topic, limit = DEFAULT_LIMIT) {
  const collection = await getCollection(SOURCE);
  const cursor = collection
    .find(
      { topic, $or: [{ 'content.payload.va': { $exists: true } }, { 'content.payload.co': { $exists: true } }] },
      { projection: { _id: 0, time: 1, 'content.payload': 1 } },
    )
    .sort({ time: -1 })
    .limit(MAX_SCAN)
    .batchSize(BATCH_SIZE);
  try {
    return await collectDistinct(cursor, limit);
  } finally {
    await cursor.close();
  }
}

/**
 * Thống kê số lần bật / tắt trong một khoảng gần nhất:
 *   - theo ngày:  { days: 1..31 }   (vd. 7, 30 ngày; tính cả hôm nay)
 *   - theo tháng: { months: 1..12 } (12 tháng = 1 năm; tính cả tháng này)
 *
 * Chỉ dùng phần tử đầu của "co" (device_port, bit0 = kênh 1, bit1 = kênh 2).
 * Bỏ trùng: một lần bật / tắt chỉ được tính khi bit của kênh khác bản tin
 * trạng thái liền trước; bản tin ghi lặp (cùng thời điểm, QoS 1) và bản tin
 * định kỳ giữ nguyên cổng không được tính. Trạng thái gốc là bản tin cuối
 * cùng trước cửa sổ thời gian (nếu có), nên lần đổi đầu tiên trong cửa sổ
 * vẫn được đếm. "co" dạng số (vd. {"co":6} công bố khóa ASCON của firmware cũ;
 * firmware mới gửi {"rc":7,"rs":0,"ky":..} không có co) không phải bản tin trạng thái và bị bỏ qua.
 */
const DEFAULT_DAYS = 7;
const MAX_DAYS = 31;
const MAX_MONTHS = 12;
// Số bản tin đọc tối đa cho một yêu cầu (1 năm, thiết bị gửi dày).
const MAX_STATS_SCAN = Number(process.env.DEVICE_STATS_MAX_SCAN || 3000000);
const STATS_BATCH_SIZE = 5000;
const MAX_CHANNELS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;
// Ngày / tháng được chia theo giờ Việt Nam (UTC+7) trừ khi cấu hình khác (phút).
const TZ_OFFSET_MS = Number(process.env.DEVICE_STATS_TZ_OFFSET_MIN || 420) * 60 * 1000;

function readPort(payload) {
  if (!payload || typeof payload.co !== 'string') return null;
  const port = Number(payload.co.split(',')[0].trim());
  return Number.isInteger(port) && port >= 0 && port <= 255 ? port : null;
}

// "YYYY-MM-DD" theo giờ địa phương.
function dayKey(time) {
  return new Date(Number(time) + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

// "YYYY-MM" theo giờ địa phương.
function monthKey(time) {
  return dayKey(time).slice(0, 7);
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function isEmpty(value) {
  return value === undefined || value === null || value === '';
}

function readInteger(value, name, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > max) {
    throw badRequest(name + ' phải là số nguyên từ 1 đến ' + max);
  }
  return number;
}

// Khoảng tùy chọn { from, to }: tối đa 366 ngày; theo ngày tối đa 92 ngày (92 dòng).
const MAX_RANGE_DAYS = 366;
const MAX_RANGE_DAY_ROWS = 92;
// Không truyền groupBy: khoảng tới 62 ngày chia theo ngày, dài hơn chia theo tháng.
const AUTO_DAY_RANGE_DAYS = 62;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// "YYYY-MM-DD" (ngày địa phương) -> mốc 00:00 giờ địa phương (ms).
function readLocalDate(value, name) {
  const match = DATE_PATTERN.exec(typeof value === 'string' ? value.trim() : '');
  if (!match) throw badRequest(name + ' phải có dạng YYYY-MM-DD');
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const utc = Date.UTC(year, month - 1, day);
  if (new Date(utc).toISOString().slice(0, 10) !== match[0]) throw badRequest(name + ' không phải ngày hợp lệ');
  return utc - TZ_OFFSET_MS;
}

/**
 * body (chọn một trong ba cách):
 *   { days: 1..31 }                        ngày gần nhất, chia theo ngày
 *   { months: 1..12 }                      tháng gần nhất, chia theo tháng
 *   { from, to: "YYYY-MM-DD", groupBy? }   khoảng tùy chọn (tính cả from và to, giờ địa phương),
 *                                          groupBy 'day' | 'month' (mặc định tự chọn)
 * Không truyền gì = DEFAULT_DAYS ngày.
 * Trả về { groupBy: 'day' | 'month', count } hoặc thêm { from, to } (ms) với khoảng tùy chọn.
 */
function readPeriod(body = {}) {
  const usesRange = !isEmpty(body.from) || !isEmpty(body.to);
  const modes = [usesRange, !isEmpty(body.days), !isEmpty(body.months)].filter(Boolean).length;
  if (modes > 1) throw badRequest('Chỉ truyền một trong: days, months, from/to');
  if (usesRange) return readRange(body);
  if (!isEmpty(body.groupBy)) throw badRequest('groupBy chỉ dùng với from/to');
  if (!isEmpty(body.months)) {
    return { groupBy: 'month', count: readInteger(body.months, 'months', MAX_MONTHS) };
  }
  if (isEmpty(body.days)) return { groupBy: 'day', count: DEFAULT_DAYS };
  return { groupBy: 'day', count: readInteger(body.days, 'days', MAX_DAYS) };
}

function readRange(body) {
  if (isEmpty(body.from) || isEmpty(body.to)) throw badRequest('Cần truyền cả from và to');
  const from = readLocalDate(body.from, 'from');
  const to = readLocalDate(body.to, 'to');
  if (from > to) throw badRequest('from phải trước hoặc bằng to');
  const count = Math.round((to - from) / DAY_MS) + 1;
  if (count > MAX_RANGE_DAYS) throw badRequest('Khoảng thời gian tối đa ' + MAX_RANGE_DAYS + ' ngày');
  let groupBy = body.groupBy;
  if (isEmpty(groupBy)) groupBy = count <= AUTO_DAY_RANGE_DAYS ? 'day' : 'month';
  if (groupBy !== 'day' && groupBy !== 'month') throw badRequest("groupBy phải là 'day' hoặc 'month'");
  if (groupBy === 'day' && count > MAX_RANGE_DAY_ROWS) {
    throw badRequest('Chia theo ngày tối đa ' + MAX_RANGE_DAY_ROWS + ' ngày, hãy chọn theo tháng');
  }
  return { groupBy, count, from, to };
}

/**
 * Các nhóm (ngày hoặc tháng) của khoảng thời gian, cũ nhất trước.
 * days / months: tính cả ngày / tháng hiện tại, kết thúc ở now.
 * from / to: từ 00:00 ngày from tới hết ngày to (không quá now).
 * Trả về { start, end (ms), keys, keyOf }.
 */
function buildBuckets(now, period) {
  if (period.from !== undefined) return buildRangeBuckets(now, period);
  return Object.assign({ end: now }, buildRecentBuckets(now, period));
}

function buildRangeBuckets(now, { groupBy, from, to }) {
  if (from > now) throw badRequest('from không được ở tương lai');
  const end = Math.min(to + DAY_MS - 1, now);
  const keys = [];
  if (groupBy === 'month') {
    const first = new Date(from + TZ_OFFSET_MS);
    const last = new Date(to + TZ_OFFSET_MS);
    const months = (last.getUTCFullYear() - first.getUTCFullYear()) * 12 + last.getUTCMonth() - first.getUTCMonth();
    for (let index = 0; index <= months; index++) {
      keys.push(new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + index, 1)).toISOString().slice(0, 7));
    }
    return { start: from, end, keys, keyOf: monthKey };
  }
  for (let time = from; time <= to; time += DAY_MS) keys.push(dayKey(time));
  return { start: from, end, keys, keyOf: dayKey };
}

function buildRecentBuckets(now, { groupBy, count }) {
  if (groupBy === 'month') {
    const local = new Date(now + TZ_OFFSET_MS);
    const year = local.getUTCFullYear();
    const month = local.getUTCMonth();
    const keys = [];
    for (let index = count - 1; index >= 0; index--) {
      keys.push(new Date(Date.UTC(year, month - index, 1)).toISOString().slice(0, 7));
    }
    return { start: Date.UTC(year, month - (count - 1), 1) - TZ_OFFSET_MS, keys, keyOf: monthKey };
  }
  const localMidnight = Math.floor((now + TZ_OFFSET_MS) / DAY_MS) * DAY_MS - TZ_OFFSET_MS;
  const start = localMidnight - (count - 1) * DAY_MS;
  const keys = [];
  for (let index = 0; index < count; index++) keys.push(dayKey(start + index * DAY_MS));
  return { start, keys, keyOf: dayKey };
}

/**
 * documents: async iterable, thời gian tăng dần, mỗi phần tử { time, content: { payload } }.
 * keys: các nhóm theo thứ tự; keyOf(time) -> nhóm; baselinePort: cổng trước khoảng (null nếu không biết).
 * rows[] = { key, on[], off[], totalOn, totalOff } theo thứ tự keys.
 */
async function countSwitches(documents, { keys, keyOf, baselinePort = null }) {
  const buckets = new Map();
  keys.forEach((key) => {
    buckets.set(key, { key, on: new Array(MAX_CHANNELS).fill(0), off: new Array(MAX_CHANNELS).fill(0) });
  });
  let previous = baselinePort;
  let highestBit = previous ? 31 - Math.clz32(previous) : 0;
  let scanned = 0;
  let changes = 0;
  for await (const document of documents) {
    scanned++;
    const port = readPort(document && document.content ? document.content.payload : null);
    if (port === null) continue;
    if (port) highestBit = Math.max(highestBit, 31 - Math.clz32(port));
    if (previous === null) {
      previous = port;
      continue;
    }
    const changed = port ^ previous;
    previous = port;
    if (!changed) continue;
    const bucket = buckets.get(keyOf(document.time));
    if (!bucket) continue;
    changes++;
    for (let bit = 0; bit < MAX_CHANNELS; bit++) {
      if (!(changed & (1 << bit))) continue;
      if (port & (1 << bit)) bucket.on[bit]++;
      else bucket.off[bit]++;
    }
  }
  const channels = highestBit + 1;
  const sum = (values) => values.reduce((total, value) => total + value, 0);
  const rows = keys.map((key) => {
    const bucket = buckets.get(key);
    const on = bucket.on.slice(0, channels);
    const off = bucket.off.slice(0, channels);
    return { key, on, off, totalOn: sum(on), totalOff: sum(off) };
  });
  const totals = {
    on: rows.reduce((acc, row) => acc.map((value, bit) => value + row.on[bit]), new Array(channels).fill(0)),
    off: rows.reduce((acc, row) => acc.map((value, bit) => value + row.off[bit]), new Array(channels).fill(0)),
  };
  totals.totalOn = sum(totals.on);
  totals.totalOff = sum(totals.off);
  return { channels, rows, totals, scanned, changes, currentPort: previous };
}

// period: kết quả readPeriod(). Nên có index { topic: 1, time: -1 }.
async function getSwitchStats(topic, period = { groupBy: 'day', count: DEFAULT_DAYS }, now = Date.now()) {
  const collection = await getCollection(SOURCE);
  const { start, end, keys, keyOf } = buildBuckets(now, period);
  const portFilter = { topic, 'content.payload.co': { $type: 'string' } };
  const projection = { _id: 0, time: 1, 'content.payload.co': 1 };
  const before = await collection.findOne(
    Object.assign({}, portFilter, { time: { $lt: start } }),
    { projection, sort: { time: -1 } },
  );
  const cursor = collection
    .find(Object.assign({}, portFilter, { time: { $gte: start, $lte: end } }), { projection })
    .sort({ time: 1 })
    .limit(MAX_STATS_SCAN)
    .batchSize(STATS_BATCH_SIZE);
  try {
    const stats = await countSwitches(cursor, {
      keys,
      keyOf,
      baselinePort: before ? readPort(before.content && before.content.payload) : null,
    });
    return Object.assign({
      groupBy: period.groupBy,
      count: period.count,
      custom: period.from !== undefined,
      from: start,
      to: end,
      truncated: stats.scanned >= MAX_STATS_SCAN,
    }, stats);
  } finally {
    await cursor.close();
  }
}

/**
 * Dữ liệu cảm biến ("va") để vẽ biểu đồ, khoảng thời gian theo readPeriod():
 *   - { days: 1..31 }   (mặc định 7, tính cả hôm nay): trung bình theo khung phút (bucketMs)
 *   - { months: 1..12 } (12 = 1 năm, tính cả tháng này): trung bình theo tháng dương lịch
 *
 * "va" là chuỗi số cách nhau dấu phẩy (DeviceIOT 7 giá trị, DeviceIOT8266 3;
 * độ ẩm / nhiệt độ nhân 100); giá trị trả về giữ nguyên đơn vị gốc.
 * Bản tin {"co":6,"va":"<khóa>"} (công bố khóa ASCON của firmware cũ, vẫn còn trong dữ liệu đã lưu)
 * không phải dữ liệu cảm biến và bị bỏ qua.
 *
 * Bỏ trùng: bản tin có "va" giống bản tin liền trước (ghi lặp QoS 1, bản tin
 * định kỳ không đổi giá trị) không được lấy; bản tin cuối cùng vẫn được giữ để
 * biểu đồ kéo tới thời điểm mới nhất. Các bản tin còn lại được gom theo khung
 * (phút hoặc tháng) và lấy trung bình, mỗi bản tin khác nhau có trọng số như nhau.
 */
const MAX_SENSOR_POINTS = 1500;
// Số bản tin đọc tối đa cho một yêu cầu (1 năm, thiết bị gửi dày).
const MAX_SENSOR_SCAN = Number(process.env.DEVICE_SENSOR_MAX_SCAN || 3000000);
const MINUTE_MS = 60 * 1000;

// Mốc 00:00 ngày 1 (giờ địa phương) của tháng chứa time.
function monthStart(time) {
  const local = new Date(Number(time) + TZ_OFFSET_MS);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - TZ_OFFSET_MS;
}

// Mảng số từ "va", hoặc null nếu không phải bản tin cảm biến.
function readSensorValues(payload) {
  if (!payload || typeof payload.va !== 'string' || typeof payload.co === 'number') return null;
  const parts = payload.va.split(',');
  if (parts.length < 2) return null;
  const values = parts.map((part) => (part.trim() === '' ? NaN : Number(part)));
  return values.every(Number.isFinite) ? values : null;
}

// Khung gom điểm (phút): giá trị "tròn" nhỏ nhất không vượt MAX_SENSOR_POINTS
// (1 ngày -> 1 phút, 7 ngày -> 10 phút, 30 ngày -> 30 phút).
const SENSOR_BUCKET_MINUTES = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440];

function sensorBucketMs(start, end) {
  const minutes = (end - start) / MAX_SENSOR_POINTS / MINUTE_MS;
  const step = SENSOR_BUCKET_MINUTES.find((value) => value >= minutes) || Math.ceil(minutes);
  return step * MINUTE_MS;
}

/**
 * documents: async iterable, thời gian tăng dần, mỗi phần tử { time, content: { payload } }.
 * bucketOf(time) -> mốc đầu khung (ms).
 * Trả về { sensors, points: [{ time, values[], count }], scanned, distinct }.
 * time của điểm = đầu khung; values = trung bình các bản tin khác nhau trong khung.
 */
async function collectSensorPoints(documents, { bucketOf }) {
  const buckets = new Map();
  let sensors = 0;
  let scanned = 0;
  let distinct = 0;
  let previousKey = null;
  let pending = null;

  const add = (time, values) => {
    distinct++;
    sensors = Math.max(sensors, values.length);
    const bucketTime = bucketOf(time);
    let bucket = buckets.get(bucketTime);
    if (!bucket) {
      bucket = { sums: [], counts: [], count: 0 };
      buckets.set(bucketTime, bucket);
    }
    bucket.count++;
    values.forEach((value, index) => {
      bucket.sums[index] = (bucket.sums[index] || 0) + value;
      bucket.counts[index] = (bucket.counts[index] || 0) + 1;
    });
  };

  for await (const document of documents) {
    scanned++;
    const payload = document && document.content ? document.content.payload : null;
    const values = readSensorValues(payload);
    if (!values) continue;
    const time = Number(document.time);
    if (!Number.isFinite(time)) continue;
    const key = values.join(',');
    if (key === previousKey) {
      pending = { time, values };
      continue;
    }
    previousKey = key;
    pending = null;
    add(time, values);
  }
  // Giá trị giữ nguyên tới cuối: thêm bản tin cuối để đường kéo tới thời điểm mới nhất.
  if (pending) add(pending.time, pending.values);

  const points = Array.from(buckets.keys()).sort((a, b) => a - b).map((time) => {
    const bucket = buckets.get(time);
    const values = [];
    for (let index = 0; index < sensors; index++) {
      values.push(bucket.counts[index] ? Math.round((bucket.sums[index] / bucket.counts[index]) * 100) / 100 : null);
    }
    return { time, values, count: bucket.count };
  });
  return { sensors, points, scanned, distinct };
}

/**
 * Khung gom của khoảng period (kết quả readPeriod()).
 * Trả về { start, bucketMs (null khi theo tháng), bucketOf }.
 */
function sensorBuckets(now, period) {
  const { start, end } = buildBuckets(now, period);
  if (period.groupBy === 'month') return { start, end, bucketMs: null, bucketOf: monthStart };
  const bucketMs = sensorBucketMs(start, end);
  return { start, end, bucketMs, bucketOf: (time) => start + Math.floor((time - start) / bucketMs) * bucketMs };
}

// period: kết quả readPeriod(). Nên có index { topic: 1, time: -1 }.
async function getSensorData(topic, period = { groupBy: 'day', count: DEFAULT_DAYS }, now = Date.now()) {
  const collection = await getCollection(SOURCE);
  const { start, end, bucketMs, bucketOf } = sensorBuckets(now, period);
  const cursor = collection
    .find(
      { topic, time: { $gte: start, $lte: end }, 'content.payload.va': { $type: 'string' } },
      { projection: { _id: 0, time: 1, 'content.payload.va': 1, 'content.payload.co': 1 } },
    )
    .sort({ time: 1 })
    .limit(MAX_SENSOR_SCAN)
    .batchSize(STATS_BATCH_SIZE);
  try {
    const data = await collectSensorPoints(cursor, { bucketOf });
    return Object.assign({
      groupBy: period.groupBy,
      count: period.count,
      custom: period.from !== undefined,
      from: start,
      to: end,
      bucketMs,
      truncated: data.scanned >= MAX_SENSOR_SCAN,
    }, data);
  } finally {
    await cursor.close();
  }
}

module.exports = {
  getDeviceHistory, collectDistinct, readLimit, DEFAULT_LIMIT, MAX_LIMIT, MAX_SCAN,
  getSwitchStats, countSwitches, readPeriod, buildBuckets, DEFAULT_DAYS, MAX_DAYS, MAX_MONTHS,
  MAX_RANGE_DAYS, MAX_RANGE_DAY_ROWS,
  getSensorData, collectSensorPoints, sensorBuckets, sensorBucketMs, monthStart, MAX_SENSOR_POINTS,
};

