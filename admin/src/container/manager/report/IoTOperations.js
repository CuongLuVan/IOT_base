import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@material-ui/core';
import { acknowledgeAlert, getIoTOverview, getRoomSummary, updateRoomDevice, unassignDevice } from '../../../api/roomManagementApi';

const dateInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const initialRange = () => ({ from: dateInput(new Date(Date.now() - 7 * 86400000)), to: dateInput(new Date()) });
const apiError = (error) => error && error.response && error.response.data && error.response.data.error || error.message || 'Không tải được dữ liệu IoT.';

export default function IoTOperations() {
  const [filters, setFilters] = useState({ ...initialRange(), building_id: '', floor_id: '', room_id: '', device_group: '' });
  const [data, setData] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [compare, setCompare] = useState(false);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState('');
  const [selected, setSelected] = useState(null);
  const [roomDetail, setRoomDetail] = useState(null);
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setError('');
    try {
      const query = { ...filters, from: new Date(filters.from).toISOString(), to: new Date(filters.to).toISOString() };
      const result = await getIoTOverview(query);
      setData(result);
      if (compare) {
        const span = new Date(query.to).getTime() - new Date(query.from).getTime();
        const previousQuery = { ...query, from: new Date(new Date(query.from).getTime() - span).toISOString(), to: query.from };
        const old = await getIoTOverview(previousQuery);
        setPrevious(old.totals);
      } else setPrevious(null);
    } catch (failure) { setError(apiError(failure)); }
    finally { setBusy(false); }
  }, [filters, compare]);
  useEffect(() => { load(); }, [load]);

  const floors = useMemo(() => (data && data.locations && data.locations.floors || []).filter((floor) => !filters.building_id || String(floor.building_id) === String(filters.building_id)), [data, filters.building_id]);
  const rooms = data && data.rooms || [];
  const devices = data && data.devices || [];
  const shownDevices = useMemo(() => devices.filter((device) => (!status || device.operational_status === status) && (!search || [device.content, device.device_type, device.room_name, device.building_name, device.floor_name, device.mqtt_microservice_id].join(' ').toLowerCase().includes(search.toLowerCase()))), [devices, status, search]);
  const openRoom = async (room) => {
    setSelected(room); setDialog('room'); setRoomDetail(null);
    try { setRoomDetail(await getRoomSummary(room.room_id)); } catch (failure) { setError(apiError(failure)); }
  };
  const openDevice = (device) => { setSelected(device); setEdit({ display_name: device.display_name || '', device_type: device.device_type || '', firmware_version: device.firmware_version || '' }); setDialog('device'); };
  const saveDevice = async () => {
    try { await updateRoomDevice(selected.device_id, edit); setDialog(''); await load(); }
    catch (failure) { setError(apiError(failure)); }
  };
  const changeAlertStatus = async (alertId, nextStatus, resolution) => {
    try { await acknowledgeAlert(alertId, nextStatus, resolution); await load(); }
    catch (failure) { setError(apiError(failure)); }
  };
  const exportCsv = () => {
    const fields = ['mqtt_microservice_id', 'content', 'device_type', 'building_name', 'floor_name', 'room_name', 'operational_status', 'last_online', 'firmware_version'];
    const csv = '\uFEFF' + [fields.join(','), ...shownDevices.map((device) => fields.map((key) => `"${String(device[key] == null ? '' : device[key]).replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'iot-operations.csv'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const totals = data && data.totals || {};
  const tiles = [
    ['Tổng thiết bị', totals.devices, '', null], ['Online', totals.online, 'ONLINE', null], ['Offline', totals.offline, 'OFFLINE', null],
    ['Lỗi', totals.errors, 'ERROR', null], ['Không có dữ liệu gần đây', totals.no_recent_data, 'NO_RECENT_DATA', null],
    ['Cảnh báo đang mở', totals.open_alerts, 'ALERT', null], ['Nghiêm trọng', totals.critical_alerts, 'CRITICAL', null],
    ['Phòng / thiết bị ảnh hưởng', `${totals.affected_rooms || 0} / ${totals.affected_devices || 0}`, 'ALERT', null],
    ['Gián đoạn trong kỳ (phút)', totals.downtime_minutes, 'ALERT', 'downtime_minutes'], ['Thiết bị mất kết nối lặp lại', totals.frequent_disconnect_devices, 'ALERT', null]
  ];
  return <div style={{ padding: 24 }}>
    <Grid container justify="space-between" alignItems="center"><Grid item><Typography variant="h5">Báo cáo vận hành IoT</Typography><Typography color="textSecondary">Tổng quan thiết bị, phòng và cảnh báo MQTT từ dữ liệu hệ thống.</Typography></Grid><Grid item><Button onClick={load} disabled={busy}>Làm mới</Button><Button onClick={exportCsv} disabled={!data}>Xuất CSV / Excel</Button><Button onClick={() => window.print()} disabled={!data}>Xuất PDF</Button></Grid></Grid>
    {error && <Paper style={{ marginTop: 12, padding: 12, color: '#b00020' }}>{error}</Paper>}
    <Paper style={{ padding: 12, marginTop: 16 }}><Typography variant="caption" color="textSecondary">Khoảng thời gian áp dụng cho cảnh báo và gián đoạn; trạng thái kết nối là ảnh chụp MQTT hiện tại. Mốc 15 phút dùng để đánh dấu thiết bị chưa có dữ liệu gần đây.</Typography><Grid container spacing={1} alignItems="center">
      <Grid item xs={6} md={2}><TextField select fullWidth label="Cơ sở" value={filters.building_id} onChange={(e) => setFilters({ ...filters, building_id: e.target.value, floor_id: '', room_id: '' })}><MenuItem value="">Tất cả</MenuItem>{(data && data.locations && data.locations.buildings || []).map((item) => <MenuItem key={item.building_id} value={item.building_id}>{item.name}</MenuItem>)}</TextField></Grid>
      <Grid item xs={6} md={2}><TextField select fullWidth label="Tầng" value={filters.floor_id} onChange={(e) => setFilters({ ...filters, floor_id: e.target.value, room_id: '' })}><MenuItem value="">Tất cả</MenuItem>{floors.map((item) => <MenuItem key={item.floor_id} value={item.floor_id}>{item.name}</MenuItem>)}</TextField></Grid>
      <Grid item xs={6} md={2}><TextField select fullWidth label="Phòng" value={filters.room_id} onChange={(e) => setFilters({ ...filters, room_id: e.target.value })}><MenuItem value="">Tất cả</MenuItem>{rooms.filter((room) => (!filters.building_id || String(room.building_id) === String(filters.building_id)) && (!filters.floor_id || String(room.floor_id) === String(filters.floor_id))).map((item) => <MenuItem key={item.room_id} value={item.room_id}>{item.name}</MenuItem>)}</TextField></Grid>
      <Grid item xs={6} md={2}><TextField select fullWidth label="Nhóm thiết bị" value={filters.device_group} onChange={(e) => setFilters({ ...filters, device_group: e.target.value })}><MenuItem value="">Tất cả</MenuItem>{(data && data.device_groups || []).map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid>
      <Grid item xs={6} md={2}><TextField fullWidth label="Từ" type="datetime-local" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid item xs={6} md={2}><TextField fullWidth label="Đến" type="datetime-local" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid item><Button onClick={() => setCompare(!compare)} color={compare ? 'primary' : 'default'}>So sánh kỳ trước {compare ? '✓' : ''}</Button></Grid>
    </Grid></Paper>
    <Grid container spacing={1} style={{ marginTop: 8 }}>{tiles.map(([title, value, filter, metric]) => <Grid item xs={6} sm={4} md key={title}><Paper onClick={() => ['ALERT', 'CRITICAL'].includes(filter) ? setStatus('') : setStatus(filter)} style={{ cursor: 'pointer', padding: 14, minHeight: 82 }}><Typography variant="caption" color="textSecondary">{title}</Typography><Typography variant="h5">{value == null ? '—' : value}</Typography>{previous && metric && <Typography variant="caption">Kỳ trước: {previous[metric]}</Typography>}</Paper></Grid>)}</Grid>
    <Grid container spacing={2} style={{ marginTop: 12 }}>
      <Grid item xs={12} md={7}><Paper style={{ padding: 14 }}><Grid container justify="space-between" alignItems="center"><Typography variant="h6">Thiết bị tập trung</Typography><Grid item><TextField size="small" label="Tìm kiếm" value={search} onChange={(e) => setSearch(e.target.value)} /><TextField select size="small" label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value)} style={{ marginLeft: 8, minWidth: 150 }}><MenuItem value="">Tất cả</MenuItem>{['ONLINE','OFFLINE','ERROR','NO_RECENT_DATA'].map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField></Grid></Grid>
        <Table size="small"><TableHead><TableRow>{['Thiết bị', 'Vị trí', 'Trạng thái', 'Gửi gần nhất', 'Firmware', ''].map((item) => <TableCell key={item}>{item}</TableCell>)}</TableRow></TableHead><TableBody>{shownDevices.map((device) => <TableRow key={device.device_id}><TableCell>{device.display_name || device.content || `Device ${device.mqtt_microservice_id}`}<br /><Typography variant="caption">{device.device_type || 'MQTT'} · ID {device.mqtt_microservice_id}</Typography></TableCell><TableCell><Button size="small" onClick={() => openRoom(rooms.find((room) => room.room_id === device.room_id) || { room_id: device.room_id, name: device.room_name })}>{device.building_name} / {device.floor_name} / {device.room_name}</Button></TableCell><TableCell><Chip size="small" label={device.operational_status} color={device.operational_status === 'ONLINE' ? 'primary' : 'secondary'} /></TableCell><TableCell>{device.last_online ? new Date(device.last_online).toLocaleString() : 'Chưa có'}</TableCell><TableCell>{device.firmware_version || '—'}</TableCell><TableCell><Button size="small" onClick={() => openDevice(device)}>Sửa</Button><Button size="small" onClick={() => openRoom(rooms.find((room) => room.room_id === device.room_id) || { room_id: device.room_id })}>Chi tiết</Button><Button size="small" color="secondary" onClick={async () => { if (window.confirm('Thu hồi gán thiết bị khỏi phòng?')) { try { await unassignDevice(device.room_id, device.mqtt_microservice_id); await load(); } catch (failure) { setError(apiError(failure)); } } }}>Thu hồi</Button></TableCell></TableRow>)}</TableBody></Table>
      </Paper></Grid>
      <Grid item xs={12} md={5}><Paper style={{ padding: 14 }}><Typography variant="h6">Phòng cần chú ý</Typography>{rooms.filter((room) => room.device_summary && room.device_summary.offline || room.open_alerts).map((room) => <Paper key={room.room_id} variant="outlined" style={{ padding: 10, marginTop: 8 }}><Button onClick={() => openRoom(room)}>{room.name} · {room.building_name} / {room.floor_name}</Button><Typography variant="body2">Offline: {room.device_summary && room.device_summary.offline || 0} · Cảnh báo mở: {room.open_alerts || 0} · Sức chứa: {room.capacity == null ? 'chưa cấu hình' : room.capacity}</Typography></Paper>)}{!rooms.some((room) => room.device_summary && room.device_summary.offline || room.open_alerts) && <Typography color="textSecondary">Không có phòng đang bị ảnh hưởng.</Typography>}<Typography variant="caption" color="textSecondary">Chưa có nguồn dữ liệu đặt phòng/cảm biến hiện diện; chưa thể tính mức sử dụng hoặc suy ra có người từ sensor môi trường.</Typography></Paper>
        <Paper style={{ padding: 14, marginTop: 12 }}><Typography variant="h6">Cảnh báo và lịch sử sự cố trong kỳ</Typography><Table size="small"><TableHead><TableRow><TableCell>Thời điểm</TableCell><TableCell>Loại</TableCell><TableCell>Phòng / nội dung</TableCell><TableCell>Trạng thái</TableCell><TableCell>Thao tác</TableCell></TableRow></TableHead><TableBody>{(data && data.alerts || []).slice(0, 50).map((alert) => <TableRow key={alert.alert_id}><TableCell>{new Date(alert.triggered_at).toLocaleString()}</TableCell><TableCell><Chip size="small" label={`${alert.severity} · ${alert.alert_type}`} /></TableCell><TableCell><Button size="small" onClick={() => openRoom(rooms.find((room) => room.room_id === alert.room_id) || { room_id: alert.room_id })}>{rooms.find((room) => room.room_id === alert.room_id)?.name || `Room ${alert.room_id}`}: {alert.message}</Button></TableCell><TableCell>{alert.status}{alert.acknowledged_at && <Typography variant="caption" display="block">Xác nhận/xử lý: {new Date(alert.acknowledged_at).toLocaleString()}</Typography>}</TableCell><TableCell>{alert.status === 'OPEN' && <Button size="small" onClick={() => changeAlertStatus(alert.alert_id, 'ACKNOWLEDGED')}>Xác nhận</Button>}{alert.status !== 'RESOLVED' && <Button size="small" onClick={() => changeAlertStatus(alert.alert_id, 'RESOLVED', window.prompt('Ghi chú xử lý:', '') || 'Đã xử lý')}>Đã xử lý</Button>}</TableCell></TableRow>)}</TableBody></Table></Paper>
      </Grid>
    </Grid>
    <Dialog open={!!dialog} onClose={() => setDialog('')} fullWidth maxWidth="md"><DialogTitle>{dialog === 'room' ? `Phòng: ${selected && selected.name || 'Chi tiết'}` : 'Cập nhật thiết bị'}</DialogTitle><DialogContent>
      {dialog === 'room' && <><Typography>{selected && selected.building_name} / {selected && selected.floor_name} · Sức chứa: {selected && selected.capacity == null ? 'chưa cấu hình' : selected && selected.capacity}</Typography><Typography>Trạng thái phòng: {roomDetail && roomDetail.activity_status || selected && selected.activity_status || 'Đang tải'}</Typography><Typography>Thiết bị online/offline: {roomDetail && roomDetail.device_summary ? `${roomDetail.device_summary.online}/${roomDetail.device_summary.offline}` : '—'} · Cảnh báo mở: {roomDetail && roomDetail.open_alerts}</Typography><Typography variant="subtitle1" style={{ marginTop: 12 }}>Sensor và số liệu mới nhất</Typography>{(roomDetail && roomDetail.sensors || []).map((sensor) => <Chip key={sensor.sensor_id} style={{ margin: 4 }} label={`${sensor.name}: ${sensor.latest_reading && (sensor.latest_reading.value_number ?? sensor.latest_reading.value_text) || '—'} ${sensor.unit || ''}`} />)}</>}
      {dialog === 'device' && <Grid container spacing={2}>{[['display_name','Tên hiển thị'],['device_type','Nhóm / loại thiết bị'],['firmware_version','Firmware version']].map(([key,label]) => <Grid item xs={12} sm={6} key={key}><TextField fullWidth label={label} value={edit[key] || ''} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} /></Grid>)}<Grid item xs={12}><Typography color="textSecondary">Tình trạng chứng chỉ được quản lý tại mục MQTT → Chứng chỉ device.</Typography></Grid></Grid>}
    </DialogContent><DialogActions><Button onClick={() => setDialog('')}>Đóng</Button>{dialog === 'device' && <Button color="primary" variant="contained" onClick={saveDevice}>Lưu</Button>}</DialogActions></Dialog>
  </div>;
}
