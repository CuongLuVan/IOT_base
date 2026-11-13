'use strict';
/*
 * Device clone detection for MqttBroker1885.js.
 *
 * Someone who dumps a device's flash gets its certificate, private key, HMAC
 * key and topics: cryptographically the copy IS the device. What the copy
 * cannot follow is a secret that keeps changing after the dump. Two signals:
 *
 * 1. Rolling session ticket (firmware ENABLE_ANTI_CLONE, DeviceIOT/ESP32).
 *    Every rotateSeconds (and on a connect when the last ticket is older than
 *    minRotateSeconds) the broker sends the device a new random ticket on
 *    "anticlone/<clientId>". The device stores it (NVS),
 *    acknowledges on "anticlone/<clientId>/ack" and presents it as the MQTT
 *    password "ac1.<hex>" on its next CONNECT. Every ticket is valid for one
 *    holder only: when the genuine device and a copy both use the identity,
 *    one of them sooner or later presents a ticket the other one already
 *    replaced (a "stale" ticket) -> clone detected.
 *    Devices that never acknowledged a ticket (old firmware, ESP8266) stay
 *    "not enrolled" and are only covered by signal 2.
 *
 * 2. Session take-over flapping. MQTT allows one session per clientId; two
 *    devices with the same identity keep kicking each other off. More than
 *    maxTakeovers take-overs within takeoverWindowSeconds -> clone detected.
 *
 * On detection the identity (clientId + certificate fingerprint) is put in
 * quarantine: its connection is closed, every new CONNECT is refused and an
 * alert is published on "iot/alert/anticlone/<clientId>". Which of the two
 * devices is genuine cannot be told, so both stay out until an administrator
 * releases the identity (mqtt_anticlone_reset.json, written by
 * BrokerAdminApi.js / web_manager) or issues a new certificate.
 *
 * Only tickets' SHA-256 hashes are stored (mqtt_anticlone_state.json). Nothing
 * here runs on the publish path except a topic prefix test.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TICKET_PREFIX = 'ac1.';
const TOPIC_PREFIX = 'anticlone/';
// Flash wear: every ticket is one NVS write on the device. rotateSeconds
// (periodic, while connected) and minRotateSeconds (lower bound, also on
// reconnect) cap the broker at 86400 / minRotateSeconds writes per day,
// whatever the device's reconnect rate; the firmware has its own cap
// (ANTI_CLONE_MAX_TICKET_WRITES_PER_DAY).
const DEFAULTS = {
  enabled: true,
  rotateSeconds: 86400,
  minRotateSeconds: 3600,
  takeoverWindowSeconds: 600,
  maxTakeovers: 4,
  countSameIpTakeovers: false,
  retiredHistory: 50,
  alertTopicPrefix: 'iot/alert/anticlone/',
  alertIntervalSeconds: 300,
};

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function writeFileAtomic(filePath, text) {
  const tempPath = filePath + '.' + process.pid + '.' + crypto.randomBytes(6).toString('hex') + '.tmp';
  fs.writeFileSync(tempPath, text, { encoding: 'utf8', mode: 0o600 });
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        fs.renameSync(tempPath, filePath);
        return;
      } catch (error) {
        // Windows: another process may hold the file open for a moment.
        if (attempt >= 20 || ['EPERM', 'EBUSY', 'EACCES'].indexOf(error.code) === -1) throw error;
        const until = Date.now() + 10;
        while (Date.now() < until) { /* short spin, connect path only */ }
      }
    }
  } finally {
    fs.rmSync(tempPath, { force: true });
  }
}

function readJson(filePath, fallback) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('[anti-clone] cannot read', path.basename(filePath) + ':', error.message);
    }
    return fallback;
  }
}

/**
 * options:
 *   dir                 folder of the mqtt_anticlone*.json files
 *   publish(topic, text)  internal publish (not subject to ACL)
 *   disconnect(clientId)  closes the live connection of clientId
 *   now()               optional clock (tests)
 *
 * checkConnect() info: { clientId, fingerprint, password, ip, sessionAlive,
 * sessionIp } (sessionIp: address of the session about to be taken over).
 */
function createAntiClone(options) {
  const now = options.now || Date.now;
  const files = {
    config: path.resolve(options.dir, 'mqtt_anticlone.json'),
    state: path.resolve(options.dir, 'mqtt_anticlone_state.json'),
    reset: path.resolve(options.dir, 'mqtt_anticlone_reset.json'),
  };
  let config = Object.assign({}, DEFAULTS);
  let state = { clients: {}, resetsApplied: {} };
  const takeovers = {};    // clientId -> [timestamps], memory only
  const lastAlerts = {};   // clientId|type -> timestamp
  const subscribed = {};   // clientId -> true while its ticket topic is subscribed

  function loadConfig() {
    config = Object.assign({}, DEFAULTS, readJson(files.config, {}));
  }

  function loadState() {
    const value = readJson(files.state, null);
    state = {
      clients: value && value.clients && typeof value.clients === 'object' ? value.clients : {},
      resetsApplied: value && value.resetsApplied && typeof value.resetsApplied === 'object' ? value.resetsApplied : {},
    };
  }

  // Written synchronously before a ticket leaves the broker: a ticket the
  // device holds but the broker forgot (crash) would lock the device out.
  function saveState() {
    writeFileAtomic(files.state, JSON.stringify(state, null, 2) + '\n');
  }

  function ticketTopic(clientId) {
    return TOPIC_PREFIX + clientId;
  }

  function ackTopic(clientId) {
    return TOPIC_PREFIX + clientId + '/ack';
  }

  function alert(clientId, type, details) {
    const key = clientId + '|' + type;
    const time = now();
    if (lastAlerts[key] && time - lastAlerts[key] < config.alertIntervalSeconds * 1000) return;
    lastAlerts[key] = time;
    const event = Object.assign({
      type: 'device_clone',
      reason: type,
      source_device: clientId,
      severity: 'CRITICAL',
      time: new Date(time).toISOString(),
    }, details);
    console.warn('[anti-clone]', clientId, type, JSON.stringify(details));
    try {
      options.publish(config.alertTopicPrefix + clientId, JSON.stringify(event));
    } catch (error) {
      console.error('[anti-clone] alert publish failed:', error.message);
    }
  }

  function recordFor(clientId, fingerprint) {
    let record = state.clients[clientId];
    if (!record || record.fingerprint !== fingerprint) {
      // New certificate = new identity: earlier tickets / quarantine do not apply.
      record = { fingerprint: fingerprint, current: null, pending: null, retired: [], seq: 0, quarantine: null };
      state.clients[clientId] = record;
    }
    return record;
  }

  function retire(record, hash) {
    if (!hash) return;
    record.retired.push(hash);
    if (record.retired.length > config.retiredHistory) {
      record.retired.splice(0, record.retired.length - config.retiredHistory);
    }
  }

  function promotePending(record) {
    retire(record, record.current);
    record.current = record.pending.hash;
    record.enrolledAt = record.enrolledAt || new Date(now()).toISOString();
    record.pending = null;
  }

  function quarantine(clientId, record, reason, details) {
    record.quarantine = Object.assign({ reason: reason, at: new Date(now()).toISOString() }, details);
    record.pending = null;
    saveState();
    alert(clientId, reason, Object.assign({ action: 'quarantined' }, details));
    options.disconnect(clientId);
  }

  // "ac1.<64 hex>" -> lower-case hex; '' when no ticket; null when malformed.
  function parseTicket(password) {
    const text = password == null ? '' : String(password);
    if (text.indexOf(TICKET_PREFIX) !== 0) return '';
    const hex = text.slice(TICKET_PREFIX.length).toLowerCase();
    return /^[0-9a-f]{64}$/.test(hex) ? hex : null;
  }

  /**
   * Called once the certificate identity is verified. sessionAlive: another
   * connection with the same clientId is still open (it is about to be taken
   * over). Returns { allowed, reason }.
   */
  function checkConnect(info) {
    if (!config.enabled) return { allowed: true };
    const clientId = info.clientId;
    const record = recordFor(clientId, info.fingerprint);
    const ip = info.ip || null;
    const previousIp = record.lastIp || null;

    if (record.quarantine) {
      alert(clientId, 'quarantined-connect', { action: 'rejected', ip: ip });
      return { allowed: false, reason: 'quarantined' };
    }

    // A device whose Wi-Fi dropped reconnects (same address) while the broker
    // still holds its half-open session; only a take-over from another
    // address points to a second device (same-NAT copies: see the ticket).
    if (info.sessionAlive && (config.countSameIpTakeovers || info.sessionIp !== ip)) {
      const time = now();
      const list = (takeovers[clientId] || []).filter(function(at) {
        return time - at < config.takeoverWindowSeconds * 1000;
      });
      list.push(time);
      takeovers[clientId] = list;
      if (list.length > config.maxTakeovers) {
        quarantine(clientId, record, 'session-takeover-flapping',
          { ip: ip, previousIp: previousIp, takeovers: list.length, windowSeconds: config.takeoverWindowSeconds });
        return { allowed: false, reason: 'session-takeover-flapping' };
      }
    }

    const ticket = parseTicket(info.password);
    if (ticket === null) {
      return { allowed: false, reason: 'ticket-malformed' };
    }
    const hash = ticket ? sha256(ticket) : null;
    let changed = false;

    if (hash && record.retired.indexOf(hash) !== -1) {
      quarantine(clientId, record, 'stale-ticket', { ip: ip, previousIp: previousIp });
      return { allowed: false, reason: 'stale-ticket' };
    }

    if (!record.current) {
      // Not enrolled yet (or broker state lost): accept and enroll.
      if (hash && record.pending && hash === record.pending.hash) {
        promotePending(record);
        changed = true;
      } else if (hash) {
        console.warn('[anti-clone]', clientId, 'presented a ticket unknown to the broker; enrolling again');
      }
    } else if (!hash) {
      alert(clientId, 'ticket-missing', { action: 'rejected', ip: ip, previousIp: previousIp });
      return { allowed: false, reason: 'ticket-missing' };
    } else if (hash === record.current) {
      if (record.pending) {
        // The device never stored the pending ticket; whoever might hold it is a copy.
        retire(record, record.pending.hash);
        record.pending = null;
        changed = true;
      }
    } else if (record.pending && hash === record.pending.hash) {
      promotePending(record);
      changed = true;
    } else {
      alert(clientId, 'ticket-invalid', { action: 'rejected', ip: ip, previousIp: previousIp });
      return { allowed: false, reason: 'ticket-invalid' };
    }

    if (record.lastIp !== ip) {
      record.lastIp = ip;
      changed = true;
    }
    if (changed) saveState();
    return { allowed: true };
  }

  function issueTicket(clientId) {
    const record = state.clients[clientId];
    if (!config.enabled || !record || record.quarantine || record.pending || !subscribed[clientId]) return;
    const ticket = crypto.randomBytes(32).toString('hex');
    record.seq = (record.seq || 0) + 1;
    record.pending = { hash: sha256(ticket), id: record.seq, issuedAt: now() };
    record.lastIssuedAt = now();
    saveState();
    options.publish(ticketTopic(clientId), JSON.stringify({ t: ticket, id: record.seq }));
  }

  // A reconnect gets a new ticket only when the last one is at least
  // minRotateSeconds old: a device stuck in a reconnect loop must not write
  // its flash on every attempt. Enrollment (no ticket issued yet) is immediate.
  function onSubscribed(clientId, topic) {
    if (!clientId || topic !== ticketTopic(clientId)) return;
    subscribed[clientId] = true;
    const record = state.clients[clientId];
    if (record && now() - (record.lastIssuedAt || 0) >= config.minRotateSeconds * 1000) {
      issueTicket(clientId);
    }
  }

  function onAck(clientId, payload) {
    const record = state.clients[clientId];
    if (!record || !record.pending || record.quarantine) return;
    let id = null;
    try { id = Number(JSON.parse(String(payload)).id); } catch (error) { return; }
    if (id !== record.pending.id) return;
    promotePending(record);
    saveState();
  }

  function onDisconnected(clientId) {
    delete subscribed[clientId];
  }

  // Rotation while connected; a pending ticket is never replaced (the device
  // may hold it), so an unacknowledged one simply delays the next rotation.
  function rotateDue() {
    const time = now();
    Object.keys(subscribed).forEach(function(clientId) {
      const record = state.clients[clientId];
      const interval = Math.max(config.rotateSeconds, config.minRotateSeconds) * 1000;
      if (record && !record.pending && time - (record.lastIssuedAt || 0) >= interval) {
        issueTicket(clientId);
      }
    });
  }

  // mqtt_anticlone_reset.json: { "resets": { "<clientId>": "<ISO time>" } }.
  // An entry newer than the last one applied forgets the identity
  // (quarantine and tickets); the next CONNECT enrolls it again.
  function applyResets() {
    const value = readJson(files.reset, {});
    const resets = value.resets && typeof value.resets === 'object' ? value.resets : {};
    let changed = false;
    Object.keys(resets).forEach(function(clientId) {
      const requested = Date.parse(resets[clientId]);
      const applied = state.resetsApplied[clientId] ? Date.parse(state.resetsApplied[clientId]) || 0 : 0;
      if (!Number.isFinite(requested) || requested <= applied) return;
      delete state.clients[clientId];
      delete takeovers[clientId];
      state.resetsApplied[clientId] = new Date(requested).toISOString();
      changed = true;
      console.warn('[anti-clone]', clientId, 'released by administrator');
    });
    if (changed) saveState();
  }

  function onFileChanged(filePath) {
    const resolved = path.resolve(filePath);
    if (resolved === files.config) loadConfig();
    if (resolved === files.reset) applyResets();
  }

  /** Subscribe permission for "anticlone/..." and for patterns that could match it. */
  function authorizeSubscribe(clientId, topic) {
    if (topic === ticketTopic(clientId)) return true;
    const first = String(topic).split('/')[0];
    if (first === 'anticlone' || first === '#' || first === '+') return false;
    return null; // not an anti-clone topic: normal ACL decides
  }

  /** Publish permission for "anticlone/..."; processes the acknowledgement. */
  function authorizePublish(clientId, topic, payload) {
    if (String(topic).indexOf(TOPIC_PREFIX) !== 0) return null;
    if (topic !== ackTopic(clientId)) return false;
    onAck(clientId, payload);
    return true;
  }

  function status(clientId) {
    const record = state.clients[clientId];
    return record ? {
      enrolled: Boolean(record.current),
      quarantine: record.quarantine || null,
      lastIp: record.lastIp || null,
    } : { enrolled: false, quarantine: null, lastIp: null };
  }

  loadConfig();
  loadState();
  applyResets();
  const timer = setInterval(rotateDue, 60000);
  if (timer.unref) timer.unref();

  return {
    files: files,
    ticketTopic: ticketTopic,
    ackTopic: ackTopic,
    checkConnect: checkConnect,
    onSubscribed: onSubscribed,
    onDisconnected: onDisconnected,
    onFileChanged: onFileChanged,
    authorizeSubscribe: authorizeSubscribe,
    authorizePublish: authorizePublish,
    rotateDue: rotateDue,
    status: status,
    stop: function() { clearInterval(timer); },
  };
}

module.exports = { createAntiClone: createAntiClone, TICKET_PREFIX: TICKET_PREFIX };
