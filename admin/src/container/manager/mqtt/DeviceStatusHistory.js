import React from 'react';
import {
  Button, Grid, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@material-ui/core';
import { CanvasJSChart } from 'canvasjs-react-charts';
import {
  getDeviceHistoryDevices, getDeviceStatusHistory, getDeviceSwitchStats, getDeviceSensorData,
} from '../../../api/httpBaseUtil';

// Latest distinct states of a device (web_manager services/mongo/deviceHistory.js):
// consecutive messages with the same "va" + "co" are counted once.
const LIMITS = [5, 10, 20, 50];
// On/off statistics period (web_manager: { days: 1..31 } per day, { months: 1..12 } per month).
const PERIOD_OPTIONS = [
  { value: '7d', label: '7 ngày', period: { days: 7 } },
  { value: '30d', label: '30 ngày', period: { days: 30 } },
  { value: '12m', label: '1 năm (theo tháng)', period: { months: 12 } },
  // Custom range: { from, to, groupBy? } built from the date inputs.
  { value: 'custom', label: 'Từ ngày – đến ngày', period: null },
];
// Custom range limits (same as web_manager readPeriod).
const MAX_RANGE_DAYS = 366;
const MAX_RANGE_DAY_ROWS = 92;
const RANGE_GROUP_OPTIONS = [
  { value: '', label: 'Tự động' },
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' },
];
const DAY_MS = 24 * 60 * 60 * 1000;

// Local date as "YYYY-MM-DD" (value of <input type="date">).
function toDateInput(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function daysBetween(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY_MS) + 1;
}

// Returns an error message, or null when the range is valid.
function checkRange(from, to, groupBy) {
  if (!from || !to) return 'Chọn đủ "Từ ngày" và "Đến ngày".';
  if (from > to) return '"Từ ngày" phải trước hoặc bằng "Đến ngày".';
  if (from > toDateInput(new Date())) return '"Từ ngày" không được ở tương lai.';
  const days = daysBetween(from, to);
  if (days > MAX_RANGE_DAYS) return 'Khoảng thời gian tối đa ' + MAX_RANGE_DAYS + ' ngày.';
  if (groupBy === 'day' && days > MAX_RANGE_DAY_ROWS) return 'Chia theo ngày tối đa ' + MAX_RANGE_DAY_ROWS + ' ngày, hãy chọn theo tháng.';
  return null;
}

function rangePeriod(range) {
  return Object.assign({ from: range.from, to: range.to }, range.groupBy ? { groupBy: range.groupBy } : {});
}

function defaultRange() {
  return { from: toDateInput(new Date(Date.now() - 29 * DAY_MS)), to: toDateInput(new Date()), groupBy: '' };
}

// "Từ ngày" / "Đến ngày" / "Chia theo" inputs for a custom range { from, to, groupBy }.
function RangeInputs({ title, range, onChange, groupOptions, note }) {
  const update = (field) => (event) => onChange(Object.assign({}, range, { [field]: event.target.value }));
  return (
    <>
      <Grid item xs={12}>
        <Typography variant="body2" style={{ fontWeight: 500 }}>{title}</Typography>
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          type="date" fullWidth variant="outlined" size="small" label="Từ ngày"
          InputLabelProps={{ shrink: true }} inputProps={{ max: range.to || undefined }}
          value={range.from} onChange={update('from')}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          type="date" fullWidth variant="outlined" size="small" label="Đến ngày"
          InputLabelProps={{ shrink: true }} inputProps={{ min: range.from || undefined }}
          value={range.to} onChange={update('to')}
        />
      </Grid>
      <Grid item xs={6} sm={2}>
        <TextField
          select fullWidth variant="outlined" size="small" label="Chia theo"
          value={range.groupBy} onChange={update('groupBy')}
        >
          {groupOptions.map((item) => <MenuItem key={item.value || 'auto'} value={item.value}>{item.label}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={4}>
        <Typography variant="caption" color="textSecondary">{note}</Typography>
      </Grid>
    </>
  );
}

// Sensor charts over a custom range: 'day' = detailed points (averaged per minute bucket), 'month' = monthly averages.
const SENSOR_RANGE_GROUP_OPTIONS = [
  { value: '', label: 'Tự động' },
  { value: 'day', label: 'Chi tiết (TB theo phút)' },
  { value: 'month', label: 'Trung bình theo tháng' },
];
// Sensor chart period (web_manager sensor-data: { days: 1..31 }, { months: 1..12 } or { from, to, groupBy? }).
const SENSOR_PERIOD_OPTIONS = [
  { value: '1d', label: '1 ngày', period: { days: 1 } },
  { value: '7d', label: '7 ngày', period: { days: 7 } },
  { value: '30d', label: '30 ngày', period: { days: 30 } },
  { value: '12m', label: '1 năm (TB theo tháng)', period: { months: 12 } },
  // Custom range: { from, to, groupBy? } built from the date inputs.
  { value: 'custom', label: 'Từ ngày – đến ngày', period: null },
];
// Chart colors: categorical slots 1 and 2 of the validated palette (blue, orange).
const SERIES_COLORS = ['#2a78d6', '#eb6834'];
const AXIS_TEXT_COLOR = '#64748b';
const AXIS_LINE_COLOR = '#cbd5e1';
const GRID_COLOR = '#eef2f6';
// One series per chart (small multiples: sensors have different units, never a dual axis).
const SENSOR_LINE_COLOR = SERIES_COLORS[0];
// On/off charts: "Bật" = slot 1, "Tắt" = slot 2 (identity, not status colors).
const SWITCH_ON_COLOR = SERIES_COLORS[0];
const SWITCH_OFF_COLOR = SERIES_COLORS[1];

// "va": DeviceIOT 7 values, DeviceIOT8266 3; humidity / temperature are x100.
const SENSORS_ESP32 = [
  { label: 'Độ ẩm', unit: '%', scale: 100 },
  { label: 'Nhiệt độ', unit: '°C', scale: 100 },
  { label: 'Bụi', unit: '', scale: 1 },
  { label: 'PM2.5', unit: 'µg/m³', scale: 1 },
  { label: 'PM10', unit: 'µg/m³', scale: 1 },
  { label: 'PM1', unit: 'µg/m³', scale: 1 },
];
const SENSORS_8266 = [
  { label: 'Độ ẩm', unit: '%', scale: 100 },
  { label: 'Nhiệt độ', unit: '°C', scale: 100 },
  { label: 'ADC', unit: '', scale: 1 },
];

function toNumbers(text) {
  return String(text == null ? '' : text).split(',').map((part) => Number(part.trim()));
}

function describeSensors(va) {
  if (va === undefined) return '—';
  const values = toNumbers(va);
  const sensors = values.length >= 7 ? SENSORS_ESP32 : SENSORS_8266;
  return sensors
    .map((sensor, index) => (Number.isFinite(values[index])
      ? sensor.label + ' ' + values[index] / sensor.scale + (sensor.unit ? ' ' + sensor.unit : '')
      : null))
    .filter(Boolean)
    .join(' · ');
}

// "co": device_port, button_click, button_status, count_info.
function describePorts(co, channels) {
  if (co === undefined) return '—';
  const port = toNumbers(co)[0];
  if (!Number.isInteger(port)) return '—';
  const names = [];
  for (let index = 0; index < channels; index++) {
    names.push('Kênh ' + (index + 1) + ': ' + ((port & (1 << index)) ? 'Bật' : 'Tắt'));
  }
  return names.join(', ');
}

function describeCounters(co) {
  if (co === undefined) return '—';
  const values = toNumbers(co);
  return 'Nút ' + values[1] + ' · trạng thái nút ' + values[2] + ' · số lệnh ' + values[3];
}

// Firmware command replies: {"com":N} -> "rc":N, "rs" = result code.
const COMMAND_NAMES = {
  1: 'điều khiển', 2: 'đọc trạng thái', 4: 'đếm ngược', 5: 'hẹn giờ tắt', 8: 'thêm lịch', 9: 'sửa lịch',
  10: 'xóa lịch', 11: 'bật/tắt lịch', 12: 'xóa hết lịch', 14: 'ngưỡng',
};
const RESULT_NAMES = ['thành công', 'trùng lịch', 'không hợp lệ', 'không có', 'id đã có', 'chưa sẵn sàng',
  'sai mật khẩu', 'đang bận'];

function describeSettings(payload) {
  const parts = [];
  if (Number.isInteger(payload.rc)) {
    parts.push('trả lời com ' + payload.rc + (COMMAND_NAMES[payload.rc] ? ' (' + COMMAND_NAMES[payload.rc] + ')' : '') +
      (payload.rs ? ': ' + (RESULT_NAMES[payload.rs] || 'mã ' + payload.rs) : ''));
  }
  if (Array.isArray(payload.set)) parts.push(payload.set.length + ' lịch');
  if (Number.isInteger(payload.tim)) parts.push(payload.tim ? 'tự tắt ' + payload.tim + ' s' : 'không hẹn giờ tắt');
  if (Number.isInteger(payload.cd) && payload.cd > 0) {
    parts.push('đếm ngược ' + payload.cd + ' s' + (Number.isInteger(payload.cm) && payload.cm ? ' (cổng ' + payload.cm + ')' : ''));
  }
  if (Array.isArray(payload.th)) parts.push(payload.th.filter(Boolean).length + ' ngưỡng');
  if (payload.ip) parts.push('IP ' + payload.ip);
  return parts.length ? parts.join(' · ') : '—';
}

function formatTime(time) {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? String(time) : date.toLocaleString('vi-VN');
}

function errorText(error) {
  const data = error && error.response && error.response.data;
  return (data && (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))) ||
    (error && error.message) || 'Lỗi không xác định';
}

// "YYYY-MM-DD" -> "DD/MM/YYYY", "YYYY-MM" -> "Tháng MM/YYYY".
function formatBucket(key) {
  const [year, month, day] = String(key).split('-');
  return day ? day + '/' + month + '/' + year : 'Tháng ' + month + '/' + year;
}

// Short axis label: "YYYY-MM-DD" -> "DD/MM", "YYYY-MM" -> "MM/YYYY".
function shortBucket(key) {
  const [year, month, day] = String(key).split('-');
  return day ? day + '/' + month : month + '/' + year;
}

// One grouped column chart per channel (small multiples): "Bật" and "Tắt" per
// day / month, oldest first. All charts share the y maximum so heights compare.
function SwitchCharts({ stats }) {
  const channelIndexes = Array.from({ length: stats.channels }, (unused, index) => index);
  const maxCount = Math.max(1, ...stats.rows.map((row) => Math.max(...row.on, ...row.off)));
  const unit = stats.groupBy === 'month' ? 'tháng' : 'ngày';
  return (
    <Grid container spacing={2} style={{ marginBottom: 8 }}>
      {channelIndexes.map((index) => {
        const series = (name, color, values) => ({
          type: 'column', name, color, showInLegend: true,
          dataPoints: stats.rows.map((row) => ({ label: shortBucket(row.key), y: values(row), key: row.key })),
        });
        const options = {
          height: 240,
          animationEnabled: false,
          backgroundColor: 'transparent',
          dataPointMaxWidth: 28,
          legend: { fontColor: AXIS_TEXT_COLOR, fontSize: 12, verticalAlign: 'top', horizontalAlign: 'right' },
          toolTip: {
            shared: true,
            contentFormatter: (event) => {
              const point = event.entries[0].dataPoint;
              return formatBucket(point.key) + '<br/>' + event.entries
                .map((entry) => entry.dataSeries.name + ': <b>' + entry.dataPoint.y + '</b> lần')
                .join('<br/>');
            },
          },
          axisX: {
            labelFontColor: AXIS_TEXT_COLOR, lineColor: AXIS_LINE_COLOR, tickColor: AXIS_LINE_COLOR,
            labelAngle: stats.rows.length > 12 ? -45 : 0,
          },
          axisY: {
            minimum: 0, maximum: Math.ceil(maxCount * 1.1), includeZero: true,
            labelFontColor: AXIS_TEXT_COLOR, gridColor: GRID_COLOR, lineThickness: 0, tickLength: 0,
            labelFormatter: (event) => (Number.isInteger(event.value) ? String(event.value) : ''),
          },
          data: [
            series('Bật', SWITCH_ON_COLOR, (row) => row.on[index]),
            series('Tắt', SWITCH_OFF_COLOR, (row) => row.off[index]),
          ],
        };
        return (
          <Grid item xs={12} md={stats.channels > 1 ? 6 : 12} key={index}>
            <Paper variant="outlined" style={{ padding: 12 }}>
              <Typography variant="subtitle2">{'Kênh ' + (index + 1)}</Typography>
              <Typography variant="caption" color="textSecondary">
                {'Bật ' + stats.totals.on[index] + ' lần · tắt ' + stats.totals.off[index] + ' lần · mỗi cột là 1 ' + unit}
              </Typography>
              <CanvasJSChart options={options} />
            </Paper>
          </Grid>
        );
      })}
    </Grid>
  );
}

// Số lần bật / tắt theo ngày hoặc tháng (web_manager getSwitchStats): chỉ tính
// khi cổng đổi so với bản tin trạng thái liền trước, bản tin trùng bị bỏ qua.
function SwitchStats({ stats }) {
  const channelIndexes = Array.from({ length: stats.channels }, (unused, index) => index);
  const rows = stats.rows.slice().reverse();
  const byMonth = stats.groupBy === 'month';
  let title;
  if (stats.custom) {
    title = 'từ ' + new Date(stats.from).toLocaleDateString('vi-VN') + ' đến ' + new Date(stats.to).toLocaleDateString('vi-VN') +
      (byMonth ? ' (theo tháng)' : ' (theo ngày)');
  } else if (byMonth) {
    title = stats.count === 12 ? '1 năm gần nhất (theo tháng)' : stats.count + ' tháng gần nhất';
  } else {
    title = stats.count + ' ngày gần nhất';
  }
  return (
    <>
      <Typography variant="subtitle1" style={{ marginTop: 16 }}>
        {'Số lần bật / tắt ' + title}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {'Tổng: bật ' + stats.totals.totalOn + ' lần, tắt ' + stats.totals.totalOff + ' lần · ' +
          stats.changes + ' lần đổi trạng thái / ' + stats.scanned + ' bản tin đã đọc' +
          (stats.truncated ? ' (đã đạt giới hạn đọc, số liệu có thể thiếu)' : '')}
      </Typography>
      <SwitchCharts stats={stats} />
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{byMonth ? 'Tháng' : 'Ngày'}</TableCell>
              {channelIndexes.map((index) => (
                <React.Fragment key={index}>
                  <TableCell align="right">{'Kênh ' + (index + 1) + ' bật'}</TableCell>
                  <TableCell align="right">{'Kênh ' + (index + 1) + ' tắt'}</TableCell>
                </React.Fragment>
              ))}
              <TableCell align="right">Tổng bật</TableCell>
              <TableCell align="right">Tổng tắt</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>{formatBucket(row.key)}</TableCell>
                {channelIndexes.map((index) => (
                  <React.Fragment key={index}>
                    <TableCell align="right">{row.on[index]}</TableCell>
                    <TableCell align="right">{row.off[index]}</TableCell>
                  </React.Fragment>
                ))}
                <TableCell align="right"><b>{row.totalOn}</b></TableCell>
                <TableCell align="right"><b>{row.totalOff}</b></TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell><b>Tổng</b></TableCell>
              {channelIndexes.map((index) => (
                <React.Fragment key={index}>
                  <TableCell align="right"><b>{stats.totals.on[index]}</b></TableCell>
                  <TableCell align="right"><b>{stats.totals.off[index]}</b></TableCell>
                </React.Fragment>
              ))}
              <TableCell align="right"><b>{stats.totals.totalOn}</b></TableCell>
              <TableCell align="right"><b>{stats.totals.totalOff}</b></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

function roundValue(value) {
  return Math.round(value * 100) / 100;
}

function sensorDefinition(definitions, index) {
  return definitions[index] || { label: 'Giá trị ' + (index + 1), unit: '', scale: 1 };
}

function formatMonth(time) {
  const date = new Date(time);
  return 'Tháng ' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}

// One line chart per sensor value of "va" (web_manager getSensorData): values
// already de-duplicated and averaged per bucketMs (days) or per month (months);
// raw units scaled here.
function SensorCharts({ data }) {
  const byMonth = data.groupBy === 'month';
  const definitions = data.sensors >= 7 ? SENSORS_ESP32 : SENSORS_8266;
  const charts = [];
  for (let index = 0; index < data.sensors; index++) {
    const sensor = sensorDefinition(definitions, index);
    const dataPoints = data.points
      .filter((point) => point.values[index] !== null)
      .map((point) => ({ x: new Date(point.time), y: roundValue(point.values[index] / sensor.scale) }));
    if (!dataPoints.length) continue;
    const ys = dataPoints.map((point) => point.y);
    const average = roundValue(ys.reduce((total, value) => total + value, 0) / ys.length);
    const unit = sensor.unit ? ' ' + sensor.unit : '';
    charts.push({
      key: index,
      title: sensor.label + (sensor.unit ? ' (' + sensor.unit + ')' : ''),
      summary: 'Thấp nhất ' + Math.min(...ys) + unit + ' · trung bình ' + average + unit + ' · cao nhất ' + Math.max(...ys) + unit +
        (byMonth ? ' · tháng gần nhất ' : ' · mới nhất ') + ys[ys.length - 1] + unit,
      options: {
        height: 220,
        animationEnabled: false,
        zoomEnabled: !byMonth,
        backgroundColor: 'transparent',
        toolTip: { contentFormatter: (event) => {
          const point = event.entries[0].dataPoint;
          const when = byMonth ? formatMonth(point.x) + ' (trung bình)' : point.x.toLocaleString('vi-VN');
          return when + '<br/><b>' + point.y + unit + '</b>';
        } },
        axisX: Object.assign({
          valueFormatString: byMonth ? 'MM/YYYY' : (data.count > 1 ? 'DD/MM' : 'HH:mm'),
          labelFontColor: '#64748b', lineColor: '#cbd5e1', tickColor: '#cbd5e1',
          crosshair: { enabled: true, color: '#94a3b8', labelBackgroundColor: '#475569' },
        }, byMonth ? { interval: 1, intervalType: 'month', labelAngle: -45 } : {}),
        axisY: {
          includeZero: false, labelFontColor: '#64748b', gridColor: '#eef2f6', lineThickness: 0, tickLength: 0,
        },
        data: [{
          type: 'line', color: SENSOR_LINE_COLOR, lineThickness: 2,
          markerSize: byMonth || dataPoints.length <= 60 ? 8 : 0,
          xValueType: 'dateTime', dataPoints,
        }],
      },
    });
  }
  const bucketMinutes = Math.round((data.bucketMs || 0) / 60000);
  let title;
  if (data.custom) {
    title = 'từ ' + new Date(data.from).toLocaleDateString('vi-VN') + ' đến ' + new Date(data.to).toLocaleDateString('vi-VN') +
      (byMonth ? ' (trung bình theo tháng)' : '');
  } else if (byMonth) {
    title = data.count === 12 ? '1 năm gần nhất (trung bình theo tháng)' : data.count + ' tháng gần nhất (trung bình theo tháng)';
  } else {
    title = data.count + ' ngày gần nhất';
  }
  const bucketText = byMonth
    ? 'mỗi điểm là trung bình 1 tháng'
    : 'mỗi điểm là trung bình ' + (bucketMinutes >= 60 && bucketMinutes % 60 === 0 ? bucketMinutes / 60 + ' giờ' : bucketMinutes + ' phút');
  return (
    <>
      <Typography variant="subtitle1" style={{ marginTop: 16 }}>
        {'Dữ liệu cảm biến ' + title}
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        {data.distinct + ' bản tin khác nhau / ' + data.scanned + ' bản tin đã đọc (bỏ bản tin trùng giá trị) · ' + bucketText +
          (data.truncated ? ' · đã đạt giới hạn đọc, số liệu có thể thiếu' : '')}
      </Typography>
      {charts.length === 0 && (
        <Typography variant="body2" gutterBottom>Không có dữ liệu cảm biến trong khoảng thời gian này.</Typography>
      )}
      <Grid container spacing={2}>
        {charts.map((chart) => (
          <Grid item xs={12} md={6} key={chart.key}>
            <Paper variant="outlined" style={{ padding: 12 }}>
              <Typography variant="subtitle2">{chart.title}</Typography>
              <Typography variant="caption" color="textSecondary">{chart.summary}</Typography>
              <CanvasJSChart options={chart.options} />
            </Paper>
          </Grid>
        ))}
      </Grid>
      {byMonth && charts.length > 0 && <MonthlySensorTable data={data} definitions={definitions} />}
    </>
  );
}

// Monthly averages as a table (same numbers as the monthly charts), newest month first.
function MonthlySensorTable({ data, definitions }) {
  const indexes = Array.from({ length: data.sensors }, (unused, index) => index);
  const points = data.points.slice().reverse();
  return (
    <TableContainer style={{ marginTop: 12 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Tháng</TableCell>
            {indexes.map((index) => {
              const sensor = sensorDefinition(definitions, index);
              return <TableCell key={index} align="right">{sensor.label + (sensor.unit ? ' (' + sensor.unit + ')' : '')}</TableCell>;
            })}
            <TableCell align="right">Số bản tin</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {points.map((point) => (
            <TableRow key={point.time}>
              <TableCell>{formatMonth(point.time)}</TableCell>
              {indexes.map((index) => (
                <TableCell key={index} align="right">
                  {point.values[index] === null ? '—' : roundValue(point.values[index] / sensorDefinition(definitions, index).scale)}
                </TableCell>
              ))}
              <TableCell align="right">{point.count}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function DeviceStatusHistory() {
  const [devices, setDevices] = React.useState([]);
  const [deviceId, setDeviceId] = React.useState('');
  const [limit, setLimit] = React.useState(10);
  const [result, setResult] = React.useState(null);
  const [stats, setStats] = React.useState(null);
  const [periodValue, setPeriodValue] = React.useState('12m');
  const [statsRange, setStatsRange] = React.useState(defaultRange);
  const [sensorPeriodValue, setSensorPeriodValue] = React.useState('12m');
  const [sensorRange, setSensorRange] = React.useState(defaultRange);
  const [sensorData, setSensorData] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    getDeviceHistoryDevices()
      .then((response) => setDevices(response.data.result || []))
      .catch((loadError) => setError('Không tải được danh sách thiết bị: ' + errorText(loadError)));
  }, []);

  // Id of the latest "Xem": replies of an older request (other device / period) are ignored.
  const requestRef = React.useRef(0);

  // Period sent to the API for the chosen option, or null after showing the range error.
  const resolvePeriod = (options, value, range, label) => {
    const option = options.find((item) => item.value === value) || options[0];
    if (option.value !== 'custom') return option.period;
    const rangeError = checkRange(range.from, range.to, range.groupBy);
    if (rangeError) {
      setError(label + ': ' + rangeError);
      return null;
    }
    return rangePeriod(range);
  };

  const load = () => {
    if (!deviceId) {
      setError('Chọn thiết bị.');
      return;
    }
    const statsPeriod = resolvePeriod(PERIOD_OPTIONS, periodValue, statsRange, 'Thống kê bật/tắt');
    if (!statsPeriod) return;
    const sensorPeriod = resolvePeriod(SENSOR_PERIOD_OPTIONS, sensorPeriodValue, sensorRange, 'Biểu đồ cảm biến');
    if (!sensorPeriod) return;

    const requestId = ++requestRef.current;
    const current = () => requestId === requestRef.current;
    const addError = (text, loadError) => {
      setError((previous) => (previous ? previous + ' · ' : '') + text + errorText(loadError));
    };
    const id = Number(deviceId);
    setError('');
    setResult(null);
    setSensorData(null);
    setStats(null);
    getDeviceStatusHistory(id, limit)
      .then((response) => { if (current()) setResult(response.data); })
      .catch((loadError) => { if (current()) addError('Không tải được lịch sử: ', loadError); });
    getDeviceSensorData(id, sensorPeriod)
      .then((response) => { if (current()) setSensorData(response.data); })
      .catch((loadError) => { if (current()) addError('Không tải được dữ liệu cảm biến: ', loadError); });
    getDeviceSwitchStats(id, statsPeriod)
      .then((response) => { if (current()) setStats(response.data); })
      .catch((loadError) => { if (current()) addError('Không tải được thống kê bật/tắt: ', loadError); });
  };

  const history = result ? result.history : [];
  // DeviceIOT drives 2 outputs, DeviceIOT8266 one (same rule as "va").
  const channels = history.some((item) => toNumbers((item.payload || {}).va).length >= 7) ? 2 : 1;

  return (
    <Paper style={{ padding: 16, margin: 16 }}>
      <Typography variant="h6" gutterBottom>Lịch sử trạng thái thiết bị</Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Các trạng thái gần nhất từ MongoDB; bản tin trùng trạng thái (cùng cảm biến và cổng) với bản tin liền trước bị bỏ qua.
      </Typography>
      <Grid container spacing={2} alignItems="center" style={{ marginTop: 8, marginBottom: 8 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            select fullWidth variant="outlined" size="small" label="Thiết bị"
            value={deviceId} onChange={(event) => setDeviceId(event.target.value)}
          >
            {devices.map((device) => (
              <MenuItem key={device.mqtt_microservice_id} value={String(device.mqtt_microservice_id)}>
                {(device.content || ('#' + device.mqtt_microservice_id)) + ' · ' + device.mqtt_pub}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={2}>
          <TextField
            select fullWidth variant="outlined" size="small" label="Số trạng thái"
            value={limit} onChange={(event) => setLimit(Number(event.target.value))}
          >
            {LIMITS.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={2}>
          <TextField
            select fullWidth variant="outlined" size="small" label="Biểu đồ cảm biến"
            value={sensorPeriodValue} onChange={(event) => setSensorPeriodValue(event.target.value)}
          >
            {SENSOR_PERIOD_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={2}>
          <TextField
            select fullWidth variant="outlined" size="small" label="Thống kê bật/tắt"
            value={periodValue} onChange={(event) => setPeriodValue(event.target.value)}
          >
            {PERIOD_OPTIONS.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6} sm={2}>
          <Button variant="contained" color="primary" onClick={load}>Xem</Button>
        </Grid>
        {sensorPeriodValue === 'custom' && (
          <RangeInputs
            title="Biểu đồ cảm biến – khoảng thời gian" range={sensorRange} onChange={setSensorRange}
            groupOptions={SENSOR_RANGE_GROUP_OPTIONS}
            note={'Tính cả 2 ngày đầu cuối · tối đa ' + MAX_RANGE_DAYS + ' ngày · tự động: tới 62 ngày vẽ chi tiết, dài hơn vẽ trung bình theo tháng'}
          />
        )}
        {periodValue === 'custom' && (
          <RangeInputs
            title="Thống kê bật/tắt – khoảng thời gian" range={statsRange} onChange={setStatsRange}
            groupOptions={RANGE_GROUP_OPTIONS}
            note={'Tính cả 2 ngày đầu cuối · tối đa ' + MAX_RANGE_DAYS + ' ngày · tự động: tới 62 ngày chia theo ngày, dài hơn theo tháng'}
          />
        )}
      </Grid>

      {error && <Typography color="error" gutterBottom>{error}</Typography>}

      {sensorData && <SensorCharts data={sensorData} />}

      {stats && <SwitchStats stats={stats} />}

      {result && (
        <>
          <Typography variant="subtitle1" style={{ marginTop: 16 }}>Trạng thái gần nhất</Typography>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {'Topic ' + result.device.mqtt_pub + ': ' + history.length + ' trạng thái (đã đọc ' + result.scanned + ' bản tin).'}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>STT</TableCell>
                  <TableCell>Thời gian</TableCell>
                  <TableCell>Cổng</TableCell>
                  <TableCell>Cảm biến</TableCell>
                  <TableCell>Nút / số lệnh</TableCell>
                  <TableCell>Cài đặt</TableCell>
                  <TableCell>Bản tin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 && (
                  <TableRow><TableCell colSpan={7}>Chưa có bản tin trạng thái nào của thiết bị này.</TableCell></TableRow>
                )}
                {history.map((item, index) => (
                  <TableRow key={item.time + '-' + index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{formatTime(item.time)}</TableCell>
                    <TableCell>{describePorts(item.payload.co, channels)}</TableCell>
                    <TableCell>{describeSensors(item.payload.va)}</TableCell>
                    <TableCell>{describeCounters(item.payload.co)}</TableCell>
                    <TableCell>{describeSettings(item.payload)}</TableCell>
                    <TableCell style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                      {JSON.stringify(item.payload)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Paper>
  );
}
