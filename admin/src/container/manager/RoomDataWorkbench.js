import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Chip, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@material-ui/core';
import { createRoomWidget, deleteRoomWidget, getRoomAnalytics, listRoomWidgets, updateRoomWidget } from '../../api/roomManagementApi';

const TYPES = ['VALUE_CARD', 'LINE_CHART', 'BAR_CHART', 'GAUGE', 'DATA_TABLE', 'ROOM_VISUALIZATION'];
const dates = () => ({ from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), to: new Date().toISOString() });

function pointsFor(rows, sensorId) {
  return (rows || []).filter((row) => Number(row.sensor_id) === Number(sensorId) && row.value_number != null).slice().reverse();
}

export default function RoomDataWorkbench({ room, sensors = [], devices = [], onError }) {
  const roomId = room && (room.room_id || room.id);
  const [widgets, setWidgets] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('LINE_CHART');
  const [color, setColor] = useState('#1976d2');
  const [unit, setUnit] = useState('');
  const [range, setRange] = useState(dates);
  const [analytics, setAnalytics] = useState(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const loadWidgets = useCallback(() => listRoomWidgets(roomId).then((rows) => {
    setWidgets(rows);
    if (!selected.length) {
      const ids = rows.reduce((all, row) => {
        try { return all.concat(Array.isArray(row.sensor_ids) ? row.sensor_ids : JSON.parse(row.sensor_ids || '[]')); } catch (error) { return all; }
      }, []).map(Number);
      if (ids.length) setSelected([...new Set(ids)]);
    }
  }).catch(onError), [roomId, onError, selected.length]);
  const loadData = useCallback(async (ids = selected, currentPage = page) => {
    if (!roomId || !ids.length) { setAnalytics(null); return; }
    try {
      const result = await getRoomAnalytics(roomId, { sensor_ids: ids.join(','), from: range.from, to: range.to, page: currentPage, page_size: 100, bucket: 'hour' });
      setAnalytics(result);
    } catch (error) { onError(error); }
  }, [roomId, selected, range.from, range.to, page, onError]);
  useEffect(() => { loadWidgets(); }, [loadWidgets]);
  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const timer = setInterval(() => loadData(), 15000);
    return () => clearInterval(timer);
  }, [loadData]);
  const stats = useMemo(() => Object.fromEntries((analytics && analytics.statistics || []).map((row) => [row.sensor_id, row])), [analytics]);
  const saveWidget = async () => {
    if (!name.trim() || !selected.length) { onError(new Error('Nhập tên và chọn ít nhất một sensor.')); return; }
    setBusy(true);
    const payload = { name: name.trim(), widget_type: type, sensor_ids: selected, configuration: { color, unit, update_interval_seconds: 15, range: 'custom' } };
    try { await createRoomWidget(roomId, payload); setName(''); await loadWidgets(); }
    catch (error) { onError(error); }
    finally { setBusy(false); }
  };
  const downloadCsv = () => {
    if (!analytics) return;
    const rows = [['sensor_id', 'measured_at', 'value_number', 'value_text', 'quality'], ...(analytics.raw || []).map((row) => [row.sensor_id, row.measured_at, row.value_number, row.value_text, row.quality])];
    const csv = '\uFEFF' + rows.map((row) => row.map((cell) => `"${String(cell == null ? '' : cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `room-${roomId}-sensor-data.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const renderWidget = (widget) => {
    let ids = [];
    let config = {};
    try { ids = Array.isArray(widget.sensor_ids) ? widget.sensor_ids : JSON.parse(widget.sensor_ids || '[]'); config = typeof widget.configuration === 'object' ? widget.configuration : JSON.parse(widget.configuration || '{}'); } catch (error) { /* tolerate legacy malformed saved settings */ }
    const chosen = sensors.filter((sensor) => ids.includes(Number(sensor.sensor_id)));
    const rows = analytics && analytics.raw || [];
    const first = chosen[0];
    const latest = first && pointsFor(rows, first.sensor_id).slice(-1)[0];
    const values = first ? pointsFor(rows, first.sensor_id).map((row) => Number(row.value_number)) : [];
    const min = first && (first.min_value == null ? Math.min(...values, 0) : Number(first.min_value));
    const max = first && (first.max_value == null ? Math.max(...values, 100) : Number(first.max_value));
    return <Paper key={widget.widget_id} variant="outlined" style={{ padding: 14, minHeight: 170 }}>
      <Grid container justify="space-between"><Typography variant="subtitle1">{widget.name}</Typography><Chip size="small" label={widget.widget_type} /><Button size="small" color="secondary" onClick={() => deleteRoomWidget(roomId, widget.widget_id).then(loadWidgets).catch(onError)}>Xóa</Button></Grid>
      {widget.widget_type === 'ROOM_VISUALIZATION' ? <Typography>{devices.length} thiết bị · {sensors.length} sensor · {sensors.filter((sensor) => sensor.status === 'ACTIVE').length} sensor hoạt động</Typography> : null}
      {widget.widget_type === 'VALUE_CARD' && chosen.map((sensor) => <div key={sensor.sensor_id}><Typography variant="caption">{sensor.name}</Typography><Typography variant="h5">{latest && Number(latest.value_number).toLocaleString() || '—'} {config.unit || sensor.unit || ''}</Typography></div>)}
      {widget.widget_type === 'GAUGE' && first && <div><Typography variant="h4" style={{ color: config.color }}>{latest ? Number(latest.value_number).toLocaleString() : '—'} {config.unit || first.unit || ''}</Typography><progress max={Math.max(1, max - min)} value={Math.min(Math.max((latest ? Number(latest.value_number) : min) - min, 0), max - min)} style={{ width: '100%', accentColor: config.color }} /><Typography variant="caption">{min} – {max}</Typography></div>}
      {widget.widget_type === 'LINE_CHART' && first && <svg viewBox="0 0 360 100" preserveAspectRatio="none" style={{ width: '100%', height: 100 }}><polyline fill="none" stroke={config.color || '#1976d2'} strokeWidth="3" points={pointsFor(rows, first.sensor_id).slice(-36).map((point, index, points) => `${index * 360 / Math.max(1, points.length - 1)},${95 - Math.max(0, Math.min(1, (Number(point.value_number) - min) / Math.max(1, max - min))) * 85}`).join(' ')} /></svg>}
      {widget.widget_type === 'BAR_CHART' && first && <div style={{ display: 'flex', alignItems: 'end', height: 90, gap: 2 }}>{pointsFor(rows, first.sensor_id).slice(-36).map((point, index) => { const value = Number(point.value_number); const height = Math.max(3, Math.min(86, (value - min) / Math.max(1, max - min) * 86)); return <div key={index} title={`${point.measured_at}: ${value}`} style={{ flex: 1, height, background: config.color || '#1976d2' }} />; })}</div>}
      {widget.widget_type === 'DATA_TABLE' && <Table size="small"><TableHead><TableRow><TableCell>Sensor</TableCell><TableCell>Giá trị mới nhất</TableCell><TableCell>Min / Max / Avg</TableCell></TableRow></TableHead><TableBody>{chosen.map((sensor) => { const row = pointsFor(rows, sensor.sensor_id).slice(-1)[0]; const summary = stats[sensor.sensor_id] || {}; return <TableRow key={sensor.sensor_id}><TableCell>{sensor.name}</TableCell><TableCell>{row && row.value_number} {config.unit || sensor.unit}</TableCell><TableCell>{[summary.min, summary.max, summary.average == null ? null : Number(summary.average).toFixed(2)].join(' / ')}</TableCell></TableRow>; })}</TableBody></Table>}
      <Typography variant="caption" color="textSecondary">{chosen.map((sensor) => sensor.name).join(', ') || 'No sensor selected'} · {analytics && analytics.range.from && new Date(analytics.range.from).toLocaleString()}</Typography>
    </Paper>;
  };
  return <div style={{ paddingTop: 16 }}>
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={12} md={3}><TextField fullWidth label="Tên widget" value={name} onChange={(event) => setName(event.target.value)} /></Grid>
      <Grid item xs={12} md={2}><TextField select fullWidth label="Kiểu hiển thị" value={type} onChange={(event) => setType(event.target.value)}>{TYPES.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField></Grid>
      <Grid item xs={12} md={3}><TextField select fullWidth SelectProps={{ multiple: true }} label="Sensors (có thể chọn nhiều)" value={selected} onChange={(event) => { const ids = event.target.value.map(Number); setSelected(ids); setPage(1); loadData(ids, 1); }}>{sensors.map((sensor) => <MenuItem key={sensor.sensor_id} value={sensor.sensor_id}>{sensor.name} · {sensor.unit || sensor.sensor_type}</MenuItem>)}</TextField></Grid>
      <Grid item xs={6} md={1}><TextField fullWidth type="color" label="Màu" value={color} onChange={(event) => setColor(event.target.value)} /></Grid>
      <Grid item xs={6} md={1}><TextField fullWidth label="Đơn vị" value={unit} onChange={(event) => setUnit(event.target.value)} /></Grid>
      <Grid item><Button variant="contained" color="primary" disabled={busy} onClick={saveWidget}>Lưu widget</Button></Grid>
    </Grid>
    <Grid container spacing={1} alignItems="center" style={{ marginTop: 8 }}>
      <Grid item><TextField size="small" label="Từ" type="datetime-local" value={range.from.slice(0, 16)} onChange={(event) => setRange({ ...range, from: new Date(event.target.value).toISOString() })} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid item><TextField size="small" label="Đến" type="datetime-local" value={range.to.slice(0, 16)} onChange={(event) => setRange({ ...range, to: new Date(event.target.value).toISOString() })} InputLabelProps={{ shrink: true }} /></Grid>
      <Grid item><Button onClick={() => loadData()}>Truy vấn</Button><Button onClick={downloadCsv} disabled={!analytics}>Xuất CSV / Excel</Button><Button onClick={() => window.print()} disabled={!analytics}>Xuất PDF</Button></Grid>
      <Grid item><Typography variant="caption">Raw: {analytics && analytics.raw.length || 0} · Aggregated: {analytics && analytics.aggregated.length || 0} · Thống kê: {analytics && analytics.statistics.length || 0}</Typography></Grid>
    </Grid>
    <Grid container spacing={2} style={{ marginTop: 8 }}>{widgets.map((widget) => <Grid item xs={12} md={6} key={widget.widget_id}>{renderWidget(widget)}</Grid>)}</Grid>
    <Paper variant="outlined" style={{ marginTop: 16, padding: 12 }}><Typography variant="subtitle1">Raw data · trang {page} · Min / Max / Average</Typography>
      <Grid container spacing={1}>{(analytics && analytics.statistics || []).map((row) => <Grid item key={row.sensor_id}><Chip label={`${row.name}: ${row.min == null ? '—' : row.min} / ${row.max == null ? '—' : row.max} / ${row.average == null ? '—' : Number(row.average).toFixed(2)}`} /></Grid>)}</Grid>
      <Table size="small"><TableHead><TableRow>{['Sensor ID', 'Thời gian', 'Raw value', 'Quality'].map((value) => <TableCell key={value}>{value}</TableCell>)}</TableRow></TableHead><TableBody>{(analytics && analytics.raw || []).map((row) => <TableRow key={row.reading_id}><TableCell>{row.sensor_id}</TableCell><TableCell>{row.measured_at}</TableCell><TableCell>{row.value_number == null ? row.value_text || row.value_json : row.value_number}</TableCell><TableCell>{row.quality}</TableCell></TableRow>)}</TableBody></Table>
      <Button disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); loadData(selected, next); }}>Trước</Button><Button disabled={!analytics || analytics.raw.length < 100} onClick={() => { const next = page + 1; setPage(next); loadData(selected, next); }}>Sau</Button>
    </Paper>
  </div>;
}
