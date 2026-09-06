const mqtt = require('mqtt');
const { EventEmitter } = require('events');

/**
 * MqttService
 * Quản lý DUY NHẤT 1 kết nối MQTT cho toàn bộ ứng dụng web.
 * Hỗ trợ: connect / disconnect / publish / subscribe / unsubscribe,
 * trạng thái kết nối và lưu message nhận được vào buffer trong bộ nhớ.
 */
class MqttService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.options = null;
    this.connectionStatus = 'DISCONNECTED';
    this.lastError = null;
    this.subscriptions = [];
    this.messageQueue = [];
    this.eventLog = [];
    this.messageCounter = 0;
    this.maxQueue = 500;
  }

  _logEvent(type, data) {
    this.eventLog.push({
      type,
      data: data || null,
      time: new Date().toISOString(),
    });
    if (this.eventLog.length > 200) {
      this.eventLog.splice(0, this.eventLog.length - 200);
    }
  }

  _payloadToString(payload) {
    if (payload == null) return '';
    if (Buffer.isBuffer(payload)) return payload.toString('utf8');
    if (typeof payload === 'object') {
      try { return JSON.stringify(payload); } catch (e) { return String(payload); }
    }
    return String(payload);
  }

  getStatus() {
    return {
      connected: !!(this.client && this.client.connected),
      state: this.connectionStatus,
      lastError: this.lastError,
      subscriptions: [...this.subscriptions],
      options: this.options
        ? {
            url: this.options.url,
            clientId: this.options.clientId,
            username: this.options.username || null,
            keepalive: this.options.keepalive || null,
            clean: this.options.clean,
          }
        : null,
      lastEvents: this.eventLog.slice(-10),
      messageCount: this.messageQueue.length,
    };
  }

  /**
   * Kết nối tới MQTT broker. Nếu đang có kết nối cũ sẽ ngắt trước khi kết nối mới.
   * params: { protocol, host, port, username, password, clientId, keepalive, clean, topics }
   *  - topics: chuỗi topic cách nhau bởi dấu phẩy -> tự subscribe sau khi connect
   */
  connect(params = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.disconnect();

        const protocol = params.protocol || process.env.MQTT_PROTOCOL || 'mqtt';
        const host = params.host || process.env.MQTT_HOST || 'localhost';
        const port = params.port !== undefined && params.port !== '' ? params.port : (process.env.MQTT_PORT || 1883);
        const username = params.username !== undefined ? params.username : (process.env.MQTT_USER || '');
        const password = params.password !== undefined ? params.password : (process.env.MQTT_PASS || '');
        const clientId = params.clientId || process.env.MQTT_CLIENT_ID || 'web_manager_' + Math.random().toString(16).substring(2, 10);
        const keepalive = parseInt(params.keepalive || process.env.MQTT_KEEPALIVE || 60, 10) || 60;
        const clean = params.clean !== undefined ? !!params.clean : true;
        const autoSub = String(params.topics || '').split(',').map((s) => s.trim()).filter(Boolean);
        const url = String(host).includes('://') ? host : `${protocol}://${host}:${port}`;

        this.connectionStatus = 'CONNECTING';
        this.lastError = null;
        this.options = { url, clientId, username, clean, keepalive, autoSub };

        const client = mqtt.connect(url, {
          clientId,
          username: username || undefined,
          password: password || undefined,
          keepalive,
          clean,
          reconnectPeriod: 5000,
          connectTimeout: 10000,
        });

        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) {
            settled = true;
            this.connectionStatus = 'ERROR';
            this.lastError = 'Connect timeout';
            reject(new Error('Lỗi: hết thời gian chờ kết nối tới broker'));
          }
        }, 15000);

        client.on('connect', (connack) => {
          clearTimeout(timeout);
          settled = true;
          this.connectionStatus = 'CONNECTED';
          this.lastError = null;
          this._logEvent('CONNECT', { clientId, url, connack });
          (async () => {
            for (const t of autoSub) {
              try { await this.subscribe(t); } catch (e) { this._logEvent('SUBSCRIBE_ERROR', { topic: t, error: e.message }); }
            }
          })();
          resolve(this.getStatus());
        });

        client.on('message', (topic, payload, packet) => {
          const item = {
            id: ++this.messageCounter,
            topic,
            payload: this._payloadToString(payload),
            qos: (packet && packet.qos) || 0,
            retain: !!(packet && packet.retain),
            time: new Date().toISOString(),
          };
          this.messageQueue.push(item);
          if (this.messageQueue.length > this.maxQueue) {
            this.messageQueue.splice(0, this.messageQueue.length - this.maxQueue);
          }
          this.emit('message', item);
        });

        client.on('error', (err) => {
          this._logEvent('ERROR', { error: err.message });
          if (!settled) {
            clearTimeout(timeout);
            settled = true;
            this.connectionStatus = 'ERROR';
            this.lastError = err.message;
            reject(new Error(err.message));
            return;
          }
          this.lastError = err.message;
          this.connectionStatus = 'ERROR';
        });

        client.on('close', () => {
          this._logEvent('CLOSE', {});
          if (this.connectionStatus !== 'DISCONNECTED') this.connectionStatus = 'CLOSED';
        });

        client.on('offline', () => {
          this._logEvent('OFFLINE', {});
          if (this.connectionStatus !== 'DISCONNECTED') this.connectionStatus = 'OFFLINE';
        });

        client.on('reconnect', () => {
          this._logEvent('RECONNECT', {});
          if (this.connectionStatus !== 'DISCONNECTED') this.connectionStatus = 'RECONNECTING';
        });

        this.client = client;
      } catch (err) {
        reject(err);
      }
    });
  }

  disconnect() {
    if (this.client) {
      const client = this.client;
      this.client = null;
      try {
        client.removeAllListeners();
        client.end(true);
      } catch (e) { /* bỏ qua */ }
    }
    this.connectionStatus = 'DISCONNECTED';
    this.options = null;
    this.subscriptions = [];
    this.lastError = null;
    this._logEvent('DISCONNECT', {});
  }

  isConnected() {
    return !!(this.client && this.client.connected);
  }

  publish(topic, message, qos = 0, retain = false) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) return reject(new Error('Chưa kết nối tới MQTT broker'));
      if (!topic || !String(topic).trim()) return reject(new Error('Thiếu topic để publish'));
      let payload = message;
      if (payload && typeof payload === 'object') {
        try { payload = JSON.stringify(payload); } catch (e) { payload = String(payload); }
      } else {
        payload = String(payload == null ? '' : payload);
      }
      this.client.publish(String(topic).trim(), payload, { qos: parseInt(qos, 10) || 0, retain: !!retain }, (err) => {
        if (err) {
          this._logEvent('PUBLISH_ERROR', { topic: String(topic).trim(), error: err.message });
          return reject(err);
        }
        this._logEvent('PUBLISH', { topic: String(topic).trim(), payload, qos, retain });
        resolve({ topic: String(topic).trim(), payload, qos: parseInt(qos, 10) || 0, retain: !!retain });
      });
    });
  }

  subscribe(topic, qos = 0) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) return reject(new Error('Chưa kết nối tới MQTT broker'));
      if (!topic || !String(topic).trim()) return reject(new Error('Thiếu topic để subscribe'));
      const t = String(topic).trim();
      const q = parseInt(qos, 10) || 0;
      this.client.subscribe(t, { qos: q }, (err, granted) => {
        if (err) return reject(err);
        if (!this.subscriptions.includes(t)) this.subscriptions.push(t);
        this._logEvent('SUBSCRIBE', { topic: t, qos: q, granted });
        resolve(granted);
      });
    });
  }

  unsubscribe(topic) {
    return new Promise((resolve, reject) => {
      if (!this.client) return reject(new Error('Chưa kết nối tới MQTT broker'));
      const t = String(topic || '').trim();
      this.client.unsubscribe(t, (err) => {
        if (err) return reject(err);
        this.subscriptions = this.subscriptions.filter((sub) => sub !== t);
        this._logEvent('UNSUBSCRIBE', { topic: t });
        resolve(true);
      });
    });
  }

  getMessages(after = 0) {
    const from = Number(after || 0);
    const messages = this.messageQueue.filter((m) => m.id > from);
    const lastId = messages.length ? messages[messages.length - 1].id : from;
    return { messages, lastId };
  }

  clearMessages() {
    this.messageQueue = [];
    this.messageCounter = 0;
    return true;
  }
}

module.exports = new MqttService();