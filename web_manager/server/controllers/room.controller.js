const knex = require('../config/knex.js');

const { writeAudit } = require('../services/roomIotAudit.js');
const rooms = {};
const deviceStatus = require('../services/mqtt/deviceStatusService.js');
const notificationService = require('../services/mqtt/notificationService.js');

function actor(req) {
  return { id: Number(req.currentUser.users_id), type: req.auth.type };
}

function roomQuery(req, id) {
  const who = actor(req);
  const query = knex('rooms as r').where('r.deleteflag', 0);
  if (req.currentUser.enterprise_id != null) query.where('r.enterprise_id', req.currentUser.enterprise_id);
  if (req.auth.type === 'admin') {
    if (id != null) query.where('r.room_id', id);
    return query;
  }
  query.andWhere(function () {
    this.whereExists(function () {
      this.select(knex.raw('1')).from('user_room_permissions as m')
        .whereRaw('m.room_id = r.room_id').where('m.user_id', who.id).where('m.user_type', who.type).where('m.deleteflag', 0);
    }).orWhere(function () {
      this.where('r.created_by', who.id).where('r.created_by_type', who.type);
    });
  });
  if (id != null) query.where('r.room_id', id);
  return query;
}

async function canManageRoom(req, id) {
  const who = actor(req);
  const room = await roomQuery(req, id).first();
  if (!room) return { room: null, allowed: false };
  if (req.auth.type === 'admin') return { room, allowed: true };
  if (Number(room.created_by) === who.id && room.created_by_type === who.type) return { room, allowed: true };
  const member = await knex('user_room_permissions as p').join('roles as r', 'r.role_id', 'p.role_id')
    .where({ 'p.room_id': room.room_id, 'p.user_id': who.id, 'p.user_type': who.type, 'p.deleteflag': 0, 'r.deleteflag': 0 }).first('r.role_code');
  return { room, allowed: Boolean(member && ['SYSTEM_ADMIN', 'BUILDING_MANAGER', 'FLOOR_MANAGER', 'ROOM_MANAGER', 'MANAGER'].includes(member.role_code)) };
}

async function canOperateRoom(req, id) {
  const who = actor(req);
  const room = await roomQuery(req, id).first();
  if (!room) return { room: null, allowed: false };
  if (req.auth.type === 'admin' || (Number(room.created_by) === who.id && room.created_by_type === who.type)) return { room, allowed: true };
  const member = await knex('user_room_permissions as p').join('roles as r', 'r.role_id', 'p.role_id')
    .where({ 'p.room_id': room.room_id, 'p.user_id': who.id, 'p.user_type': who.type, 'p.deleteflag': 0, 'r.deleteflag': 0 })
    .first('r.role_code');
  return { room, allowed: Boolean(member && ['SYSTEM_ADMIN', 'BUILDING_MANAGER', 'FLOOR_MANAGER', 'ROOM_MANAGER', 'MANAGER', 'OPERATOR'].includes(member.role_code)) };
}

function validateRoom(body, partial) {
  const input = {};
  if (!partial || body.room_code != null) input.room_code = String(body.room_code || '').trim();
  if (!partial || body.name != null) input.name = String(body.name || '').trim();
  if (!partial || body.building_id != null) input.building_id = Number(body.building_id);
  if (!partial || body.floor_id != null) input.floor_id = Number(body.floor_id);
  if (body.description != null) input.description = String(body.description).trim();
  if (body.area != null) input.area = Number(body.area);
  if (body.capacity != null) input.capacity = Number(body.capacity);
  if (body.status != null) input.status = String(body.status).toUpperCase();
  if ((input.room_code != null && (!input.room_code || input.room_code.length > 64)) ||
      (input.name != null && (!input.name || input.name.length > 160)) ||
      (input.building_id != null && !Number.isInteger(input.building_id)) ||
      (input.floor_id != null && !Number.isInteger(input.floor_id)) ||
      (input.area != null && (!Number.isFinite(input.area) || input.area < 0)) ||
      (input.capacity != null && (!Number.isInteger(input.capacity) || input.capacity < 0)) ||
      (input.status != null && !['ACTIVE', 'INACTIVE'].includes(input.status))) {
    throw new Error('Invalid room fields.');
  }
  return input;
}

rooms.overview = async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return res.status(400).json({ error: 'Invalid date range.' });
    const query = roomQuery(req).leftJoin('buildings as b', 'b.building_id', 'r.building_id').leftJoin('floors as f', 'f.floor_id', 'r.floor_id')
      .select('r.*', 'b.name as building_name', 'f.name as floor_name');
    for (const key of ['building_id', 'floor_id', 'room_id']) {
      if (req.query[key] == null || req.query[key] === '') continue;
      const id = Number(req.query[key]);
      if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: `Invalid ${key}.` });
      query.where(`r.${key}`, id);
    }
    const roomsRows = await query.orderBy('r.room_id', 'desc').limit(500);
    const details = await roomListDetails(req, roomsRows);
    const roomIds = details.map((room) => room.room_id);
    const devices = details.flatMap((room) => (room.devices || []).map((device) => Object.assign({}, device, { room_name: room.name, building_name: room.building_name, floor_name: room.floor_name })));
    const group = String(req.query.device_group || '').trim().toLowerCase();
    const selectedDevices = group ? devices.filter((device) => String(device.device_type || 'unknown').toLowerCase() === group) : devices;
    const selectedRoomIds = new Set(selectedDevices.map((device) => Number(device.room_id)));
    const visibleRooms = group ? details.filter((room) => selectedRoomIds.has(Number(room.room_id))) : details;
    for (const device of selectedDevices) {
      const openOffline = await knex('alerts').where({ room_id: device.room_id, device_id: device.device_id, alert_type: 'DEVICE_OFFLINE', status: 'OPEN', deleteflag: 0 }).first('alert_id');
      if (device.connection_status === 'OFFLINE' && !openOffline) {
        const alert = { room_id: device.room_id, device_id: device.device_id, alert_type: 'DEVICE_OFFLINE', severity: 'WARNING', status: 'OPEN', message: `${device.content || 'Device ' + device.mqtt_microservice_id} is offline.`, details: JSON.stringify({ last_online: device.last_online }), triggered_at: knex.fn.now(), created_at: knex.fn.now(), id_created: actor(req).id, created_by: actor(req).id, created_by_type: actor(req).type, deleteflag: 0, oldid: null };
        await knex('alerts').insert(alert);
        notificationService.sendAlert(alert);
      } else if (device.connection_status === 'ONLINE' && openOffline) {
        await knex('alerts').where({ alert_id: openOffline.alert_id }).update({ status: 'RESOLVED', resolution: 'Device reported online.', acknowledged_at: knex.fn.now(), updated_at: knex.fn.now(), id_updated: actor(req).id });
      }
    }
    const roomScope = roomIds.length ? roomIds : [-1];
    const [alerts, resolvedAlerts] = await Promise.all([
      knex('alerts').whereIn('room_id', roomScope).where({ deleteflag: 0 }).whereIn('status', ['OPEN', 'ACKNOWLEDGED']).orderBy('triggered_at', 'desc').limit(1000),
      knex('alerts').whereIn('room_id', roomScope).where({ deleteflag: 0, status: 'RESOLVED' }).whereBetween('triggered_at', [from, to]).orderBy('triggered_at', 'desc').limit(1000)
    ]);
    const alertHistory = [...alerts, ...resolvedAlerts].sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at));
    const isError = (device) => (device.live_status && device.live_status.rs != null && Number(device.live_status.rs) !== 0) || alerts.some((alert) => Number(alert.device_id) === Number(device.device_id) && ['DEVICE_ERROR', 'SENSOR_ERROR', 'DATA_ANOMALY'].includes(alert.alert_type));
    const staleCutoff = Date.now() - 15 * 60000;
    const categorized = selectedDevices.map((device) => Object.assign({}, device, {
      operational_status: isError(device) ? 'ERROR' : !device.last_online || new Date(device.last_online).getTime() < staleCutoff ? 'NO_RECENT_DATA' : device.connection_status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'
    }));
    const affectedDevices = new Set(alerts.map((alert) => Number(alert.device_id)).filter(Boolean));
    const affectedRooms = new Set(alerts.map((alert) => Number(alert.room_id)).filter(Boolean));
    const offlineEvents = alertHistory.filter((alert) => alert.alert_type === 'DEVICE_OFFLINE');
    const downtimeMinutes = offlineEvents.reduce((total, alert) => {
      const start = Math.max(new Date(alert.triggered_at).getTime(), from.getTime());
      const end = Math.min(new Date(alert.status === 'RESOLVED' && alert.acknowledged_at ? alert.acknowledged_at : to).getTime(), to.getTime());
      return total + Math.max(0, (end - start) / 60000);
    }, 0);
    const disconnectCounts = new Map();
    offlineEvents.forEach((alert) => disconnectCounts.set(alert.device_id, (disconnectCounts.get(alert.device_id) || 0) + 1));
    const result = {
      period: { from, to },
      totals: {
        devices: categorized.length,
        online: categorized.filter((device) => device.operational_status === 'ONLINE').length,
        offline: categorized.filter((device) => device.operational_status === 'OFFLINE').length,
        errors: categorized.filter((device) => device.operational_status === 'ERROR').length,
        no_recent_data: categorized.filter((device) => device.operational_status === 'NO_RECENT_DATA').length,
        open_alerts: alerts.length,
        critical_alerts: alerts.filter((alert) => alert.severity === 'CRITICAL').length,
        affected_devices: affectedDevices.size,
        affected_rooms: affectedRooms.size,
        downtime_minutes: Math.round(downtimeMinutes),
        frequent_disconnect_devices: [...disconnectCounts.values()].filter((count) => count > 1).length
      },
      devices: categorized,
      rooms: visibleRooms,
      alerts: alertHistory,
      locations: { buildings: [...new Map(details.map((room) => [room.building_id, { building_id: room.building_id, name: room.building_name }])).values()], floors: [...new Map(details.map((room) => [room.floor_id, { floor_id: room.floor_id, name: room.floor_name, building_id: room.building_id }])).values()] },
      device_groups: [...new Set(devices.map((device) => device.device_type).filter(Boolean))]
    };
    if (String(req.query.export || '').toLowerCase() === 'csv') {
      const fields = ['device_id', 'content', 'device_type', 'building_name', 'floor_name', 'room_name', 'operational_status', 'last_online', 'firmware_version'];
      const csv = [fields.join(','), ...categorized.map((device) => fields.map((key) => `"${String(device[key] == null ? '' : device[key]).replace(/"/g, '""')}"`).join(','))].join('\r\n');
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="iot-operations-report.csv"');
      return res.send('\uFEFF' + csv);
    }
    return res.json({ result });
  } catch (error) { return res.status(500).json({ error: 'Unable to load IoT overview.' }); }
};

function readOnlineTimeout(req) {
  const raw = Number(req.query.onlineTimeoutSeconds);
  return Number.isInteger(raw) ? Math.min(Math.max(raw, 30), 3600) : 180;
}

async function refreshDeviceState(devices, timeoutSeconds) {
  try { await deviceStatus.ensureConnected(); } catch (error) { /* State remains unknown until an MQTT response arrives. */ }
  await Promise.all(devices.map(async (device) => {
    if (!device.mqtt_pub) return;
    try {
      await deviceStatus.watch(device.mqtt_pub);
      await deviceStatus.requestStatus(device, false);
    } catch (error) { /* State remains unknown until an MQTT response arrives. */ }
  }));
  const now = Date.now();
  let online = 0;
  let offline = 0;
  let unknown = 0;
  const result = devices.map((device) => {
    const status = device.mqtt_pub ? deviceStatus.getStatus(device.mqtt_pub) : null;
    const received = status && status.receivedAt != null ? new Date(status.receivedAt).getTime() : NaN;
    const state = Number.isFinite(received) ? (now - received <= timeoutSeconds * 1000 ? 'ONLINE' : 'OFFLINE') : 'UNKNOWN';
    if (state === 'ONLINE') online += 1;
    else if (state === 'OFFLINE') offline += 1;
    else unknown += 1;
    return Object.assign({}, device, { connection_status: state, last_online: Number.isFinite(received) ? new Date(received).toISOString() : null, live_status: status });
  });
  return { devices: result, online, offline, unknown, total: devices.length };
}

async function roomDetails(req, room) {
  const [deviceRows, sensors, members, building, floor] = await Promise.all([
    knex('devices as rd').leftJoin('mqtt_microservice as d', 'd.mqtt_microservice_id', 'rd.mqtt_microservice_id')
      .where('rd.room_id', room.room_id).where('rd.status', 'ACTIVE').where('rd.deleteflag', 0)
      .select('rd.*', 'd.content', 'd.mqtt_pub', 'd.mqtt_sub', 'd.mqtt_pass', 'd.mqtt_microservice_id'),
    knex('sensors as s').join('devices as rd', 'rd.device_id', 's.device_id')
      .where('rd.room_id', room.room_id).where('rd.deleteflag', 0).where('s.status', 'ACTIVE').where('s.deleteflag', 0).select('s.*', 'rd.mqtt_microservice_id'),
    knex('user_room_permissions as p').join('roles as r', 'r.role_id', 'p.role_id')
      .where({ 'p.room_id': room.room_id, 'p.deleteflag': 0, 'r.deleteflag': 0 })
      .select('p.permission_id', 'p.user_id', 'p.user_type', 'p.role_id', 'r.role_code'),
    knex('buildings').where({ building_id: room.building_id, deleteflag: 0 }).first('building_id', 'name', 'building_code'),
    knex('floors').where({ floor_id: room.floor_id, deleteflag: 0 }).first('floor_id', 'name', 'floor_code', 'level_number')
  ]);
  const live = await refreshDeviceState(deviceRows, readOnlineTimeout(req));
  for (const device of live.devices) {
    const open = await knex('alerts').where({ room_id: room.room_id, device_id: device.device_id, alert_type: 'DEVICE_OFFLINE', status: 'OPEN', deleteflag: 0 }).first('alert_id');
    if (device.connection_status === 'OFFLINE' && !open) {
      const alert = { room_id: room.room_id, device_id: device.device_id, alert_type: 'DEVICE_OFFLINE', severity: 'WARNING', status: 'OPEN', message: `${device.content || 'Device ' + device.device_id} is offline.`, details: JSON.stringify({ last_online: device.last_online }), triggered_at: knex.fn.now(), created_at: knex.fn.now(), id_created: 0, created_by: 0, created_by_type: 'system', deleteflag: 0, oldid: null };
      await knex('alerts').insert(alert);
      notificationService.sendAlert(alert);
    } else if (device.connection_status === 'ONLINE' && open) {
      await knex('alerts').where({ alert_id: open.alert_id }).update({ status: 'RESOLVED', resolution: 'Device reported online.', acknowledged_at: knex.fn.now(), updated_at: knex.fn.now() });
    }
  }
  live.devices.forEach((device) => { delete device.mqtt_sub; delete device.mqtt_pass; });
  const sensorIds = sensors.map((sensor) => sensor.sensor_id);
  const readings = sensorIds.length ? await Promise.all(sensorIds.map((sensorId) =>
    knex('sensor_readings').where({ sensor_id: sensorId, deleteflag: 0 }).orderBy('measured_at', 'desc').first()
  )) : [];
  const latestBySensor = new Map();
  readings.forEach((reading) => { if (!latestBySensor.has(reading.sensor_id)) latestBySensor.set(reading.sensor_id, reading); });
  const sensorsWithLatest = sensors.map((sensor) => Object.assign({}, sensor, { latest_reading: latestBySensor.get(sensor.sensor_id) || null }));
  const openAlerts = await knex('alerts').where({ room_id: room.room_id, deleteflag: 0 }).whereIn('status', ['OPEN', 'ACKNOWLEDGED']).count({ count: '*' }).first();
  const managers = members.filter((member) => ['SYSTEM_ADMIN', 'BUILDING_MANAGER', 'FLOOR_MANAGER', 'ROOM_MANAGER', 'MANAGER', 'OWNER'].includes(member.role_code));
  const activity = room.status !== 'ACTIVE' ? 'INACTIVE'
    : live.online > 0 ? 'ONLINE'
      : live.total > 0 && live.unknown === 0 ? 'OFFLINE'
        : live.total === 0 ? 'NO_DEVICES' : 'UNKNOWN';
  const manager = managers[0] || { user_id: room.created_by, user_type: room.created_by_type, role_code: 'OWNER' };
  return Object.assign({}, room, {
    building, floor, manager, managers, activity_status: activity,
    device_summary: { total: live.total, online: live.online, offline: live.offline, unknown: live.unknown },
    sensor_summary: { total: sensors.length, active: sensors.filter((sensor) => sensor.status === 'ACTIVE').length },
    open_alerts: Number(openAlerts.count || 0), devices: live.devices, sensors: sensorsWithLatest, members
  });
}

async function roomListDetails(req, roomsList) {
  if (!roomsList.length) return [];
  const roomIds = roomsList.map((room) => room.room_id);
  const deviceRows = await knex('devices as rd').leftJoin('mqtt_microservice as d', 'd.mqtt_microservice_id', 'rd.mqtt_microservice_id')
    .whereIn('rd.room_id', roomIds).where('rd.status', 'ACTIVE').where('rd.deleteflag', 0)
    .select('rd.*', 'd.content', 'd.mqtt_pub', 'd.mqtt_sub', 'd.mqtt_pass', 'd.mqtt_microservice_id', 'd.updated_at as device_updated_at');
  const live = await refreshDeviceState(deviceRows, readOnlineTimeout(req));
  const deviceGroups = new Map();
  live.devices.forEach((device) => {
    delete device.mqtt_sub;
    delete device.mqtt_pass;
    if (!deviceGroups.has(device.room_id)) deviceGroups.set(device.room_id, []);
    deviceGroups.get(device.room_id).push(device);
  });
  const [members, sensors, alerts] = await Promise.all([
    knex('user_room_permissions as p').join('roles as r', 'r.role_id', 'p.role_id')
      .whereIn('p.room_id', roomIds).where({ 'p.deleteflag': 0, 'r.deleteflag': 0 })
      .select('p.room_id', 'p.user_id', 'p.user_type', 'p.role_id', 'r.role_code'),
    knex('sensors as s').join('devices as d', 'd.device_id', 's.device_id')
      .whereIn('d.room_id', roomIds).where({ 'd.deleteflag': 0, 's.deleteflag': 0, 's.status': 'ACTIVE' })
      .select('d.room_id', 's.sensor_id'),
    knex('alerts').whereIn('room_id', roomIds).where({ deleteflag: 0 }).whereIn('status', ['OPEN', 'ACKNOWLEDGED'])
      .select('room_id').count({ count: '*' }).groupBy('room_id')
  ]);
  const memberGroups = new Map();
  members.forEach((member) => {
    if (!memberGroups.has(member.room_id)) memberGroups.set(member.room_id, []);
    memberGroups.get(member.room_id).push(member);
  });
  const sensorCounts = new Map();
  sensors.forEach((sensor) => sensorCounts.set(sensor.room_id, (sensorCounts.get(sensor.room_id) || 0) + 1));
  const alertCounts = new Map(alerts.map((item) => [item.room_id, Number(item.count)]));
  return roomsList.map((room) => {
    const devices = deviceGroups.get(room.room_id) || [];
    const online = devices.filter((device) => device.connection_status === 'ONLINE').length;
    const offline = devices.filter((device) => device.connection_status === 'OFFLINE').length;
    const unknown = devices.length - online - offline;
    const activity = room.status !== 'ACTIVE' ? 'INACTIVE' : online > 0 ? 'ONLINE'
      : devices.length > 0 && unknown === 0 ? 'OFFLINE' : devices.length === 0 ? 'NO_DEVICES' : 'UNKNOWN';
    const managers = (memberGroups.get(room.room_id) || []).filter((member) => ['SYSTEM_ADMIN', 'BUILDING_MANAGER', 'FLOOR_MANAGER', 'ROOM_MANAGER', 'MANAGER', 'OWNER'].includes(member.role_code));
    return Object.assign({}, room, {
      manager: managers[0] || { user_id: room.created_by, user_type: room.created_by_type, role_code: 'OWNER' },
      managers, activity_status: activity,
      device_summary: { total: devices.length, online, offline, unknown },
      sensor_summary: { total: sensorCounts.get(room.room_id) || 0, active: sensorCounts.get(room.room_id) || 0 },
      open_alerts: alertCounts.get(room.room_id) || 0
    });
  });
}

async function roomBlockers(roomId) {
  const [activeDevices, pendingCommands, unresolvedAlerts] = await Promise.all([
    knex('devices').where({ room_id: roomId, deleteflag: 0, status: 'ACTIVE' }).count({ count: '*' }).first(),
    knex('device_commands as c').join('devices as d', 'd.device_id', 'c.device_id')
      .where({ 'd.room_id': roomId, 'd.deleteflag': 0, 'c.deleteflag': 0 }).whereIn('c.status', ['PENDING', 'SENT']).count({ count: '*' }).first(),
    knex('alerts').where({ room_id: roomId, deleteflag: 0 }).whereIn('status', ['OPEN', 'ACKNOWLEDGED']).count({ count: '*' }).first()
  ]);
  return {
    active_devices: Number(activeDevices.count || 0),
    pending_commands: Number(pendingCommands.count || 0),
    unresolved_alerts: Number(unresolvedAlerts.count || 0)
  };
}

function hasRoomBlockers(blockers) {
  return blockers.active_devices > 0 || blockers.pending_commands > 0 || blockers.unresolved_alerts > 0;
}

rooms.list = async (req, res) => {
  try {
    const query = roomQuery(req).leftJoin('buildings as b', 'b.building_id', 'r.building_id')
      .leftJoin('floors as f', 'f.floor_id', 'r.floor_id')
      .select('r.*', 'b.name as building_name', 'f.name as floor_name', 'f.level_number').orderBy('r.room_id', 'desc');
    const search = String(req.query.search || '').trim();
    if (search) query.andWhere((q) => q.where('r.name', 'like', `%${search}%`).orWhere('r.room_code', 'like', `%${search}%`));
    if (req.query.status) query.where('r.status', String(req.query.status).toUpperCase());
    const rows = await query.limit(Math.min(Math.max(Number(req.query.limit) || 100, 1), 100));
    const result = await roomListDetails(req, rows);
    const activity = String(req.query.activity || '').toUpperCase();
    return res.json({ result: activity ? result.filter((room) => room.activity_status === activity) : result });
  } catch (error) { return res.status(500).json({ error: 'Unable to list rooms.' }); }
};

rooms.create = async (req, res) => {
  let data;
  try { data = validateRoom(req.body || {}, false); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  try {
    const buildingQuery = knex('buildings').where({ building_id: data.building_id, deleteflag: 0 });
    if (req.currentUser.enterprise_id != null) buildingQuery.where('enterprise_id', req.currentUser.enterprise_id);
    else buildingQuery.whereNull('enterprise_id').where({ created_by: actor(req).id, created_by_type: actor(req).type });
    const [building, floor] = await Promise.all([
      buildingQuery.first(),
      knex('floors').where({ floor_id: data.floor_id, building_id: data.building_id, deleteflag: 0 }).first()
    ]);
    if (!building || !floor) return res.status(400).json({ error: 'Building and floor must exist and belong together.' });
    const who = actor(req);
    const row = Object.assign(data, {
      enterprise_id: req.currentUser.enterprise_id || building.enterprise_id || null,
      created_by: who.id, created_by_type: who.type, created_at: knex.fn.now(),
      id_created: who.id, deleteflag: 0, oldid: null
    });
    const [id] = await knex('rooms').insert(row);
    await writeAudit(req, 'CREATE', 'room', id, null, row);
    return res.status(201).json({ room_id: id, result: await roomQuery(req, id).first() });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Room code already exists in this enterprise.' });
    return res.status(500).json({ error: 'Unable to create room.' });
  }
};

rooms.get = async (req, res) => {
  try {
    const room = await roomQuery(req, req.params.id).select('r.*').first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json({ result: await roomDetails(req, room) });
  } catch (error) { return res.status(500).json({ error: 'Unable to load room.' }); }
};

rooms.summary = async (req, res) => {
  try {
    const room = await roomQuery(req, req.params.id).select('r.*').first();
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    return res.json({ result: await roomDetails(req, room) });
  } catch (error) { return res.status(500).json({ error: 'Unable to load room summary.' }); }
};

rooms.setMember = async (req, res) => {
  const body = req.body || {};
  const userId = Number(body.user_id);
  const userType = String(body.user_type || '').toLowerCase();
  const roleCode = String(body.role || 'VIEWER').toUpperCase();
  const validRoles = ['SYSTEM_ADMIN', 'BUILDING_MANAGER', 'FLOOR_MANAGER', 'ROOM_MANAGER', 'MANAGER', 'OPERATOR', 'VIEWER'];
  if (!Number.isInteger(userId) || !['admin', 'customer'].includes(userType) || !validRoles.includes(roleCode)) {
    return res.status(400).json({ error: 'Valid user_id, user_type and role are required.' });
  }
  if (roleCode === 'SYSTEM_ADMIN' && req.auth.type !== 'admin') return res.status(403).json({ error: 'Only a system admin can grant the System Admin role.' });
  if (['BUILDING_MANAGER', 'FLOOR_MANAGER'].includes(roleCode) && req.auth.type !== 'admin') return res.status(403).json({ error: 'Only a system admin can grant building or floor manager roles.' });
  try {
    const access = await canManageRoom(req, req.params.id);
    if (!access.room) return res.status(404).json({ error: 'Room not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const who = actor(req);
    const role = await knex('roles').where({ role_code: roleCode, deleteflag: 0 }).first();
    if (!role) return res.status(500).json({ error: 'Room role definitions are missing.' });
    await knex('user_room_permissions').insert({ room_id: access.room.room_id, user_id: userId, user_type: userType, role_id: role.role_id,
      created_at: knex.fn.now(), id_created: who.id, created_by: who.id, created_by_type: who.type, deleteflag: 0, oldid: null })
      .onConflict(['room_id', 'user_id', 'user_type']).merge({ role_id: role.role_id, updated_at: knex.fn.now(), id_updated: who.id, deleteflag: 0 });
    await writeAudit(req, 'GRANT_ACCESS', 'room', access.room.room_id, null, { user_id: userId, user_type: userType, role: roleCode });
    return res.status(200).json({ result: { room_id: access.room.room_id, user_id: userId, user_type: userType, role: roleCode } });
  } catch (error) { return res.status(500).json({ error: 'Unable to assign room access.' }); }
};

rooms.removeMember = async (req, res) => {
  try {
    const access = await canManageRoom(req, req.params.id);
    if (!access.room) return res.status(404).json({ error: 'Room not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const who = actor(req);
    const removed = await knex('user_room_permissions').where({ room_id: access.room.room_id, permission_id: req.params.memberId, deleteflag: 0 })
      .update({ deleteflag: 1, updated_at: knex.fn.now(), id_updated: who.id });
    if (removed) await writeAudit(req, 'REVOKE_ACCESS', 'room', access.room.room_id, { permission_id: Number(req.params.memberId) }, null);
    return removed ? res.status(204).end() : res.status(404).json({ error: 'Room member not found.' });
  } catch (error) { return res.status(500).json({ error: 'Unable to remove room access.' }); }
};

rooms.roles = async (_req, res) => {
  try { return res.json({ result: await knex('roles').where({ deleteflag: 0 }).orderBy('role_id', 'asc') }); }
  catch (error) { return res.status(500).json({ error: 'Unable to list room roles.' }); }
};

rooms.addDevice = async (req, res) => {
  const deviceId = Number((req.body || {}).mqtt_microservice_id);
  if (!Number.isInteger(deviceId)) return res.status(400).json({ error: 'mqtt_microservice_id is required.' });
  try {
    const access = await canManageRoom(req, req.params.id);
    const room = access.room;
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const accountKey = req.auth.type + '_' + req.currentUser.users_id;
    const device = await knex('mqtt_microservice').where({ mqtt_microservice_id: deviceId, mqtt_user: accountKey, deleteflag: 0 }).first();
    if (!device) return res.status(404).json({ error: 'Device not found.' });
    const linked = await knex('devices').where({ mqtt_microservice_id: deviceId }).first();
    let roomDeviceId = linked && linked.device_id;
    if (linked) {
      if (linked.status === 'ACTIVE') return res.status(409).json({ error: 'Device is already assigned to a room.' });
      await knex('devices').where({ device_id: linked.device_id }).update({ room_id: room.room_id, status: 'ACTIVE', updated_at: knex.fn.now(), id_updated: actor(req).id, deleteflag: 0 });
    } else {
      const who = actor(req);
      const inserted = await knex('devices').insert({ room_id: room.room_id, mqtt_microservice_id: deviceId,
        created_at: knex.fn.now(), id_created: who.id, created_by: who.id, created_by_type: who.type, deleteflag: 0, oldid: null });
      roomDeviceId = inserted[0];
    }
    await writeAudit(req, 'ASSIGN_DEVICE', 'device', roomDeviceId, null, { room_id: room.room_id, mqtt_microservice_id: deviceId });
    return res.status(201).json({ result: { room_id: room.room_id, mqtt_microservice_id: deviceId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Device is already assigned to a room.' });
    return res.status(500).json({ error: 'Unable to assign device.' });
  }
};

rooms.removeDevice = async (req, res) => {
  const deviceId = Number(req.params.deviceId);
  try {
    const access = await canManageRoom(req, req.params.id);
    const room = access.room;
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const who = actor(req);
    const linked = await knex('devices').where({ room_id: room.room_id, mqtt_microservice_id: deviceId, status: 'ACTIVE', deleteflag: 0 }).first();
    if (!linked) return res.status(404).json({ error: 'Room device not found.' });
    const changed = await knex('devices').where({ device_id: linked.device_id })
      .update({ status: 'INACTIVE', deleteflag: 1, updated_at: knex.fn.now(), id_updated: who.id });
    if (changed) await writeAudit(req, 'UNASSIGN_DEVICE', 'device', linked.device_id, { room_id: room.room_id }, null);
    return changed ? res.status(204).end() : res.status(404).json({ error: 'Room device not found.' });
  } catch (error) { return res.status(500).json({ error: 'Unable to remove room device.' }); }
};

rooms.canOperateRoom = canOperateRoom;

rooms.update = async (req, res) => {
  let data;
  try { data = validateRoom(req.body || {}, true); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  if (!Object.keys(data).length) return res.status(400).json({ error: 'No room fields supplied.' });
  try {
    const access = await canManageRoom(req, req.params.id);
    const existing = access.room;
    if (!existing) return res.status(404).json({ error: 'Room not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    if (data.status === 'INACTIVE' && existing.status !== 'INACTIVE') {
      const blockers = await roomBlockers(existing.room_id);
      if (hasRoomBlockers(blockers)) return res.status(409).json({ error: 'Resolve active devices, pending commands, and open alerts before deactivating this room.', blockers });
    }
    const buildingId = data.building_id || existing.building_id;
    const floorId = data.floor_id || existing.floor_id;
    const buildingQuery = knex('buildings').where({ building_id: buildingId, deleteflag: 0 });
    if (req.currentUser.enterprise_id != null) buildingQuery.where('enterprise_id', req.currentUser.enterprise_id);
    else buildingQuery.whereNull('enterprise_id').where({ created_by: actor(req).id, created_by_type: actor(req).type });
    const [floor, building] = await Promise.all([
      knex('floors').where({ floor_id: floorId, building_id: buildingId, deleteflag: 0 }).first(), buildingQuery.first()
    ]);
    if (!floor || !building) return res.status(400).json({ error: 'Floor must belong to an accessible building.' });
    await knex('rooms').where({ room_id: existing.room_id }).update(Object.assign(data, { updated_at: knex.fn.now(), id_updated: actor(req).id }));
    await writeAudit(req, 'UPDATE', 'room', existing.room_id, existing, data);
    return res.json({ result: await roomQuery(req, existing.room_id).first() });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Room code already exists in this enterprise.' });
    return res.status(500).json({ error: 'Unable to update room.' });
  }
};

rooms.remove = async (req, res) => {
  try {
    const access = await canManageRoom(req, req.params.id);
    const room = access.room;
    if (!room) return res.status(404).json({ error: 'Room not found.' });
    if (!access.allowed) return res.status(403).json({ error: 'Room manager role required.' });
    const blockers = await roomBlockers(room.room_id);
    if (hasRoomBlockers(blockers)) {
      return res.status(409).json({ error: 'Resolve active devices, pending commands, and open alerts before deactivating this room.', blockers });
    }
    await knex('rooms').where({ room_id: room.room_id }).update({ status: 'INACTIVE', deleteflag: 1, updated_at: knex.fn.now(), id_updated: actor(req).id });
    await writeAudit(req, 'DELETE', 'room', room.room_id, room, null);
    return res.status(204).end();
  } catch (error) { return res.status(500).json({ error: 'Unable to deactivate room.' }); }
};

module.exports = rooms;
rooms.roomQuery = roomQuery;
rooms.canManageRoom = canManageRoom;
rooms.actor = actor;
