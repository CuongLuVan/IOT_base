import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, MenuItem, Paper, TextField, Typography
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import RefreshIcon from '@material-ui/icons/Refresh';
import {
  assignDevice, assignRoomMember, createBuilding, createFloor, createRoom,
  deactivateRoom, getRoomSummary, listBuildings, listFloors, listRooms,
  removeRoomMember, unassignDevice, updateRoom
} from '../../api/roomManagementApi';
import RoomIoTPanel from './RoomIoTPanel';

const emptyRoom = { room_code: '', name: '', building_id: '', floor_id: '', description: '', area: '', capacity: '', status: 'ACTIVE' };
const errorText = (e) => e && e.response && e.response.data && (e.response.data.error || e.response.data.message) || e.message || 'Có lỗi xảy ra.';
const label = (x) => x && (x.name || x.fullname || x.email) || '—';

export default function RoomManagement() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState('');
  const [form, setForm] = useState(emptyRoom);
  const [extra, setExtra] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (roomId) => {
    setBusy(true); setError('');
    try {
      const [b, f, r] = await Promise.all([listBuildings(), listFloors(), listRooms()]);
      setBuildings(b); setFloors(f); setRooms(r);
      const next = r.find((x) => String(x.id) === String(roomId || (selected && selected.id))) || r[0] || null;
      setSelected(next);
      setSummary(next ? await getRoomSummary(next.id) : null);
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }, [selected]);

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const shownRooms = useMemo(() => rooms.filter((r) => {
    const text = [r.name, r.description, r.building_name, r.floor_name].join(' ').toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!statusFilter || r.status === statusFilter);
  }), [rooms, query, statusFilter]);
  const roomFloors = floors.filter((f) => !form.building_id || String(f.building_id) === String(form.building_id));
  const act = async (fn) => { setError(''); try { await fn(); await refresh(selected && selected.id); } catch (e) { setError(errorText(e)); } };
  const openRoom = (r) => { setSelected(r); setSummary(null); getRoomSummary(r.id).then(setSummary).catch((e) => setError(errorText(e))); };
  const editRoom = (r) => { setForm({ ...emptyRoom, ...r, area: r.area || '' }); setDialog('room'); };
  const saveRoom = async () => {
    const payload = { ...form, area: form.area === '' ? null : Number(form.area), capacity: form.capacity === '' ? null : Number(form.capacity), building_id: Number(form.building_id), floor_id: Number(form.floor_id) };
    await act(async () => { if (form.id) await updateRoom(form.id, payload); else await createRoom(payload); });
    setDialog('');
  };
  const saveLocation = async () => {
    await act(async () => { if (dialog === 'building') await createBuilding({ building_code: extra.building_code, name: extra.name, description: extra.description || '' }); else await createFloor({ building_id: Number(extra.building_id), floor_code: extra.floor_code, name: extra.name, description: extra.description || '' }); });
    setDialog(''); setExtra({});
  };

  const stat = summary && summary.device_summary || {};
  const devices = summary && summary.devices || [];
  const members = summary && summary.members || [];
  return <div style={{ padding: 24 }}>
    <Grid container justify="space-between" alignItems="center" spacing={2}>
      <Grid item><Typography variant="h5">Quản lý phòng</Typography><Typography color="textSecondary">Theo dõi phòng, thiết bị MQTT và người phụ trách</Typography></Grid>
      <Grid item><Button startIcon={<RefreshIcon />} onClick={() => refresh()}>Làm mới</Button> <Button color="primary" variant="contained" startIcon={<AddIcon />} onClick={() => editRoom(null)}>Thêm phòng</Button></Grid>
    </Grid>
    {error && <Paper style={{ marginTop: 16, padding: 12, color: '#b00020' }}>{error}</Paper>}
    <Grid container spacing={2} style={{ marginTop: 8 }}>
      <Grid item xs={12} md={4}>
        <Paper style={{ padding: 16 }}>
          <Grid container spacing={1} alignItems="center"><Grid item xs={8}><TextField fullWidth label="Tìm phòng" value={query} onChange={(e) => setQuery(e.target.value)} /></Grid><Grid item xs={4}><TextField select fullWidth label="Trạng thái" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><MenuItem value="">Tất cả</MenuItem><MenuItem value="ACTIVE">Hoạt động</MenuItem><MenuItem value="INACTIVE">Vô hiệu</MenuItem></TextField></Grid></Grid>
          <div style={{ maxHeight: '62vh', overflow: 'auto', marginTop: 12 }}>
            {busy && <CircularProgress size={22} />}
            {shownRooms.map((r) => <Paper key={r.id} onClick={() => openRoom(r)} elevation={selected && selected.id === r.id ? 3 : 0} style={{ padding: 12, marginBottom: 8, cursor: 'pointer', border: selected && selected.id === r.id ? '1px solid #3f51b5' : '1px solid #eee' }}>
              <Grid container justify="space-between"><Grid item><b>{r.name}</b><Typography variant="body2" color="textSecondary">{(buildings.find((b) => String(b.id) === String(r.building_id)) || {}).name || '—'} · {(floors.find((f) => String(f.id) === String(r.floor_id)) || {}).name || '—'}</Typography></Grid><Grid item><Chip size="small" label={r.status === 'ACTIVE' ? 'Hoạt động' : 'Vô hiệu'} color={r.status === 'ACTIVE' ? 'primary' : 'default'} /></Grid></Grid>
            </Paper>)}
            {!busy && !shownRooms.length && <Typography color="textSecondary">Chưa có phòng phù hợp.</Typography>}
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <Button size="small" onClick={() => { setExtra({}); setDialog('building'); }}>Thêm tòa nhà</Button>
          <Button size="small" onClick={() => { setExtra({ building_id: buildings[0] && buildings[0].id || '' }); setDialog('floor'); }}>Thêm tầng</Button>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8}>
        {!selected ? <Paper style={{ padding: 24 }}>Chọn phòng để xem chi tiết.</Paper> : <Paper style={{ padding: 20 }}>
          <Grid container justify="space-between" alignItems="center"><Grid item><Typography variant="h6">{selected.name}</Typography><Typography color="textSecondary">{(summary && summary.building && summary.building.name) || (buildings.find((b) => String(b.id) === String(selected.building_id)) || {}).name || '—'} · {(summary && summary.floor && summary.floor.name) || (floors.find((f) => String(f.id) === String(selected.floor_id)) || {}).name || '—'}{selected.area ? ` · ${selected.area} m²` : ''}</Typography></Grid><Grid item><Button onClick={() => editRoom(selected)}>Sửa</Button><Button color="secondary" onClick={() => { if (window.confirm('Vô hiệu hóa phòng này? Phòng còn thiết bị hoặc dữ liệu đang xử lý sẽ bị từ chối.')) act(() => deactivateRoom(selected.id)); }}>Vô hiệu hóa</Button></Grid></Grid>
          <Typography style={{ margin: '12px 0' }}>{selected.description || 'Chưa có mô tả.'}</Typography>
          <Grid container spacing={1}>{[['Thiết bị online', stat.online], ['Offline', stat.offline], ['Chưa rõ trạng thái', stat.unknown], ['Sensor', summary.sensor_summary && summary.sensor_summary.total], ['Cảnh báo đang mở', summary.open_alerts]].map(([k, v]) => <Grid item xs={6} sm key={k}><Paper style={{ padding: 12 }}><Typography variant="caption" color="textSecondary">{k}</Typography><Typography variant="h6">{v == null ? '—' : v}</Typography></Paper></Grid>)}</Grid>
          <Divider style={{ margin: '18px 0' }} />
          <Grid container justify="space-between" alignItems="center"><Grid item><Typography variant="subtitle1">Thiết bị MQTT</Typography></Grid><Grid item><Button size="small" onClick={() => { setExtra({ mqtt_microservice_id: '' }); setDialog('device'); }}>Gán thiết bị</Button></Grid></Grid>
          {devices.map((d) => <Grid key={d.device_id} container justify="space-between" alignItems="center" style={{ padding: '8px 0' }}><Grid item>{d.name || d.content || d.device_name || `Thiết bị #${d.mqtt_microservice_id || d.device_id}`} <Chip size="small" label={d.connection_status || 'UNKNOWN'} /></Grid><Grid item><Button size="small" onClick={() => act(() => unassignDevice(selected.id, d.mqtt_microservice_id))}>Gỡ</Button></Grid></Grid>)}
          {!devices.length && <Typography color="textSecondary">Chưa gán thiết bị.</Typography>}
          <Divider style={{ margin: '12px 0' }} />
          <Grid container justify="space-between" alignItems="center"><Grid item><Typography variant="subtitle1">Người phụ trách</Typography></Grid><Grid item><Button size="small" onClick={() => { setExtra({ user_id: '', user_type: 'customer', role: 'MANAGER' }); setDialog('member'); }}>Thêm người</Button></Grid></Grid>
          {members.map((m) => <Grid key={m.permission_id} container justify="space-between" alignItems="center" style={{ padding: '6px 0' }}><Grid item>User #{m.user_id} ({m.user_type})</Grid><Grid item><TextField select size="small" label="Vai trò" value={m.role_code || 'VIEWER'} onChange={(e) => act(() => assignRoomMember(selected.id, { user_id: m.user_id, user_type: m.user_type, role: e.target.value }))}>{['SYSTEM_ADMIN','BUILDING_MANAGER','FLOOR_MANAGER','ROOM_MANAGER','MANAGER','OPERATOR','VIEWER'].map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}</TextField><Button size="small" onClick={() => act(() => removeRoomMember(selected.id, m.permission_id))}>Gỡ</Button></Grid></Grid>)}
          {!members.length && <Typography color="textSecondary">Chưa có người phụ trách.</Typography>}
        </Paper>}
      </Grid>
    </Grid>
    {selected && summary && <RoomIoTPanel room={selected} summary={summary} devices={devices} rooms={rooms} onRefresh={() => refresh(selected.id)} onError={setError} />}
    <Dialog open={!!dialog} onClose={() => setDialog('')} fullWidth maxWidth="sm">
      <DialogTitle>{dialog === 'room' ? (form.id ? 'Sửa phòng' : 'Thêm phòng') : dialog === 'building' ? 'Thêm tòa nhà' : dialog === 'floor' ? 'Thêm tầng' : dialog === 'device' ? 'Gán thiết bị MQTT' : 'Thêm người vào phòng'}</DialogTitle>
      <DialogContent>
        {dialog === 'room' && <Grid container spacing={2}>
          <Grid item xs={12} sm={4}><TextField fullWidth required label="Mã phòng" value={form.room_code || ''} onChange={(e) => setForm({ ...form, room_code: e.target.value })} /></Grid><Grid item xs={12} sm={8}><TextField fullWidth required label="Tên phòng" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth required label="Tòa nhà" value={form.building_id || ''} onChange={(e) => setForm({ ...form, building_id: e.target.value, floor_id: '' })}>{buildings.map((b) => <MenuItem key={b.id} value={b.id}>{label(b)}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth required label="Tầng" value={form.floor_id || ''} onChange={(e) => setForm({ ...form, floor_id: e.target.value })}>{roomFloors.map((f) => <MenuItem key={f.id} value={f.id}>{label(f)}</MenuItem>)}</TextField></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Diện tích (m²)" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth type="number" label="Sức chứa phòng họp" value={form.capacity == null ? '' : form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Grid>
          <Grid item xs={12} sm={6}><TextField select fullWidth label="Trạng thái" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><MenuItem value="ACTIVE">Hoạt động</MenuItem><MenuItem value="INACTIVE">Vô hiệu</MenuItem></TextField></Grid>
          <Grid item xs={12}><TextField fullWidth multiline label="Mô tả" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Grid>
        </Grid>}
        {(dialog === 'building' || dialog === 'floor') && <Grid container spacing={2}>{dialog === 'floor' && <Grid item xs={12}><TextField select fullWidth label="Tòa nhà" value={extra.building_id || ''} onChange={(e) => setExtra({ ...extra, building_id: e.target.value })}>{buildings.map((b) => <MenuItem key={b.id} value={b.id}>{label(b)}</MenuItem>)}</TextField></Grid>}<Grid item xs={12} sm={4}><TextField fullWidth required label="Mã" value={dialog === 'floor' ? extra.floor_code || '' : extra.building_code || ''} onChange={(e) => setExtra({ ...extra, [dialog === 'floor' ? 'floor_code' : 'building_code']: e.target.value })} /></Grid><Grid item xs={12} sm={8}><TextField fullWidth required label="Tên" value={extra.name || ''} onChange={(e) => setExtra({ ...extra, name: e.target.value })} /></Grid><Grid item xs={12}><TextField fullWidth label="Mô tả" value={extra.description || ''} onChange={(e) => setExtra({ ...extra, description: e.target.value })} /></Grid></Grid>}
        {dialog === 'device' && <TextField fullWidth label="mqtt_microservice_id" value={extra.mqtt_microservice_id || ''} onChange={(e) => setExtra({ ...extra, mqtt_microservice_id: e.target.value })} />}
        {dialog === 'member' && <Grid container spacing={2}><Grid item xs={12}><TextField fullWidth type="number" label="User ID" value={extra.user_id || ''} onChange={(e) => setExtra({ ...extra, user_id: e.target.value })} /></Grid><Grid item xs={6}><TextField select fullWidth label="Loại user" value={extra.user_type} onChange={(e) => setExtra({ ...extra, user_type: e.target.value })}><MenuItem value="customer">Khách hàng</MenuItem><MenuItem value="admin">Admin</MenuItem></TextField></Grid><Grid item xs={6}><TextField select fullWidth label="Vai trò trong phòng" value={extra.role} onChange={(e) => setExtra({ ...extra, role: e.target.value })}>{['SYSTEM_ADMIN','BUILDING_MANAGER','FLOOR_MANAGER','ROOM_MANAGER','MANAGER','OPERATOR','VIEWER'].map((role) => <MenuItem key={role} value={role}>{role}</MenuItem>)}</TextField></Grid></Grid>}
      </DialogContent>
      <DialogActions><Button onClick={() => setDialog('')}>Hủy</Button><Button color="primary" variant="contained" onClick={() => {
        if (dialog === 'room') saveRoom();
        else if (dialog === 'building' || dialog === 'floor') saveLocation();
        else if (dialog === 'device') { act(() => assignDevice(selected.id, Number(extra.mqtt_microservice_id))); setDialog(''); }
        else if (dialog === 'member') { act(() => assignRoomMember(selected.id, { ...extra, user_id: Number(extra.user_id) })); setDialog(''); }
      }}>Lưu</Button></DialogActions>
    </Dialog>
  </div>;
}
