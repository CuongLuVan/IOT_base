const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const mqttService = require('./mqttService.js');

const STORE_PATH = path.join(__dirname, '..', '..', 'config', 'push.subscriptions.json');
const VAPID_KEY_FILE = path.join(__dirname, '..', '..', 'config', 'vapid.keys.json');

const subscriptionsMap = new Map();

/**
 * Lấy / tự sinh bộ khóa VAPID.
 * Ưu tiên biến môi trường, nếu không có sẽ sinh ra và lưu tại server/config/vapid.keys.json
 * để giữ ổn định cho các lần khởi động sau.
 */
function loadOrCreateVapid() {
  const envSubject = process.env.VAPID_SUBJECT;
  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  if (envPub && envPriv) {
    return { subject: envSubject || 'mailto:admin@localhost', publicKey: envPub, privateKey: envPriv };
  }
  try {
    if (fs.existsSync(VAPID_KEY_FILE)) {
      const saved = JSON.parse(fs.readFileSync(VAPID_KEY_FILE, 'utf8'));
      if (saved.publicKey && saved.privateKey) return saved;
    }
  } catch (e) {
    console.warn('[push] không đọc được vapid.keys.json:', e.message);
  }
  const gen = webpush.generateVAPIDKeys();
  const cfg = { subject: envSubject || 'mailto:admin@localhost', publicKey: gen.publicKey, privateKey: gen.privateKey };
  try {
    fs.writeFileSync(VAPID_KEY_FILE, JSON.stringify(cfg, null, 2));
  } catch (e) {
    console.warn('[push] không lưu được vapid.keys.json:', e.message);
  }
  return cfg;
}

const vapid = loadOrCreateVapid();
webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

function loadStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return;
    const arr = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    if (!Array.isArray(arr)) return;
    arr.forEach((x) => { if (x && x.subscription && x.subscription.endpoint) subscriptionsMap.set(x.subscription.endpoint, x); });
  } catch (e) {
    console.warn('[push] đọc danh sách subscription lỗi:', e.message);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify([...subscriptionsMap.values()], null, 2));
  } catch (e) {
    console.warn('[push] lưu danh sách subscription lỗi:', e.message);
  }
}

loadStore();

/**
 * So khớp topic theo chuẩn MQTT (hỗ trợ ký tự đại diện + và #).
 * filter: "iot/#" khớp "iot/a", "iot/a/b"...
 * filter: "iot/+" khớp "iot/a" nhưng không khớp "iot/a/b".
 */
function topicMatches(filter, topic) {
  if (!filter) return true;
  filter = String(filter).trim();
  if (!filter || filter === '#') return true;
  const f = filter.split('/');
  const t = String(topic).split('/');
  for (let i = 0; i < f.length; i++) {
    const part = f[i];
    if (part === '#') return true;
    if (i >= t.length) return false;
    if (part === '+') continue;
    if (part !== t[i]) return false;
  }
  return f.length === t.length;
}

async function sendToClient(info, message) {
  try {
    if (!info || !info.subscription || !info.subscription.endpoint) return;
    const payload = JSON.stringify({
      title: 'MQTT Message',
      body: '[' + message.topic + '] ' + String(message.payload || '').slice(0, 500),
      topic: message.topic,
      url: '/mqtt',
    });
    const response = await webpush.sendNotification(info.subscription, payload, { TTL: 60 });
    if (response && (response.statusCode === 404 || response.statusCode === 410)) {
      subscriptionsMap.delete(info.subscription.endpoint);
      saveStore();
    }
  } catch (err) {
    if (err && (err.statusCode === 404 || err.statusCode === 410)) {
      subscriptionsMap.delete(info.subscription.endpoint);
      saveStore();
    } else if (err && err.message) {
      console.warn('[push] gửi thông báo lỗi:', err.message);
    }
  }
}

function sendAll(message) {
  if (subscriptionsMap.size === 0) return;
  subscriptionsMap.forEach((info) => {
    if (info.filter && !topicMatches(info.filter, message.topic)) return;
    sendToClient(info, message);
  });
}

// Mỗi khi có bản tin MQTT -> đẩy thông báo tới tất cả trình duyệt đang lắng nghe nền
mqttService.on('message', (message) => {
  sendAll(message);
});

function addSubscription(subscription, filter) {
  if (!subscription || !subscription.endpoint) throw new Error('Subscription không hợp lệ');
  const ep = subscription.endpoint;
  subscriptionsMap.set(ep, {
    subscription,
    filter: filter && String(filter).trim() ? String(filter).trim() : null,
    createdAt: Date.now(),
  });
  saveStore();
  return true;
}

function removeSubscription(endpoint) {
  if (!endpoint) return false;
  const ok = subscriptionsMap.delete(String(endpoint));
  if (ok) saveStore();
  return ok;
}

function getCount() {
  return subscriptionsMap.size;
}

function getPublicKey() {
  return vapid.publicKey;
}

module.exports = {
  addSubscription,
  removeSubscription,
  getCount,
  getPublicKey,
  topicMatches,
  sendAll,
};