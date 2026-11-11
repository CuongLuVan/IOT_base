const knex = require('../../config/knex.js');
const mqttService = require('./mqttService.js');
const recentPackets = new Map();

function measuredDate(message, fallback) {
  const raw = message.measured_at || message.timestamp || message.ts;
  if (raw == null) return fallback;
  const value = typeof raw === 'number' && raw < 1000000000000 ? raw * 1000 : raw;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function packetValues(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((x) => x.trim());
  if (value && typeof value === 'object') return value;
  return null;
}

function numeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function ingest(item) {
  let message;
  try { message = JSON.parse(item.payload); } catch (_) { return; }
  if (!message || message.va == null) return;
  const rawValues = packetValues(message.va);
  if (!rawValues) return;
  const mqttDevice = await knex('mqtt_microservice').where({ mqtt_pub: item.topic, deleteflag: 0 }).first('mqtt_microservice_id');
  if (!mqttDevice) return;
  const device = await knex('devices').where({ mqtt_microservice_id: mqttDevice.mqtt_microservice_id, deleteflag: 0, status: 'ACTIVE' }).first('device_id', 'room_id');
  if (!device) return;
  const sensors = await knex('sensors').where({ device_id: device.device_id, deleteflag: 0, status: 'ACTIVE' });
  if (!sensors.length) return;
  const receivedAt = item.time ? new Date(item.time) : new Date();
  const measuredAt = measuredDate(message, receivedAt);
  if (!measuredAt || Number.isNaN(measuredAt.getTime())) return;
  const invalidFutureTimestamp = measuredAt.getTime() - receivedAt.getTime() > 300000;
  const entries = sensors.map((sensor) => {
    const raw = sensor.sensor_index != null && Array.isArray(rawValues)
      ? rawValues[Number(sensor.sensor_index)]
      : !Array.isArray(rawValues) ? rawValues[sensor.sensor_key] : undefined;
    if (raw == null) return null;
    let value = numeric(raw);
    if (value != null) value = value * (sensor.calibration_scale == null ? 1 : Number(sensor.calibration_scale)) + (sensor.calibration_offset == null ? 0 : Number(sensor.calibration_offset));
    const key = `${sensor.sensor_id}:${measuredAt.getTime()}:${value == null ? String(raw) : value}`;
    const last = recentPackets.get(key);
    if (last && Date.now() - last < 5000) return null;
    recentPackets.set(key, Date.now());
    return { sensor, raw, value, key };
  }).filter(Boolean);
  for (const entry of entries) {
    const { sensor, raw, value } = entry;
    const quality = value == null || invalidFutureTimestamp ? 'BAD_FORMAT' : receivedAt.getTime() - measuredAt.getTime() > 60000 ? 'LATE' : 'GOOD';
    const who = Number(sensor.id_created) || 0;
    const reading = {
      sensor_id: sensor.sensor_id, value_number: value, value_text: value == null ? String(raw).slice(0, 2000) : null,
      value_json: null, measured_at: measuredAt, received_at: receivedAt, quality,
      created_at: receivedAt, id_created: who, created_by: who, created_by_type: 'system', deleteflag: 0, oldid: null
    };
    try {
      await knex('sensor_readings').insert(reading);
      if (quality === 'BAD_FORMAT') {
        const openError = await knex('alerts').where({ sensor_id: sensor.sensor_id, alert_type: 'SENSOR_ERROR', status: 'OPEN', deleteflag: 0 }).first('alert_id');
        if (!openError) await knex('alerts').insert({ room_id: device.room_id, device_id: device.device_id, sensor_id: sensor.sensor_id,
          alert_type: 'SENSOR_ERROR', severity: 'WARNING', status: 'OPEN', message: `${sensor.name} sent invalid sensor data.`, details: JSON.stringify({ raw: String(raw).slice(0, 200), measured_at: measuredAt }), triggered_at: receivedAt,
          created_at: receivedAt, id_created: who, created_by: who, created_by_type: 'system', deleteflag: 0, oldid: null });
      } else if (quality === 'GOOD' && value != null) {
        await knex('alerts').where({ sensor_id: sensor.sensor_id, alert_type: 'SENSOR_ERROR', status: 'OPEN', deleteflag: 0 }).update({ status: 'RESOLVED', resolution: 'Sensor sent a valid reading.', acknowledged_at: receivedAt, updated_at: receivedAt });
        const history = await knex('sensor_readings').where({ sensor_id: sensor.sensor_id, deleteflag: 0 }).whereNotNull('value_number').where('measured_at', '<', measuredAt).orderBy('measured_at', 'desc').limit(20).select('value_number');
        if (history.length >= 8) {
          const values = history.map((row) => Number(row.value_number));
          const mean = values.reduce((sum, number) => sum + number, 0) / values.length;
          const deviation = Math.sqrt(values.reduce((sum, number) => sum + (number - mean) ** 2, 0) / values.length);
          if (deviation > 0 && Math.abs(value - mean) > deviation * 3) {
            const openAnomaly = await knex('alerts').where({ sensor_id: sensor.sensor_id, alert_type: 'DATA_ANOMALY', status: 'OPEN', deleteflag: 0 }).first('alert_id');
            if (!openAnomaly) await knex('alerts').insert({ room_id: device.room_id, device_id: device.device_id, sensor_id: sensor.sensor_id,
              alert_type: 'DATA_ANOMALY', severity: 'WARNING', status: 'OPEN', message: `${sensor.name} produced an unusual value (${value}${sensor.unit || ''}).`, details: JSON.stringify({ value, mean, standard_deviation: deviation, sample_count: values.length }), triggered_at: measuredAt,
              created_at: receivedAt, id_created: who, created_by: who, created_by_type: 'system', deleteflag: 0, oldid: null });
          }
        }
      }
      if (quality === 'GOOD' && value != null && ((sensor.warning_low != null && value < Number(sensor.warning_low)) || (sensor.warning_high != null && value > Number(sensor.warning_high)))) {
        const severity = ((sensor.min_value != null && value < Number(sensor.min_value)) || (sensor.max_value != null && value > Number(sensor.max_value))) ? 'CRITICAL' : 'WARNING';
        const alreadyOpen = await knex('alerts').where({ sensor_id: sensor.sensor_id, alert_type: 'SENSOR_THRESHOLD', status: 'OPEN', deleteflag: 0 }).first('alert_id');
        if (!alreadyOpen) await knex('alerts').insert({ room_id: device.room_id, device_id: device.device_id, sensor_id: sensor.sensor_id,
          alert_type: 'SENSOR_THRESHOLD', severity, status: 'OPEN', message: `${sensor.name} reading ${value}${sensor.unit || ''} crossed its configured threshold.`,
          details: JSON.stringify({ value, warning_low: sensor.warning_low, warning_high: sensor.warning_high }), triggered_at: measuredAt,
          created_at: receivedAt, id_created: who, created_by: who, created_by_type: 'system', deleteflag: 0, oldid: null });
      }
    } catch (error) {
      // A malformed packet or transient database issue should not break MQTT processing.
    }
  }
  if (recentPackets.size > 10000) {
    const cutoff = Date.now() - 60000;
    for (const [key, time] of recentPackets) if (time < cutoff) recentPackets.delete(key);
  }
}

mqttService.on('message', (item) => { ingest(item).catch(() => undefined); });

module.exports = { ingest };
