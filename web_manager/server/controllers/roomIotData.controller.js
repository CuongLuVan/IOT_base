const knex = require('../config/knex.js');
const roomController = require('./room.controller.js');
const { writeAudit } = require('../services/roomIotAudit.js');
const deviceStatus = require('../services/mqtt/deviceStatusService.js');
const notificationService = require('../services/mqtt/notificationService.js');

const api = {};
const actor = roomController.actor;

async function deviceContext(req, deviceId, manage) {
  const device = await knex('devices').where({ device_id: Number(deviceId), deleteflag: 0, status: 'ACTIVE' }).first();
  if (!device) return { missing: true };
  const access = manage
    ? await roomController.canManageRoom(req, device.room_id)
    : { room: await roomController.roomQuery(req, device.room_id).first(), allowed: true };
  return { device, room: access.room, allowed: access.allowed };
}

function text(value, max, required) {
  const result = value == null ? '' : String(value).trim();
  if ((required && !result) || result.length > max) throw new Error('Invalid required text field.');
  return result || null;
}

function sensorFields(body, partial) {
  const fields = {};
  ['sensor_key', 'name', 'sensor_type'].forEach((key) => {
    if (!partial || body[key] != null) fields[key] = text(body[key], key === 'name' ? 160 : 64, true);
  });
  ['unit', 'description', 'display_color'].forEach((key) => {
    if (body[key] != null) fields[key] = key === 'description' ? String(body[key]) : text(body[key], key === 'unit' ? 32 : 24, false);
  });
  ['min_value', 'max_value', 'warning_low', 'warning_high', 'calibration_offset', 'calibration_scale'].forEach((key) => {
    if (body[key] != null) {
      const number = Number(body[key]);
      if (!Number.isFinite(number)) throw new Error(`${key} must be numeric.`);
      fields[key] = number;
    }
  });
  if (body.sensor_index != null) {
    fields.sensor_index = Number(body.sensor_index);
    if (!Number.isInteger(fields.sensor_index) || fields.sensor_index < 0) throw new Error('sensor_index must be a non-negative integer.');
  }
  if (body.display_type != null) {
    fields.display_type = text(body.display_type, 24, true);
    if (!['VALUE_CARD', 'LINE_CHART', 'BAR_CHART', 'GAUGE', 'DATA_TABLE'].includes(fields.display_type)) throw new Error('Unsupported display_type.');
  }
  if (body.update_interval_seconds != null) {
    fields.update_interval_seconds = Number(body.update_interval_seconds);
    if (!Number.isInteger(fields.update_interval_seconds) || fields.update_interval_seconds < 1) throw new Error('update_interval_seconds must be a positive integer.');
  }
  if (body.status != null) {
    fields.status = String(body.status).toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(fields.status)) throw new Error('status must be ACTIVE or INACTIVE.');
  }
  return fields;
}

function actuatorFields(body, partial) {
  const fields = {};
  ['actuator_key', 'name', 'actuator_type'].forEach((key) => {
    if (!partial || body[key] != null) fields[key] = text(body[key], key === 'name' ? 160 : 64, true);
  });
  if (body.channel_number != null) {
    fields.channel_number = Number(body.channel_number);
    if (!Number.isInteger(fields.channel_number) || fields.channel_number < 0) throw new Error('channel_number must be a non-negative integer.');
  }
  if (body.status != null) {
    fields.status = String(body.status).toUpperCase();
    if (!['ACTIVE', 'INACTIVE'].includes(fields.status)) throw new Error('status must be ACTIVE or INACTIVE.');
  }
  return fields;
}

function auditColumns(req) {
  const who = actor(req);
  return { created_at: knex.fn.now(), id_created: who.id, created_by: who.id, created_by_type: who.type, deleteflag: 0, oldid: null };
}

api.listSensors = async (req, res) => {
  try {
    const context = await deviceContext(req, req.params.deviceId, false);
    if (context.missing || !context.room) return res.status(404).json({ error: 'Device not found.' });
    const result = await knex('sensors').where({ device_id: context.device.device_id, deleteflag: 0 }).orderBy('sensor_id', 'asc');
    return res.json({ result });
  } catch (error) { return res.status(500).json({ error: 'Unable to list sensors.' }); }
};

api.updateDevice = async (req, res) => {
  const body = req.body || {};
  const fields = {};
  for (const key of ['display_name', 'device_type', 'firmware_version', 'mac_address', 'ip_address']) {
    if (body[key] != null) {
      const value = String(body[key]).trim();
      const limits = { display_name: 120, device_type: 64, firmware_version: 64, mac_address: 32, ip_address: 64 };
      if (value.length > limits[key]) return res.status(400).json({ error: `${key} is too long.` });
      fields[key] = value || null;
    }
  }
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'No device fields supplied.' });
  try {
    const device = await knex('devices').where({ device_id: Number(req.params.deviceId), deleteflag: 0 }).first();
    if (!device) return res.status(404).json({ error: 'Device not found.' });
    const access = await roomController.canManageRoom(req, device.room_id);
    if (!access.room) return res.status(404).json({ error: 'Device not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    await knex('devices').where({ device_id: device.device_id }).update(Object.assign(fields, { updated_at: knex.fn.now(), id_updated: actor(req).id }));
    await writeAudit(req, 'UPDATE', 'device', device.device_id, device, fields);
    return res.json({ device_id: device.device_id, updated: true });
  } catch (error) { return res.status(500).json({ error: 'Unable to update device.' }); }
};

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

async function verifyOutputExecution(roomDevice, actuator, requestedOn, req) {
  const mqttDevice = await knex('mqtt_microservice').where({ mqtt_microservice_id: roomDevice.mqtt_microservice_id, deleteflag: 0 }).first();
  if (!mqttDevice || !mqttDevice.mqtt_pub || !mqttDevice.mqtt_sub) throw new Error('MQTT device configuration is unavailable.');
  const channelNumber = Number(actuator.channel_number);
  if (!Number.isInteger(channelNumber) || channelNumber < 1 || channelNumber > 2) throw new Error('This actuator channel is not supported by the registered device capability.');
  await deviceStatus.ensureConnected();
  const watchError = await deviceStatus.watch(mqttDevice.mqtt_pub);
  if (watchError) throw new Error(watchError);
  const stateRequestedAt = Date.now();
  await deviceStatus.requestStatus(mqttDevice, true);
  let before = null;
  for (let i = 0; i < 8; i += 1) {
    await delay(250);
    const status = deviceStatus.getStatus(mqttDevice.mqtt_pub);
    if (status && status.receivedAt && new Date(status.receivedAt).getTime() >= stateRequestedAt && status.rc === 2 && Number.isInteger(status.port)) { before = status; break; }
  }
  if (!before || !Number.isInteger(before.port)) {
    const error = new Error('Device has not reported its current output state; command was not sent.');
    error.status = 409;
    throw error;
  }
  const baseline = before && before.receivedAt ? new Date(before.receivedAt).getTime() : 0;
  const bit = 1 << (channelNumber - 1);
  const currentMask = before && Number.isInteger(before.port) ? before.port : 0;
  const desiredMask = requestedOn ? currentMask | bit : currentMask & ~bit;
  const who = actor(req);
  const payload = { action: 'ACTUATOR_SET', actuator_id: actuator.actuator_id, channel_number: channelNumber, value: requestedOn };
  const [commandId] = await knex('device_commands').insert({
    device_id: roomDevice.device_id, command_type: 'ACTUATOR_SET', payload: JSON.stringify(payload), status: 'PENDING',
    issued_at: knex.fn.now(), requested_by: who.id, requested_by_type: who.type,
    created_at: knex.fn.now(), id_created: who.id, created_by: who.id, created_by_type: who.type, deleteflag: 0, oldid: null
  });
  try {
    await deviceStatus.publishCommand(mqttDevice, { com: 1, value: desiredMask });
    await knex('device_commands').where({ command_id: commandId }).update({ status: 'SENT', updated_at: knex.fn.now(), id_updated: who.id });
    await writeAudit(req, 'COMMAND_SENT', 'device_command', commandId, null, payload);
    let commandAck = null;
    for (let i = 0; i < 8; i += 1) {
      await delay(250);
      const status = deviceStatus.getStatus(mqttDevice.mqtt_pub);
      if (status && status.receivedAt && new Date(status.receivedAt).getTime() > baseline && status.rc === 1 && Number.isInteger(status.rs)) { commandAck = status; break; }
    }
    const passwordError = deviceStatus.getPasswordError(mqttDevice.mqtt_pub);
    if (!commandAck && passwordError) {
      const result = { phase: 'ACKNOWLEDGEMENT', error: passwordError };
      await knex('device_commands').where({ command_id: commandId }).update({ status: 'FAILED', result: JSON.stringify(result), completed_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: who.id });
      await writeAudit(req, 'COMMAND_FAILED', 'device_command', commandId, null, result);
      return { command_id: commandId, status: 'FAILED', acknowledged: false, executed: false, result };
    }
    if (commandAck && commandAck.rs !== 0) {
      const failed = { status: 'FAILED', result: JSON.stringify({ phase: 'ACKNOWLEDGEMENT', rs: commandAck.rs }), completed_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: who.id };
      await knex('device_commands').where({ command_id: commandId }).update(failed);
      await writeAudit(req, 'COMMAND_FAILED', 'device_command', commandId, null, failed);
      return { command_id: commandId, status: 'FAILED', acknowledged: true, executed: false, result: { rs: commandAck.rs } };
    }
    if (commandAck) await knex('device_commands').where({ command_id: commandId }).update({ status: 'ACKNOWLEDGED', result: JSON.stringify({ acknowledged: true }), updated_at: knex.fn.now(), id_updated: who.id });
    await delay(1200);
    const requestedAt = Date.now();
    await deviceStatus.requestStatus(mqttDevice, true);
    let verified = false;
    let verificationStatus = null;
    for (let i = 0; i < 16; i += 1) {
      await delay(250);
      const status = deviceStatus.getStatus(mqttDevice.mqtt_pub);
      if (!status || !status.receivedAt || new Date(status.receivedAt).getTime() < requestedAt || status.rc !== 2) continue;
      verificationStatus = status;
      if (status.rs === 0 && status.port === desiredMask) { verified = true; break; }
      if (status.rs !== 0) break;
    }
    if (verified) {
      const result = { acknowledged: Boolean(commandAck), executed: true, actuator_id: actuator.actuator_id, value: requestedOn, device_port: desiredMask };
      await knex('device_commands').where({ command_id: commandId }).update({ status: 'SUCCEEDED', result: JSON.stringify(result), completed_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: who.id });
      await writeAudit(req, 'COMMAND_SUCCEEDED', 'device_command', commandId, null, result);
      return { command_id: commandId, status: 'SUCCEEDED', acknowledged: Boolean(commandAck), executed: true, result };
    }
    if (verificationStatus && verificationStatus.rs !== 0) {
      const result = { acknowledged: Boolean(commandAck), executed: false, rs: verificationStatus.rs };
      await knex('device_commands').where({ command_id: commandId }).update({ status: 'FAILED', result: JSON.stringify(result), completed_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: who.id });
      await writeAudit(req, 'COMMAND_FAILED', 'device_command', commandId, null, result);
      return { command_id: commandId, status: 'FAILED', acknowledged: Boolean(commandAck), executed: false, result };
    }
    return { command_id: commandId, status: commandAck ? 'ACKNOWLEDGED' : 'SENT', acknowledged: Boolean(commandAck), executed: false, result: { message: 'Awaiting device execution confirmation.' } };
  } catch (error) {
    await knex('device_commands').where({ command_id: commandId }).update({ status: 'FAILED', result: JSON.stringify({ error: error.message }), completed_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: who.id });
    await writeAudit(req, 'COMMAND_FAILED', 'device_command', commandId, null, { error: error.message });
    throw error;
  }
}

api.controlActuator = async (req, res) => {
  const value = (req.body || {}).value;
  if (typeof value !== 'boolean') return res.status(400).json({ error: 'value must be boolean.' });
  try {
    const context = await deviceContext(req, req.params.deviceId, false);
    if (!context.room) return res.status(404).json({ error: 'Device not found.' });
    const permission = await roomController.canOperateRoom(req, context.room.room_id);
    if (!permission.allowed) return res.status(403).json({ error: 'Room operator role required.' });
    const actuator = await knex('actuators').where({ actuator_id: req.params.actuatorId, device_id: context.device.device_id, status: 'ACTIVE', deleteflag: 0 }).first();
    if (!actuator) return res.status(404).json({ error: 'Active actuator capability not found for this device.' });
    const result = await verifyOutputExecution(context.device, actuator, value, req);
    return res.status(result.executed ? 200 : 202).json({ result });
  } catch (error) { return res.status(error.status || 503).json({ error: 'Unable to control actuator.', detail: error.message }); }
};

api.controlRoomActuators = async (req, res) => {
  const body = req.body || {};
  if (typeof body.value !== 'boolean' || typeof body.actuator_key !== 'string' || !body.actuator_key.trim()) return res.status(400).json({ error: 'actuator_key and boolean value are required.' });
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const permission = await roomController.canOperateRoom(req, room.room_id);
    if (!permission.allowed) return res.status(403).json({ error: 'Room operator role required.' });
    const matches = await knex('actuators as a').join('devices as d', 'd.device_id', 'a.device_id')
      .where({ 'd.room_id': room.room_id, 'd.status': 'ACTIVE', 'd.deleteflag': 0, 'a.actuator_key': body.actuator_key.trim(), 'a.status': 'ACTIVE', 'a.deleteflag': 0 })
      .select('d.*', 'a.actuator_id', 'a.actuator_key', 'a.channel_number');
    if (!matches.length) return res.status(404).json({ error: 'No active matching actuator capabilities in this room.' });
    const results = [];
    for (const match of matches) {
      try { results.push(await verifyOutputExecution(match, match, body.value, req)); }
      catch (error) { results.push({ device_id: match.device_id, status: 'FAILED', executed: false, error: error.message }); }
    }
    const allSucceeded = results.every((item) => item.status === 'SUCCEEDED');
    return res.status(allSucceeded ? 200 : 202).json({ result: { room_id: room.room_id, results } });
  } catch (error) { return res.status(500).json({ error: 'Unable to control room actuators.', detail: error.message }); }
};

api.createSensor = async (req, res) => {
  let fields;
  try { fields = sensorFields(req.body || {}, false); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const context = await deviceContext(req, req.params.deviceId, true);
    if (context.missing || !context.room) return res.status(404).json({ error: 'Device not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const who = actor(req);
    const [sensorId] = await knex('sensors').insert(Object.assign(fields, { device_id: context.device.device_id }, auditColumns(req)));
    await writeAudit(req, 'CREATE', 'sensor', sensorId, null, fields);
    return res.status(201).json({ sensor_id: sensorId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'sensor_key already exists on this device.' });
    return res.status(500).json({ error: 'Unable to create sensor.' });
  }
};

api.updateSensor = async (req, res) => {
  let fields;
  try { fields = sensorFields(req.body || {}, true); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'No sensor fields supplied.' });
  try {
    const sensor = await knex('sensors').where({ sensor_id: req.params.sensorId, deleteflag: 0 }).first();
    if (!sensor) return res.status(404).json({ error: 'Sensor not found.' });
    const context = await deviceContext(req, sensor.device_id, true);
    if (!context.room) return res.status(404).json({ error: 'Sensor not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    await knex('sensors').where({ sensor_id: sensor.sensor_id }).update(Object.assign(fields, { updated_at: knex.fn.now(), id_updated: actor(req).id }));
    await writeAudit(req, 'UPDATE', 'sensor', sensor.sensor_id, sensor, fields);
    return res.json({ sensor_id: sensor.sensor_id, updated: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'sensor_key already exists on this device.' });
    return res.status(500).json({ error: 'Unable to update sensor.' });
  }
};

api.deleteSensor = async (req, res) => {
  try {
    const sensor = await knex('sensors').where({ sensor_id: req.params.sensorId, deleteflag: 0 }).first();
    if (!sensor) return res.status(404).json({ error: 'Sensor not found.' });
    const context = await deviceContext(req, sensor.device_id, true);
    if (!context.room) return res.status(404).json({ error: 'Sensor not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    await knex('sensors').where({ sensor_id: sensor.sensor_id }).update({ status: 'INACTIVE', deleteflag: 1, updated_at: knex.fn.now(), id_updated: actor(req).id });
    await writeAudit(req, 'DELETE', 'sensor', sensor.sensor_id, sensor, null);
    return res.status(204).end();
  } catch (error) { return res.status(500).json({ error: 'Unable to delete sensor.' }); }
};

api.listActuators = async (req, res) => {
  try {
    const context = await deviceContext(req, req.params.deviceId, false);
    if (context.missing || !context.room) return res.status(404).json({ error: 'Device not found.' });
    return res.json({ result: await knex('actuators').where({ device_id: context.device.device_id, deleteflag: 0 }).orderBy('actuator_id', 'asc') });
  } catch (error) { return res.status(500).json({ error: 'Unable to list actuators.' }); }
};

api.createActuator = async (req, res) => {
  let fields;
  try { fields = actuatorFields(req.body || {}, false); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const context = await deviceContext(req, req.params.deviceId, true);
    if (context.missing || !context.room) return res.status(404).json({ error: 'Device not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const [actuatorId] = await knex('actuators').insert(Object.assign(fields, { device_id: context.device.device_id }, auditColumns(req)));
    await writeAudit(req, 'CREATE', 'actuator', actuatorId, null, fields);
    return res.status(201).json({ actuator_id: actuatorId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'actuator_key already exists on this device.' });
    return res.status(500).json({ error: 'Unable to create actuator.' });
  }
};

api.updateActuator = async (req, res) => {
  let fields;
  try { fields = actuatorFields(req.body || {}, true); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  if (!Object.keys(fields).length) return res.status(400).json({ error: 'No actuator fields supplied.' });
  try {
    const actuator = await knex('actuators').where({ actuator_id: req.params.actuatorId, deleteflag: 0 }).first();
    if (!actuator) return res.status(404).json({ error: 'Actuator not found.' });
    const context = await deviceContext(req, actuator.device_id, true);
    if (!context.room) return res.status(404).json({ error: 'Actuator not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    await knex('actuators').where({ actuator_id: actuator.actuator_id }).update(Object.assign(fields, { updated_at: knex.fn.now(), id_updated: actor(req).id }));
    await writeAudit(req, 'UPDATE', 'actuator', actuator.actuator_id, actuator, fields);
    return res.json({ actuator_id: actuator.actuator_id, updated: true });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'actuator_key already exists on this device.' });
    return res.status(500).json({ error: 'Unable to update actuator.' });
  }
};

api.deleteActuator = async (req, res) => {
  try {
    const actuator = await knex('actuators').where({ actuator_id: req.params.actuatorId, deleteflag: 0 }).first();
    if (!actuator) return res.status(404).json({ error: 'Actuator not found.' });
    const context = await deviceContext(req, actuator.device_id, true);
    if (!context.room) return res.status(404).json({ error: 'Actuator not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    await knex('actuators').where({ actuator_id: actuator.actuator_id }).update({ status: 'INACTIVE', deleteflag: 1, updated_at: knex.fn.now(), id_updated: actor(req).id });
    await writeAudit(req, 'DELETE', 'actuator', actuator.actuator_id, actuator, null);
    return res.status(204).end();
  } catch (error) { return res.status(500).json({ error: 'Unable to delete actuator.' }); }
};

api.listReadings = async (req, res) => {
  try {
    const sensor = await knex('sensors').where({ sensor_id: req.params.sensorId, deleteflag: 0 }).first();
    if (!sensor) return res.status(404).json({ error: 'Sensor not found.' });
    const context = await deviceContext(req, sensor.device_id, false);
    if (!context.room) return res.status(404).json({ error: 'Sensor not found.' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 5000);
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) return res.status(400).json({ error: 'Invalid reading date range.' });
    const query = knex('sensor_readings').where({ sensor_id: sensor.sensor_id, deleteflag: 0 }).orderBy('measured_at', 'desc');
    if (from) query.where('measured_at', '>=', from);
    if (to) query.where('measured_at', '<=', to);
    return res.json({ result: await query.limit(limit) });
  } catch (error) { return res.status(400).json({ error: 'Invalid reading query.' }); }
};

api.createReading = async (req, res) => {
  const body = req.body || {};
  const measuredAt = body.measured_at == null ? new Date() : new Date(body.measured_at);
  if (Number.isNaN(measuredAt.getTime()) || (body.value == null && body.value_json == null)) return res.status(400).json({ error: 'A value and valid measured_at are required.' });
  try {
    const sensor = await knex('sensors').where({ sensor_id: req.params.sensorId, deleteflag: 0, status: 'ACTIVE' }).first();
    if (!sensor) return res.status(404).json({ error: 'Sensor not found.' });
    const context = await deviceContext(req, sensor.device_id, true);
    if (!context.room) return res.status(404).json({ error: 'Sensor not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const numeric = body.value == null ? null : Number(body.value);
    const isNumeric = body.value != null && Number.isFinite(numeric);
    const duplicate = await knex('sensor_readings').where({ sensor_id: sensor.sensor_id, measured_at: measuredAt, deleteflag: 0 })
      .modify((query) => { if (isNumeric) query.where('value_number', numeric); else if (body.value != null) query.where('value_text', String(body.value)); else query.where('value_json', JSON.stringify(body.value_json)); }).first('reading_id');
    if (duplicate) return res.status(200).json({ reading_id: duplicate.reading_id, duplicate: true });
    const who = actor(req);
    const late = Date.now() - measuredAt.getTime() > 60000;
    const reading = {
      sensor_id: sensor.sensor_id, value_number: isNumeric ? numeric : null,
      value_text: body.value != null && !isNumeric ? String(body.value) : null,
      value_json: body.value_json == null ? null : JSON.stringify(body.value_json),
      measured_at: measuredAt, received_at: knex.fn.now(), quality: late ? 'LATE' : String(body.quality || 'GOOD').toUpperCase(),
      created_at: knex.fn.now(), id_created: who.id, created_by: who.id, created_by_type: who.type, deleteflag: 0, oldid: null
    };
    const [readingId] = await knex('sensor_readings').insert(reading);
    if (isNumeric && ((sensor.warning_low != null && numeric < Number(sensor.warning_low)) || (sensor.warning_high != null && numeric > Number(sensor.warning_high)))) {
      const severity = ((sensor.min_value != null && numeric < Number(sensor.min_value)) || (sensor.max_value != null && numeric > Number(sensor.max_value))) ? 'CRITICAL' : 'WARNING';
      const message = `${sensor.name} reading ${numeric}${sensor.unit || ''} is outside configured warning range.`;
      const details = JSON.stringify({ value: numeric, warning_low: sensor.warning_low, warning_high: sensor.warning_high });
      const [alertId] = await knex('alerts').insert({ room_id: context.room.room_id, device_id: context.device.device_id, sensor_id: sensor.sensor_id,
        alert_type: 'SENSOR_THRESHOLD', severity, status: 'OPEN', message, details, triggered_at: measuredAt,
        created_at: knex.fn.now(), id_created: who.id, created_by: who.id, created_by_type: who.type, deleteflag: 0, oldid: null });
      notificationService.sendAlert({ room_id: context.room.room_id, alert_type: 'SENSOR_THRESHOLD', severity, message });
      await writeAudit(req, 'CREATE', 'alert', alertId, null, { alert_type: 'SENSOR_THRESHOLD', severity, message });
    }
    await writeAudit(req, 'CREATE', 'sensor_reading', readingId, null, { sensor_id: sensor.sensor_id, measured_at: measuredAt, value: body.value == null ? body.value_json : body.value });
    return res.status(201).json({ reading_id: readingId });
  } catch (error) { return res.status(500).json({ error: 'Unable to save sensor reading.' }); }
};

api.listAlerts = async (req, res) => {
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const query = knex('alerts').where({ room_id: room.room_id, deleteflag: 0 }).orderBy('triggered_at', 'desc');
    if (req.query.status) query.where('status', String(req.query.status).toUpperCase());
    return res.json({ result: await query.limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)) });
  } catch (error) { return res.status(500).json({ error: 'Unable to list alerts.' }); }
};

function userScope(req) {
  const who = actor(req);
  return { id: Number(who.id) || 0, type: String(who.type || 'USER').toUpperCase() };
}

api.listDashboardWidgets = async (req, res) => {
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const who = userScope(req);
    const result = await knex('room_dashboard_widgets').where({ room_id: room.room_id, user_id: who.id, user_type: who.type, deleteflag: 0 }).orderBy('display_order').orderBy('widget_id');
    return res.json({ result });
  } catch (error) { return res.status(500).json({ error: 'Unable to list dashboard widgets.' }); }
};

api.saveDashboardWidget = async (req, res) => {
  const body = req.body || {};
  const types = ['VALUE_CARD', 'LINE_CHART', 'BAR_CHART', 'GAUGE', 'DATA_TABLE', 'ROOM_VISUALIZATION'];
  const name = String(body.name || '').trim();
  const widgetType = String(body.widget_type || '').toUpperCase();
  const sensorIds = Array.isArray(body.sensor_ids) ? [...new Set(body.sensor_ids.map(Number))] : [];
  if (!name || name.length > 120 || !types.includes(widgetType) || sensorIds.some((id) => !Number.isInteger(id) || id < 1)) return res.status(400).json({ error: 'Invalid widget name, type, or sensor_ids.' });
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const valid = sensorIds.length ? await knex('sensors as s').join('devices as d', 'd.device_id', 's.device_id').whereIn('s.sensor_id', sensorIds).andWhere({ 'd.room_id': room.room_id, 'd.deleteflag': 0, 's.deleteflag': 0 }).countDistinct({ total: 's.sensor_id' }).first() : { total: 0 };
    if (Number(valid.total) !== sensorIds.length) return res.status(400).json({ error: 'Every sensor must belong to the selected room.' });
    const who = userScope(req);
    const configuration = body.configuration && typeof body.configuration === 'object' ? body.configuration : {};
    const row = { name, widget_type: widgetType, sensor_ids: JSON.stringify(sensorIds), configuration: JSON.stringify(configuration), display_order: Math.max(0, Number(body.display_order) || 0), updated_at: knex.fn.now(), id_updated: who.id };
    if (req.params.widgetId) {
      const widget = await knex('room_dashboard_widgets').where({ widget_id: req.params.widgetId, room_id: room.room_id, user_id: who.id, user_type: who.type, deleteflag: 0 }).first();
      if (!widget) return res.status(404).json({ error: 'Dashboard widget not found.' });
      await knex('room_dashboard_widgets').where({ widget_id: widget.widget_id }).update(row);
      await writeAudit(req, 'UPDATE', 'room_dashboard_widget', widget.widget_id, widget, row);
      return res.json({ widget_id: widget.widget_id, updated: true });
    }
    Object.assign(row, { room_id: room.room_id, user_id: who.id, user_type: who.type, created_at: knex.fn.now(), id_created: who.id, deleteflag: 0, oldid: null });
    const [widgetId] = await knex('room_dashboard_widgets').insert(row);
    await writeAudit(req, 'CREATE', 'room_dashboard_widget', widgetId, null, row);
    return res.status(201).json({ widget_id: widgetId });
  } catch (error) { return res.status(500).json({ error: 'Unable to save dashboard widget.' }); }
};

api.deleteDashboardWidget = async (req, res) => {
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const who = userScope(req);
    const widget = await knex('room_dashboard_widgets').where({ widget_id: req.params.widgetId, room_id: room.room_id, user_id: who.id, user_type: who.type, deleteflag: 0 }).first();
    if (!widget) return res.status(404).json({ error: 'Dashboard widget not found.' });
    await knex('room_dashboard_widgets').where({ widget_id: widget.widget_id }).update({ deleteflag: 1, oldid: widget.widget_id, updated_at: knex.fn.now(), id_updated: who.id });
    await writeAudit(req, 'DELETE', 'room_dashboard_widget', widget.widget_id, widget, null);
    return res.status(204).end();
  } catch (error) { return res.status(500).json({ error: 'Unable to delete dashboard widget.' }); }
};

api.roomAnalytics = async (req, res) => {
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return res.status(400).json({ error: 'Invalid date range.' });
    const ids = String(req.query.sensor_ids || '').split(',').filter(Boolean).map(Number);
    if (!ids.length || ids.some((id) => !Number.isInteger(id) || id < 1)) return res.status(400).json({ error: 'sensor_ids is required.' });
    const sensors = await knex('sensors as s').join('devices as d', 'd.device_id', 's.device_id').whereIn('s.sensor_id', ids).andWhere({ 'd.room_id': room.room_id, 'd.deleteflag': 0, 's.deleteflag': 0 }).select('s.sensor_id', 's.name', 's.unit');
    if (sensors.length !== new Set(ids).size) return res.status(404).json({ error: 'One or more sensors are not in this room.' });
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(1000, Math.max(1, Number(req.query.page_size) || 500));
    const rows = await knex('sensor_readings').whereIn('sensor_id', ids).where({ deleteflag: 0 }).whereBetween('measured_at', [from, to]).orderBy('measured_at', 'desc').limit(Math.min(20000, page * pageSize));
    const paged = rows.slice((page - 1) * pageSize, page * pageSize);
    const stats = sensors.map((sensor) => {
      const values = rows.filter((r) => r.sensor_id === sensor.sensor_id && r.value_number != null).map((r) => Number(r.value_number));
      const min = values.length ? Math.min(...values) : null;
      const max = values.length ? Math.max(...values) : null;
      const average = values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;
      return { sensor_id: sensor.sensor_id, name: sensor.name, unit: sensor.unit, count: values.length, min, max, average };
    });
    const bucketMs = req.query.bucket === 'day' ? 86400000 : req.query.bucket === 'hour' ? 3600000 : 0;
    const buckets = new Map();
    if (bucketMs) rows.forEach((reading) => {
      if (reading.value_number == null) return;
      const time = Math.floor(new Date(reading.measured_at).getTime() / bucketMs) * bucketMs;
      const key = `${reading.sensor_id}:${time}`;
      const value = Number(reading.value_number);
      const item = buckets.get(key) || { sensor_id: reading.sensor_id, bucket_start: new Date(time).toISOString(), min: value, max: value, total: 0, count: 0 };
      item.min = Math.min(item.min, value); item.max = Math.max(item.max, value); item.total += value; item.count += 1; buckets.set(key, item);
    });
    const aggregated = [...buckets.values()].map((item) => ({ sensor_id: item.sensor_id, bucket_start: item.bucket_start, min: item.min, max: item.max, average: item.total / item.count, count: item.count }));
    for (const item of aggregated) {
      const bucketSize = req.query.bucket;
      const values = { min_value: item.min, max_value: item.max, average_value: item.average, reading_count: item.count, updated_at: knex.fn.now(), id_updated: userScope(req).id };
      const existing = await knex('sensor_reading_aggregates').where({ sensor_id: item.sensor_id, bucket_start: new Date(item.bucket_start), bucket_size: bucketSize }).first('aggregate_id');
      if (existing) await knex('sensor_reading_aggregates').where({ aggregate_id: existing.aggregate_id }).update(Object.assign(values, { deleteflag: 0 }));
      else await knex('sensor_reading_aggregates').insert(Object.assign(values, { sensor_id: item.sensor_id, bucket_start: new Date(item.bucket_start), bucket_size: bucketSize, created_at: knex.fn.now(), id_created: userScope(req).id, deleteflag: 0, oldid: null }));
    }
    if (String(req.query.export || '').toLowerCase() === 'csv') {
      const csv = ['sensor_id,measured_at,value_number,value_text,quality', ...paged.map((r) => [r.sensor_id, r.measured_at, r.value_number, r.value_text, r.quality].map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(','))].join('\r\n');
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="room-${room.room_id}-sensor-data.csv"`);
      return res.send('\uFEFF' + csv);
    }
    return res.json({ result: { room_id: room.room_id, range: { from, to }, page, page_size: pageSize, raw: paged, statistics: stats, aggregated } });
  } catch (error) { return res.status(500).json({ error: 'Unable to query room analytics.' }); }
};

api.acknowledgeAlert = async (req, res) => {
  try {
    const alert = await knex('alerts').where({ alert_id: req.params.alertId, deleteflag: 0 }).first();
    if (!alert) return res.status(404).json({ error: 'Alert not found.' });
    const access = await roomController.canManageRoom(req, alert.room_id);
    if (!access.room) return res.status(404).json({ error: 'Alert not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const who = actor(req);
    const status = String((req.body || {}).status || 'ACKNOWLEDGED').toUpperCase();
    if (!['ACKNOWLEDGED', 'RESOLVED'].includes(status)) return res.status(400).json({ error: 'status must be ACKNOWLEDGED or RESOLVED.' });
    const update = { status, acknowledged_at: knex.fn.now(), acknowledged_by: who.id, updated_at: knex.fn.now(), id_updated: who.id };
    if ((req.body || {}).resolution != null) update.resolution = String(req.body.resolution).slice(0, 4000);
    await knex('alerts').where({ alert_id: alert.alert_id }).update(update);
    await writeAudit(req, 'UPDATE', 'alert', alert.alert_id, alert, update);
    return res.json({ alert_id: alert.alert_id, status });
  } catch (error) { return res.status(500).json({ error: 'Unable to update alert.' }); }
};

api.listCommands = async (req, res) => {
  try {
    const context = await deviceContext(req, req.params.deviceId, false);
    if (!context.room) return res.status(404).json({ error: 'Device not found.' });
    const result = await knex('device_commands').where({ device_id: context.device.device_id, deleteflag: 0 }).orderBy('command_id', 'desc').limit(250);
    return res.json({ result });
  } catch (error) { return res.status(500).json({ error: 'Unable to list device commands.' }); }
};

api.completeCommand = async (req, res) => {
  const status = String((req.body || {}).status || '').toUpperCase();
  if (status !== 'FAILED') return res.status(400).json({ error: 'Successful completion is recorded only after server-side device state confirmation.' });
  try {
    const command = await knex('device_commands').where({ command_id: req.params.commandId, deleteflag: 0 }).first();
    if (!command) return res.status(404).json({ error: 'Device command not found.' });
    const context = await deviceContext(req, command.device_id, true);
    if (!context.room) return res.status(404).json({ error: 'Device command not found.' });
    if (!context.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    if (!['PENDING', 'SENT', 'ACKNOWLEDGED'].includes(command.status)) return res.status(409).json({ error: 'Only pending, sent, or acknowledged commands can be completed.' });
    const result = (req.body || {}).result == null ? null : JSON.stringify((req.body || {}).result);
    const update = { status, result, completed_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: actor(req).id };
    await knex('device_commands').where({ command_id: command.command_id }).update(update);
    await writeAudit(req, 'COMMAND_' + status, 'device_command', command.command_id, command, update);
    return res.json({ command_id: command.command_id, status });
  } catch (error) { return res.status(500).json({ error: 'Unable to complete device command.' }); }
};

api.listAuditLogs = async (req, res) => {
  try {
    const room = await roomController.roomQuery(req, req.params.roomId).first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    const deviceRows = await knex('devices').where({ room_id: room.room_id, deleteflag: 0 }).select('device_id');
    const deviceIds = deviceRows.map((row) => row.device_id);
    const [sensorRows, actuatorRows, commandRows] = await Promise.all([
      deviceIds.length ? knex('sensors').whereIn('device_id', deviceIds).select('sensor_id') : [],
      deviceIds.length ? knex('actuators').whereIn('device_id', deviceIds).select('actuator_id') : [],
      deviceIds.length ? knex('device_commands').whereIn('device_id', deviceIds).select('command_id') : []
    ]);
    const entities = [
      { type: 'room', id: room.room_id }, { type: 'floor', id: room.floor_id }, { type: 'building', id: room.building_id },
      ...deviceIds.map((id) => ({ type: 'device', id })),
      ...sensorRows.map((row) => ({ type: 'sensor', id: row.sensor_id })),
      ...actuatorRows.map((row) => ({ type: 'actuator', id: row.actuator_id })),
      ...commandRows.map((row) => ({ type: 'device_command', id: row.command_id }))
    ];
    const query = knex('audit_logs').where({ deleteflag: 0 }).andWhere((builder) => {
      entities.forEach((entity) => builder.orWhere({ entity_type: entity.type, entity_id: entity.id }));
    }).orderBy('created_at', 'desc');
    return res.json({ result: await query.limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)) });
  } catch (error) { return res.status(500).json({ error: 'Unable to list audit history.' }); }
};

module.exports = api;
