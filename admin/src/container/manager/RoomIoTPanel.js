import React, { useEffect, useMemo, useState } from 'react';
import {
  Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem,
  Paper, Table, TableBody, TableCell, TableHead, TableRow, Tabs, Tab, TextField, Typography
} from '@material-ui/core';
import {
  acknowledgeAlert, assignDevice, controlActuator, controlRoomActuators, createDeviceActuator, createDeviceSensor, deleteActuator,
  deleteSensor, listDeviceActuators, listDeviceCommands, listRoomAlerts, listRoomAudit,
  unassignDevice, updateActuator, updateRoomDevice, updateSensor
} from '../../api/roomManagementApi';
import SensorMonitorDialog from './SensorMonitorDialog';
import RoomDataWorkbench from './RoomDataWorkbench';

const sensorDefaults = { sensor_key: '', name: '', sensor_type: '', unit: '', description: '', min_value: '', max_value: '', warning_low: '', warning_high: '', calibration_offset: '', calibration_scale: '', update_interval_seconds: 60, display_type: 'VALUE_CARD', status: 'ACTIVE' };
const actuatorDefaults = { actuator_key: '', name: '', actuator_type: '', channel_number: 1, status: 'ACTIVE' };
const deviceDefaults = { device_type: '', firmware_version: '', mac_address: '', ip_address: '' };
const valueOf = (reading) => reading && (reading.value_number != null ? reading.value_number : reading.value_text != null ? reading.value_text : reading.value_json != null ? reading.value_json : '—');
const errorMessage = (e) => e && e.response && e.response.data && (e.response.data.error || e.response.data.message) || e.message || 'Không thể hoàn tất thao tác.';

export default function RoomIoTPanel({ room, summary, devices = [], rooms = [], onRefresh, onError }) {
  const [tab, setTab] = useState(0);
  const [actuatorsByDevice, setActuatorsByDevice] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [commands, setCommands] = useState([]);
  const [dialog, setDialog] = useState('');
  const [asset, setAsset] = useState(null);
  const [form, setForm] = useState(sensorDefaults);
  const [transferRoom, setTransferRoom] = useState('');
  const [monitoredSensor, setMonitoredSensor] = useState(null);
  const [commandFeedback, setCommandFeedback] = useState('');

  useEffect(() => {
    if (!room) return;
    let alive = true;
    Promise.all([
      listRoomAlerts(room.room_id || room.id),
      Promise.all(devices.map((d) => listDeviceActuators(d.device_id).then((rows) => [d.device_id, rows])))
    ]).then(([a, actuatorRows]) => {
      if (!alive) return;
      setAlerts(a);
      setActuatorsByDevice(Object.fromEntries(actuatorRows));
    }).catch((e) => { if (alive) onError(errorMessage(e)); });
    return () => { alive = false; };
  }, [room, devices, onError]);

  const sensors = summary && summary.sensors || [];
  const actuatorList = Object.values(actuatorsByDevice).reduce((all, values) => all.concat(values || []), []);
  const openAlerts = useMemo(() => alerts.filter((a) => ['OPEN', 'ACKNOWLEDGED'].includes(a.status)), [alerts]);
  const refresh = async () => { try { await onRefresh(); } catch (e) { onError(errorMessage(e)); } };
  const run = async (fn) => { try { await fn(); await refresh(); } catch (e) { onError(errorMessage(e)); } };
  const executeControl = async (fn) => {
    try {
      const response = await fn();
      const result = response && response.data && response.data.result;
      const completed = result && (result.status === 'SUCCEEDED' || (Array.isArray(result.results) && result.results.length > 0 && result.results.every((item) => item.status === 'SUCCEEDED')));
      setCommandFeedback(completed ? 'Thiết bị đã xác nhận thực thi.' : 'Đã gửi lệnh; đang chờ xác nhận thực thi từ thiết bị.');
      await refresh();
    } catch (e) { onError(errorMessage(e)); }
  };
  const saveAsset = async () => {
    if (dialog === 'device') {
      await run(() => updateRoomDevice(asset.device_id, form));
      setDialog('');
      return;
    }
    const sensor = dialog === 'sensor';
    const payload = sensor
      ? { ...form, min_value: form.min_value === '' ? null : Number(form.min_value), max_value: form.max_value === '' ? null : Number(form.max_value), warning_low: form.warning_low === '' ? null : Number(form.warning_low), warning_high: form.warning_high === '' ? null : Number(form.warning_high), calibration_offset: form.calibration_offset === '' ? null : Number(form.calibration_offset), calibration_scale: form.calibration_scale === '' ? null : Number(form.calibration_scale), update_interval_seconds: Number(form.update_interval_seconds) }
      : { ...form, channel_number: Number(form.channel_number) };
    await run(async () => {
      if (sensor) asset ? await updateSensor(asset.sensor_id, payload) : await createDeviceSensor(asset && asset.device_id, payload);
      else asset ? await updateActuator(asset.actuator_id, payload) : await createDeviceActuator(asset.device_id, payload);
    });
    setDialog('');
  };
  const edit = (kind, row, deviceId) => {
    setAsset(row ? { ...row, device_id: deviceId || row.device_id } : { device_id: deviceId });
    const defaults = kind === 'sensor' ? sensorDefaults : kind === 'actuator' ? actuatorDefaults : deviceDefaults;
    setForm(row ? { ...defaults, ...row } : defaults);
    setDialog(kind);
  };
  const showHistory = async () => {
    try { setHistory(await listRoomAudit(room.room_id || room.id)); setDialog('history'); }
    catch (e) { onError(errorMessage(e)); }
  };
  const showCommands = async (device) => {
    try { setAsset(device); setCommands(await listDeviceCommands(device.device_id)); setDialog('commands'); }
    catch (e) { onError(errorMessage(e)); }
  };
  const moveDevice = async (device) => {
    if (!transferRoom || String(transferRoom) === String(room.room_id || room.id)) return;
    const sourceId = room.room_id || room.id;
    try {
      await unassignDevice(sourceId, device.mqtt_microservice_id);
      await assignDevice(transferRoom, device.mqtt_microservice_id);
      setTransferRoom(''); await refresh();
    } catch (e) { onError('Chuyển thiết bị chưa hoàn tất: ' + errorMessage(e)); }
  };

  if (!room) return null;
  return <Paper style={{ marginTop: 16, padding: 16 }}>
    {commandFeedback && <Paper variant="outlined" style={{ padding: 10, marginBottom: 8 }} onClick={() => setCommandFeedback('')}>{commandFeedback}</Paper>}
    <Tabs value={tab} onChange={(e, value) => setTab(value)} variant="scrollable" scrollButtons="auto">
      <Tab label="Dashboard phòng" /><Tab label={`Thiết bị (${devices.length})`} /><Tab label={`Sensor (${sensors.length})`} /><Tab label="Actuator" /><Tab label={`Cảnh báo (${openAlerts.length})`} />
      <Tab label="Data Visualization" />
    </Tabs>
    {tab === 0 && <Grid container spacing={2} style={{ paddingTop: 16 }}>
      <Grid item xs={12} md={4}><Typography variant="subtitle1">Hoạt động chung: <Chip size="small" label={summary && summary.activity_status || 'UNKNOWN'} /></Typography><Typography color="textSecondary">Mã phòng: {room.room_code || '—'} · Vị trí: {summary && summary.building && summary.building.name || '—'} / {summary && summary.floor && summary.floor.name || '—'}</Typography><Typography style={{ marginTop: 12 }}>Thiết bị {devices.length} · Online {devices.filter((d) => d.connection_status === 'ONLINE').length} · Offline {devices.filter((d) => d.connection_status === 'OFFLINE').length}</Typography><Typography>Sensor {sensors.length} · Đang hoạt động {sensors.filter((s) => s.status === 'ACTIVE').length}</Typography><Typography>Cảnh báo hiện tại {openAlerts.length}</Typography></Grid>
      <Grid item xs={12} md={8}><Typography variant="subtitle1">Giá trị sensor mới nhất</Typography><Grid container spacing={1}>{sensors.map((s) => <Grid item xs={12} sm={6} md={4} key={s.sensor_id}><Paper variant="outlined" style={{ padding: 12 }}><Typography variant="caption" color="textSecondary">{s.name} · {s.sensor_type}</Typography><Typography variant="h6">{valueOf(s.latest_reading)} {s.unit || ''}</Typography><Typography variant="caption">{s.status}</Typography></Paper></Grid>)}{!sensors.length && <Grid item><Typography color="textSecondary">Chưa đăng ký sensor.</Typography></Grid>}</Grid></Grid>
      <Grid item xs={12}><Typography variant="subtitle1">Điều khiển nhóm actuator đã đăng ký</Typography><Grid container spacing={1}>{Array.from(new Set(actuatorList.filter((a) => a.status === 'ACTIVE').map((a) => a.actuator_key))).map((key) => <Grid item key={key}><Typography>{key}</Typography><Button variant="outlined" onClick={() => executeControl(() => controlRoomActuators(room.room_id || room.id, key, true))}>Bật</Button><Button variant="outlined" onClick={() => executeControl(() => controlRoomActuators(room.room_id || room.id, key, false))}>Tắt</Button></Grid>)}</Grid></Grid>
      <Grid item xs={12}><Typography variant="subtitle1">Cảnh báo hiện tại</Typography>{openAlerts.map((a) => <Paper key={a.alert_id} variant="outlined" style={{ padding: 10, marginTop: 6 }}><Grid container justify="space-between" alignItems="center"><Grid item><Chip size="small" label={a.severity} color={a.severity === 'CRITICAL' ? 'secondary' : 'default'} /> {a.message} <Typography variant="caption" color="textSecondary">{a.triggered_at}</Typography></Grid><Grid item>{a.status === 'OPEN' && <Button size="small" onClick={() => run(() => acknowledgeAlert(a.alert_id))}>Xác nhận</Button>}</Grid></Grid></Paper>)}{!openAlerts.length && <Typography color="textSecondary">Không có cảnh báo đang mở.</Typography>}</Grid>
    </Grid>}
    {tab === 1 && <div style={{ paddingTop: 12 }}><Grid container justify="space-between" alignItems="center"><Grid item><Typography color="textSecondary">Thiết bị liên kết MQTT; thêm thiết bị bằng mã mqtt_microservice_id.</Typography></Grid><Grid item><TextField select size="small" label="Chuyển sang phòng" value={transferRoom} onChange={(e) => setTransferRoom(e.target.value)} style={{ minWidth: 180 }}>{rooms.filter((r) => String(r.room_id || r.id) !== String(room.room_id || room.id)).map((r) => <MenuItem key={r.room_id || r.id} value={r.room_id || r.id}>{r.name}</MenuItem>)}</TextField></Grid></Grid>
      <Table size="small"><TableHead><TableRow>{['Device ID', 'Name / Type', 'MAC', 'IP', 'Firmware', 'Connection', 'Last Online', 'Thao tác'].map((x) => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>{devices.map((d) => <TableRow key={d.device_id}><TableCell>{d.mqtt_microservice_id || d.device_id}</TableCell><TableCell>{d.name || d.content || d.device_type || '—'}<br />{d.device_type || '—'}</TableCell><TableCell>{d.mac_address || '—'}</TableCell><TableCell>{d.ip_address || '—'}</TableCell><TableCell>{d.firmware_version || '—'}</TableCell><TableCell><Chip size="small" label={d.connection_status || 'UNKNOWN'} /></TableCell><TableCell>{d.last_online ? new Date(d.last_online).toLocaleString() : '—'}</TableCell><TableCell><Button size="small" onClick={() => edit('device', d)}>Sửa</Button><Button size="small" onClick={() => showCommands(d)}>Lịch sử lệnh</Button><Button size="small" disabled={!transferRoom} onClick={() => moveDevice(d)}>Chuyển</Button><Button size="small" color="secondary" onClick={() => run(() => unassignDevice(room.room_id || room.id, d.mqtt_microservice_id))}>Vô hiệu hóa</Button></TableCell></TableRow>)}</TableBody></Table>
      <Button size="small" onClick={showHistory}>Lịch sử hoạt động phòng</Button>
    </div>}
    {tab === 2 && <div style={{ paddingTop: 12 }}><Grid container justify="space-between"><Grid item><Typography color="textSecondary">Danh sách tự sinh theo sensor đã đăng ký, không cố định loại sensor.</Typography></Grid><Grid item><TextField select size="small" label="Thiết bị" value="" onChange={(e) => edit('sensor', null, Number(e.target.value))} style={{ minWidth: 190 }}><MenuItem value="" disabled>Thêm sensor vào thiết bị</MenuItem>{devices.map((d) => <MenuItem key={d.device_id} value={d.device_id}>{d.name || d.content || `Thiết bị ${d.mqtt_microservice_id}`}</MenuItem>)}</TextField></Grid></Grid>
      <Table size="small"><TableHead><TableRow>{['Tên', 'Key', 'Loại', 'Đơn vị', 'Giá trị mới nhất', 'Min / Max', 'Ngưỡng cảnh báo', 'Chu kỳ (giây)', 'Trạng thái', ''].map((x) => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>{sensors.map((s) => <TableRow key={s.sensor_id}><TableCell>{s.name}</TableCell><TableCell>{s.sensor_key}</TableCell><TableCell>{s.sensor_type}</TableCell><TableCell>{s.unit || '—'}</TableCell><TableCell>{valueOf(s.latest_reading)}</TableCell><TableCell>{s.min_value == null ? '—' : s.min_value} / {s.max_value == null ? '—' : s.max_value}</TableCell><TableCell>{s.warning_low == null ? '—' : s.warning_low} / {s.warning_high == null ? '—' : s.warning_high}</TableCell><TableCell>{s.update_interval_seconds || '—'}</TableCell><TableCell><Chip size="small" label={s.status} /></TableCell><TableCell><Button size="small" onClick={() => setMonitoredSensor(s)}>Chi tiết / biểu đồ</Button><Button size="small" onClick={() => edit('sensor', s, s.device_id)}>Sửa</Button><Button size="small" onClick={() => run(() => updateSensor(s.sensor_id, { status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }))}>Bật/tắt</Button><Button size="small" color="secondary" onClick={() => run(() => deleteSensor(s.sensor_id))}>Xóa</Button></TableCell></TableRow>)}</TableBody></Table>
    </div>}
    {tab === 3 && <div style={{ paddingTop: 12 }}><Grid container justify="space-between"><Grid item><Typography color="textSecondary">Kênh điều khiển được cấu hình theo thiết bị (GPIO, relay, quạt, đèn hoặc loại khác).</Typography></Grid><Grid item><TextField select size="small" label="Thiết bị" value="" onChange={(e) => edit('actuator', null, Number(e.target.value))} style={{ minWidth: 190 }}><MenuItem value="" disabled>Thêm actuator</MenuItem>{devices.map((d) => <MenuItem key={d.device_id} value={d.device_id}>{d.name || d.content || `Thiết bị ${d.mqtt_microservice_id}`}</MenuItem>)}</TextField></Grid></Grid>
      {devices.map((d) => <div key={d.device_id} style={{ marginTop: 12 }}><Typography variant="subtitle2">{d.name || d.content || `Thiết bị ${d.mqtt_microservice_id}`}</Typography><Table size="small"><TableHead><TableRow>{['Tên', 'Key', 'Loại', 'Kênh', 'Trạng thái', ''].map((x) => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>{(actuatorsByDevice[d.device_id] || []).map((a) => <TableRow key={a.actuator_id}><TableCell>{a.name}</TableCell><TableCell>{a.actuator_key}</TableCell><TableCell>{a.actuator_type}</TableCell><TableCell>{a.channel_number}</TableCell><TableCell>{a.status}</TableCell><TableCell><Button size="small" onClick={() => edit('actuator', a, d.device_id)}>Sửa</Button><Button size="small" disabled={a.status !== 'ACTIVE'} onClick={() => { const value = window.confirm(`Bật actuator ${a.name}? Chọn Cancel để tắt.`); run(() => controlActuator(d.device_id, a.actuator_id, value)); }}>Điều khiển</Button><Button size="small" onClick={() => run(() => updateActuator(a.actuator_id, { status: a.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }))}>Bật/tắt capability</Button><Button size="small" color="secondary" onClick={() => run(() => deleteActuator(a.actuator_id))}>Xóa</Button></TableCell></TableRow>)}</TableBody></Table></div>)}</div>}
    {tab === 4 && <Table size="small"><TableHead><TableRow>{['Thời điểm', 'Mức độ', 'Loại', 'Nội dung', 'Trạng thái', ''].map((x) => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>{alerts.map((a) => <TableRow key={a.alert_id}><TableCell>{a.triggered_at}</TableCell><TableCell>{a.severity}</TableCell><TableCell>{a.alert_type}</TableCell><TableCell>{a.message}</TableCell><TableCell>{a.status}</TableCell><TableCell>{a.status === 'OPEN' && <Button size="small" onClick={() => run(() => acknowledgeAlert(a.alert_id))}>Xác nhận</Button>}</TableCell></TableRow>)}</TableBody></Table>}

    {tab === 5 && <RoomDataWorkbench room={room} sensors={sensors} devices={devices} onError={(e) => onError(errorMessage(e))} />}
    <Dialog open={['device', 'sensor', 'actuator', 'commands', 'history'].includes(dialog)} onClose={() => setDialog('')} fullWidth maxWidth="md">
      <DialogTitle>{dialog === 'device' ? 'Sửa thông tin thiết bị' : dialog === 'sensor' ? (asset && asset.sensor_id ? 'Sửa cấu hình sensor' : 'Thêm sensor') : dialog === 'actuator' ? (asset && asset.actuator_id ? 'Sửa actuator' : 'Thêm actuator') : dialog === 'commands' ? `Lệnh thiết bị ${asset && asset.mqtt_microservice_id}` : 'Lịch sử hoạt động phòng'}</DialogTitle>
      <DialogContent>
        {dialog === 'sensor' && <Grid container spacing={2}>{[['sensor_key','Key'],['name','Tên sensor'],['sensor_type','Loại sensor'],['sensor_index','Vị trí trong gói MQTT (va)'],['unit','Đơn vị'],['min_value','Giá trị min'],['max_value','Giá trị max'],['warning_low','Ngưỡng cảnh báo thấp'],['warning_high','Ngưỡng cảnh báo cao'],['calibration_offset','Calibration offset'],['calibration_scale','Calibration scale'],['update_interval_seconds','Chu kỳ lấy mẫu (giây)'],['display_type','Kiểu hiển thị']].map(([key,title]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth label={title} type={['sensor_index','min_value','max_value','warning_low','warning_high','calibration_offset','calibration_scale','update_interval_seconds'].includes(key) ? 'number' : 'text'} value={form[key] == null ? '' : form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Grid>)}<Grid item xs={12}><TextField fullWidth multiline label="Mô tả" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid></Grid>}
        {dialog === 'device' && <Grid container spacing={2}>{[['device_type','Loại thiết bị'],['firmware_version','Firmware version'],['mac_address','MAC'],['ip_address','IP']].map(([key,title]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth label={title} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Grid>)}</Grid>}
        {dialog === 'actuator' && <Grid container spacing={2}>{[['actuator_key','Key'],['name','Tên'],['actuator_type','Loại actuator'],['channel_number','Số kênh']].map(([key,title]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth label={title} type={key === 'channel_number' ? 'number' : 'text'} value={form[key] == null ? '' : form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></Grid>)}</Grid>}
    {dialog === 'commands' && <Table size="small"><TableHead><TableRow>{['Command ID','Action','Parameters','User ID','Timestamp','Status','Execution result'].map((x) => <TableCell key={x}>{x}</TableCell>)}</TableRow></TableHead><TableBody>{commands.map((r) => <TableRow key={r.command_id}><TableCell>{r.command_id}</TableCell><TableCell>{r.command_type}</TableCell><TableCell>{r.payload}</TableCell><TableCell>{r.requested_by} ({r.requested_by_type})</TableCell><TableCell>{r.issued_at}</TableCell><TableCell>{r.status}</TableCell><TableCell>{r.result}</TableCell></TableRow>)}</TableBody></Table>}
    {dialog === 'history' && <Table size="small"><TableHead><TableRow><TableCell>Thời điểm</TableCell><TableCell>Hành động</TableCell><TableCell>Trạng thái / Chi tiết</TableCell></TableRow></TableHead><TableBody>{history.map((r) => <TableRow key={r.audit_id}><TableCell>{r.created_at}</TableCell><TableCell>{r.action || r.entity_type}</TableCell><TableCell>{r.action_type || r.entity_id}</TableCell></TableRow>)}</TableBody></Table>}
      </DialogContent>
      <DialogActions><Button onClick={() => setDialog('')}>Đóng</Button>{['device','sensor','actuator'].includes(dialog) && <Button color="primary" variant="contained" onClick={saveAsset}>Lưu</Button>}</DialogActions>
    </Dialog>
    <SensorMonitorDialog open={!!monitoredSensor} sensor={monitoredSensor} room={room} onClose={() => setMonitoredSensor(null)} onError={onError} />
  </Paper>;
}
