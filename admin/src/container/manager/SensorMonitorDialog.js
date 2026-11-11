import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@material-ui/core';
import { CanvasJSChart } from 'canvasjs-react-charts';
import { listSensorReadings } from '../../api/roomManagementApi';

const csvCell = (value) => {
  const text = value == null ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
};
const fileDownload = (content, type, name) => {
  const blob = new Blob(['\uFEFF', content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
};
const stamp = (date) => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
};

export default function SensorMonitorDialog({ open, sensor, room, onClose, onError }) {
  const [period, setPeriod] = useState('week');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [realtime, setRealtime] = useState(true);
  const [rows, setRows] = useState([]);
  const [updated, setUpdated] = useState(null);
  const [loading, setLoading] = useState(false);

  const range = useCallback(() => {
    if (period === 'custom') return { from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to).toISOString() : undefined };
    const end = new Date();
    const start = new Date(end);
    if (period === 'day') start.setDate(start.getDate() - 1);
    else if (period === 'week') start.setDate(start.getDate() - 7);
    else if (period === 'month') start.setMonth(start.getMonth() - 1);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [period, from, to]);
  const load = useCallback(async () => {
    if (!sensor) return;
    setLoading(true);
    try {
      const fetched = await listSensorReadings(sensor.sensor_id, range());
      const seen = new Set();
      const unique = fetched.filter((row) => {
        const key = row.reading_id || [row.measured_at, row.value_number, row.value_text, row.value_json].join('|');
        if (seen.has(key)) return false;
        seen.add(key); return true;
      }).sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
      setRows(unique); setUpdated(new Date());
    } catch (e) { onError(e && e.response && e.response.data && e.response.data.error || e.message || 'Không tải được lịch sử sensor.'); }
    finally { setLoading(false); }
  }, [sensor, range, onError]);
  useEffect(() => { if (open) load(); }, [open, load]);
  useEffect(() => {
    if (!open || !realtime) return undefined;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [open, realtime, load]);

  const chartRows = useMemo(() => rows.map((r) => ({ x: new Date(r.measured_at), y: r.value_number == null ? Number(r.value_text) : Number(r.value_number) })).filter((p) => Number.isFinite(p.y)), [rows]);
  const stats = useMemo(() => {
    if (!chartRows.length) return { min: '—', max: '—', avg: '—' };
    const values = chartRows.map((x) => x.y);
    return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length };
  }, [chartRows]);
  if (!sensor) return null;
  const exportRows = rows.map((r) => [r.measured_at, r.value_number, r.value_text, r.value_json, r.quality]);
  const header = ['measured_at', 'value_number', 'value_text', 'value_json', 'quality'];
  const exportCsv = () => fileDownload([header, ...exportRows].map((row) => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8', `sensor-${sensor.sensor_key || sensor.sensor_id}.csv`);
  const exportExcel = () => {
    const table = `<table><thead><tr>${header.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${exportRows.map((row) => `<tr>${row.map((x) => `<td>${String(x == null ? '' : x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    fileDownload(`<!doctype html><html><meta charset="utf-8"><body>${table}</body></html>`, 'application/vnd.ms-excel', `sensor-${sensor.sensor_key || sensor.sensor_id}.xls`);
  };
  const latest = rows.length ? rows[rows.length - 1] : sensor.latest_reading;
  const latestAt = latest && stamp(latest.measured_at);
  const stale = latestAt && Date.now() - new Date(latestAt).getTime() > Math.max(Number(sensor.update_interval_seconds || 60) * 3000, 180000);
  const chartOptions = { animationEnabled: false, zoomEnabled: true, axisX: { valueFormatString: 'DD MMM HH:mm', labelAngle: -40 }, axisY: { title: sensor.unit || 'Giá trị' }, data: [{ type: 'line', markerSize: 3, xValueType: 'dateTime', dataPoints: chartRows }] };
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
    <DialogTitle>Giám sát sensor: {sensor.name} <Chip size="small" label={sensor.status || 'UNKNOWN'} /> {stale && <Chip size="small" color="secondary" label="Dữ liệu trễ / mất cập nhật" />}</DialogTitle>
    <DialogContent>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={4}><Typography variant="body2">Key: {sensor.sensor_key} · Loại: {sensor.sensor_type} · Thiết bị ID: {sensor.device_id} · Phòng: {room && room.name}</Typography><Typography variant="h5">{latest ? (latest.value_number != null ? latest.value_number : latest.value_text || latest.value_json || '—') : '—'} {sensor.unit || ''}</Typography><Typography variant="caption">Cập nhật: {latestAt || 'Chưa có dữ liệu'} · Làm mới lúc: {updated && updated.toLocaleTimeString()}</Typography></Grid>
        <Grid item xs={12} md={4}><TextField select fullWidth label="Khoảng thời gian" value={period} onChange={(e) => setPeriod(e.target.value)}><MenuItem value="day">24 giờ</MenuItem><MenuItem value="week">7 ngày</MenuItem><MenuItem value="month">1 tháng</MenuItem><MenuItem value="custom">Tùy chọn</MenuItem></TextField></Grid>
        {period === 'custom' && <><Grid item xs={6} md={2}><TextField fullWidth type="datetime-local" label="Từ" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} /></Grid><Grid item xs={6} md={2}><TextField fullWidth type="datetime-local" label="Đến" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} /></Grid></>}
        <Grid item><Checkbox checked={realtime} onChange={(e) => setRealtime(e.target.checked)} />Realtime 15 giây</Grid><Grid item><Button onClick={load} disabled={loading}>Cập nhật</Button><Button onClick={exportCsv}>CSV</Button><Button onClick={exportExcel}>Excel</Button></Grid>
      </Grid>
      <Grid container spacing={1} style={{ margin: '12px 0' }}>{[['Min', stats.min], ['Max', stats.max], ['Average', typeof stats.avg === 'number' ? stats.avg.toFixed(3) : stats.avg]].map(([k, v]) => <Grid item xs={4} key={k}><Paper variant="outlined" style={{ padding: 10 }}>{k}: <b>{v}</b> {sensor.unit || ''}</Paper></Grid>)}</Grid>
      {chartRows.length ? <CanvasJSChart options={chartOptions} /> : <Typography color="textSecondary">Chưa có giá trị số để vẽ biểu đồ.</Typography>}
      <Table size="small"><TableHead><TableRow>{header.map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead><TableBody>{rows.slice(-250).reverse().map((r) => <TableRow key={r.reading_id || r.measured_at}><TableCell>{r.measured_at}</TableCell><TableCell>{r.value_number}</TableCell><TableCell>{r.value_text}</TableCell><TableCell>{r.value_json}</TableCell><TableCell>{r.quality}</TableCell></TableRow>)}</TableBody></Table>
    </DialogContent><DialogActions><Button onClick={onClose}>Đóng</Button></DialogActions>
  </Dialog>;
}
