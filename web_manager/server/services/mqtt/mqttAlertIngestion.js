const knex = require('../../config/knex.js');
const mqttService = require('./mqttService.js');
const notificationService = require('./notificationService.js');

const CLONE_REASONS = {
  'stale-ticket': 'presented a session ticket that was already replaced (copied device)',
  'session-takeover-flapping': 'is connected from two places that keep replacing each other',
  'ticket-missing': 'connected without its session ticket',
  'ticket-invalid': 'connected with an unknown session ticket',
  'quarantined-connect': 'tried to connect while quarantined',
};

// Published by mqttBroker/antiClone.js on iot/alert/anticlone/<clientId>.
async function ingestClone(item, event) {
  const clientId = String(event.source_device);
  const reason = String(event.reason || 'unknown');
  console.error('[anti-clone] device', clientId, reason, 'action:', event.action, 'ip:', event.ip, 'previous ip:', event.previousIp);
  const registered = await knex('mqtt_microservice')
    .where({ mqtt_id: clientId, deleteflag: 0 })
    .first('mqtt_microservice_id', 'content');
  if (!registered) return;
  const device = await knex('devices')
    .where({ mqtt_microservice_id: registered.mqtt_microservice_id, status: 'ACTIVE', deleteflag: 0 })
    .first('device_id', 'room_id');
  if (!device) return;

  const receivedAt = event.time && !Number.isNaN(Date.parse(event.time)) ? new Date(event.time) : new Date();
  const details = JSON.stringify({
    source: 'mqttBroker/antiClone.js', topic: item.topic, reason, action: event.action || null,
    ip: event.ip || null, previousIp: event.previousIp || null, takeovers: event.takeovers || null,
  });
  const quarantined = event.action === 'quarantined';
  const existing = await knex('alerts')
    .where({ device_id: device.device_id, alert_type: 'DEVICE_CLONE', status: 'OPEN', deleteflag: 0 })
    .first('alert_id');
  if (existing) {
    await knex('alerts').where({ alert_id: existing.alert_id }).update({ details, triggered_at: receivedAt, updated_at: receivedAt });
    return;
  }
  const alert = {
    room_id: device.room_id, device_id: device.device_id, sensor_id: null,
    alert_type: 'DEVICE_CLONE', severity: quarantined ? 'CRITICAL' : 'WARNING', status: 'OPEN',
    message: `${registered.content || clientId} ${CLONE_REASONS[reason] || reason}` +
      (quarantined ? '; the identity is quarantined until an administrator releases it.' : '.'),
    details, triggered_at: receivedAt,
    created_at: receivedAt, id_created: 0, created_by: 0, created_by_type: 'system', deleteflag: 0, oldid: null,
  };
  await knex('alerts').insert(alert);
  notificationService.sendAlert(alert);
}

async function ingest(item) {
  let event;
  try { event = JSON.parse(item.payload); } catch (_) { return; }
  if (event && event.type === 'device_clone' && event.source_device && item.topic.startsWith('iot/alert/anticlone/')) {
    return ingestClone(item, event);
  }
  if (!event || event.status !== 'abnormal' || !event.source_device) return;

  const registered = await knex('mqtt_microservice')
    .where({ mqtt_id: String(event.source_device), deleteflag: 0 })
    .first('mqtt_microservice_id');
  if (!registered) return;
  const device = await knex('devices')
    .where({ mqtt_microservice_id: registered.mqtt_microservice_id, status: 'ACTIVE', deleteflag: 0 })
    .first('device_id', 'room_id');
  if (!device) return;

  let sensor = null;
  if (event.sensor_key) {
    sensor = await knex('sensors').where({ device_id: device.device_id, sensor_key: String(event.sensor_key), status: 'ACTIVE', deleteflag: 0 }).first('sensor_id');
    if (!sensor) return;
  }
  const opened = await knex('alerts').where({ device_id: device.device_id, alert_type: 'DATA_ANOMALY', status: 'OPEN', deleteflag: 0 });
  const existing = opened.find((alert) => (alert.sensor_id || null) === (sensor ? sensor.sensor_id : null));
  const receivedAt = item.time ? new Date(item.time) : new Date();
  const details = JSON.stringify({
    source: 'power_anomaly.py', topic: item.topic,
    current: Number.isFinite(Number(event.current)) ? Number(event.current) : null,
    voltage: Number.isFinite(Number(event.voltage)) ? Number(event.voltage) : null,
    power: Number.isFinite(Number(event.power)) ? Number(event.power) : null,
    model: event.model || 'IsolationForest',
  });
  const alert = {
    room_id: device.room_id, device_id: device.device_id, sensor_id: sensor ? sensor.sensor_id : null,
    alert_type: 'DATA_ANOMALY', severity: String(event.severity || 'WARNING').toUpperCase(), status: 'OPEN',
    message: `Power anomaly detected for ${event.source_device}.`, details, triggered_at: receivedAt,
    created_at: receivedAt, id_created: 0, created_by: 0, created_by_type: 'system', deleteflag: 0, oldid: null,
  };
  if (existing) {
    await knex('alerts').where({ alert_id: existing.alert_id }).update({ details, triggered_at: receivedAt, updated_at: receivedAt });
    return;
  }
  await knex('alerts').insert(alert);
  notificationService.sendAlert(alert);
}

mqttService.on('message', (item) => {
  if (!item.topic || !item.topic.startsWith('iot/alert/')) return;
  ingest(item).catch((error) => console.warn('[alert-ingestion] failed:', error.message));
});

module.exports = { ingest };
