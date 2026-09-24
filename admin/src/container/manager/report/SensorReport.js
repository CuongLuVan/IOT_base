import React, { useMemo, useState } from 'react';
import { CanvasJSChart } from 'canvasjs-react-charts';
import AssessmentIcon from '@material-ui/icons/Assessment';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CloudQueueIcon from '@material-ui/icons/CloudQueue';
import DeviceThermostatIcon from '@material-ui/icons/DeviceThermostat';
import OpacityIcon from '@material-ui/icons/Opacity';
import ReplayIcon from '@material-ui/icons/Replay';

const sensorDefinitions = [
    { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#ff7a59', icon: DeviceThermostatIcon },
    { key: 'humidity', label: 'Độ ẩm', unit: '%', color: '#38bdf8', icon: OpacityIcon },
    { key: 'dust', label: 'Độ bụi', unit: 'µg/m³', color: '#f5b942', icon: CloudQueueIcon },
];

const createSensorData = (range) => {
    const count = range === 'day' ? 12 : range === 'month' ? 14 : 12;
    return Array.from({ length: count }, (_, index) => {
        const temperature = 24 + Math.sin(index / 1.8) * 2.4 + (index % 4 === 0 ? 0.8 : 0);
        const humidity = 58 + Math.cos(index / 2.1) * 7;
        const dust = 18 + Math.sin(index / 1.4) * 5 + (index % 5 === 0 ? 3 : 0);
        let label = `${String(index * 2).padStart(2, '0')}:00`;
        if (range === 'month') label = `${String(index + 1).padStart(2, '0')}/09`;
        if (range === 'year') label = `T${index + 1}`;
        return { label, temperature: Number(temperature.toFixed(1)), humidity: Number(humidity.toFixed(1)), dust: Number(dust.toFixed(1)) };
    });
};

const SensorCard = ({ definition, value }) => {
    const Icon = definition.icon;
    return (
        <div className="sensor-kpi" style={{ '--sensor-color': definition.color }}>
            <div className="sensor-kpi-icon"><Icon /></div>
            <div>
                <span className="sensor-kpi-label">{definition.label}</span>
                <strong>{value}{definition.unit}</strong>
                <small><span className="sensor-live-dot" /> Đang cập nhật</small>
            </div>
        </div>
    );
};

const SensorReport = () => {
    const [range, setRange] = useState('day');
    const [date, setDate] = useState('2026-09-11');
    const [device, setDevice] = useState('all');
    const sensorData = useMemo(() => createSensorData(range), [range, date, device]);
    const latest = sensorData[sensorData.length - 1];

    const trendOptions = useMemo(() => ({
        animationEnabled: true,
        backgroundColor: 'transparent',
        toolTip: { shared: true, backgroundColor: '#162535', borderColor: '#31465a', fontColor: '#e8f0f7' },
        legend: { fontColor: '#9eb1c1', cursor: 'pointer', itemclick: (event) => { event.dataSeries.visible = !(event.dataSeries.visible === false); } },
        axisX: { labelFontColor: '#71879a', lineColor: '#263a4b', tickColor: '#263a4b', interval: range === 'day' ? 2 : 1 },
        axisY: { title: 'Nhiệt độ (°C)', titleFontColor: '#ff9a7c', labelFontColor: '#71879a', gridColor: '#203444', lineColor: '#263a4b', suffix: '°C' },
        axisY2: { title: 'Độ ẩm / bụi', titleFontColor: '#69c9f4', labelFontColor: '#71879a', gridColor: 'transparent', suffix: '%' },
        data: [
            { type: 'spline', name: 'Nhiệt độ', color: '#ff7a59', lineThickness: 3, markerSize: 5, dataPoints: sensorData.map((item) => ({ label: item.label, y: item.temperature })) },
            { type: 'spline', name: 'Độ ẩm', color: '#38bdf8', axisYType: 'secondary', lineThickness: 2, dataPoints: sensorData.map((item) => ({ label: item.label, y: item.humidity })) },
            { type: 'spline', name: 'Độ bụi', color: '#f5b942', axisYType: 'secondary', lineDashType: 'dash', lineThickness: 2, dataPoints: sensorData.map((item) => ({ label: item.label, y: item.dust })) },
        ],
    }), [range, sensorData]);

    const percentOptions = useMemo(() => ({
        animationEnabled: true,
        backgroundColor: 'transparent',
        toolTip: { enabled: false },
        data: [{ type: 'doughnut', innerRadius: '72%', startAngle: 270, showInLegend: false, indexLabel: '{y}%', indexLabelFontColor: '#ecf5fb', indexLabelFontSize: 22, dataPoints: [{ y: 87, color: '#42d392' }, { y: 13, color: '#263c4b', indexLabel: '' }] }],
    }), []);

    return (
        <div className="sensor-report">
            <div className="sensor-report-header">
                <div>
                    <div className="sensor-eyebrow"><span className="sensor-pulse" /> LIVE MONITORING / IOT-ROOM-01</div>
                    <h1>Phân tích cảm biến</h1>
                    <p>Theo dõi môi trường theo thời gian thực và lịch sử thiết bị.</p>
                </div>
                <div className="sensor-header-status"><CheckCircleIcon /> Hệ thống ổn định <span>•</span> 12 thiết bị online</div>
            </div>

            <div className="sensor-filter-bar">
                <div className="sensor-filter-label"><AssessmentIcon /> Khoảng thời gian</div>
                <div className="sensor-range-tabs">
                    {['day', 'month', 'year'].map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>{item === 'day' ? 'Theo ngày' : item === 'month' ? 'Theo tháng' : 'Theo năm'}</button>)}
                </div>
                <input aria-label="Chọn ngày báo cáo" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                <select aria-label="Chọn thiết bị" value={device} onChange={(event) => setDevice(event.target.value)}>
                    <option value="all">Tất cả thiết bị</option>
                    <option value="room-01">Phòng máy 01</option>
                    <option value="room-02">Phòng máy 02</option>
                </select>
                <button className="sensor-refresh" title="Làm mới dữ liệu" onClick={() => setDate((current) => current)}><ReplayIcon /></button>
            </div>

            <div className="sensor-kpi-grid">
                {sensorDefinitions.map((definition) => <SensorCard key={definition.key} definition={definition} value={latest[definition.key]} />)}
                <div className="sensor-kpi sensor-kpi-status"><div className="sensor-status-ring"><CheckCircleIcon /></div><div><span className="sensor-kpi-label">Trạng thái hiện tại</span><strong>Bình thường</strong><small>Không có cảnh báo mới</small></div></div>
            </div>

            <div className="sensor-content-grid">
                <section className="sensor-panel sensor-trend-panel">
                    <div className="sensor-panel-heading"><div><span className="sensor-panel-kicker">HISTORY / TREND</span><h2>Biến động chỉ số</h2></div><span className="sensor-period-chip">{range === 'day' ? '24 giờ qua' : range === 'month' ? 'Tháng hiện tại' : 'Năm hiện tại'}</span></div>
                    <CanvasJSChart options={trendOptions} />
                </section>
                <section className="sensor-panel sensor-health-panel">
                    <div className="sensor-panel-heading"><div><span className="sensor-panel-kicker">HEALTH SCORE</span><h2>Chỉ số an toàn</h2></div></div>
                    <div className="sensor-donut"><CanvasJSChart options={percentOptions} /><div><strong>87%</strong><span>Ổn định</span></div></div>
                    <div className="sensor-health-row"><span><i className="sensor-key green" /> Trong ngưỡng</span><b>87%</b></div><div className="sensor-health-row"><span><i className="sensor-key amber" /> Cần theo dõi</span><b>13%</b></div>
                </section>
            </div>

            <section className="sensor-panel sensor-status-panel">
                <div className="sensor-panel-heading"><div><span className="sensor-panel-kicker">DEVICE STATUS</span><h2>Trạng thái thiết bị</h2></div><span className="sensor-count">12 thiết bị</span></div>
                <div className="sensor-device-table"><div className="sensor-device-row sensor-device-head"><span>Thiết bị</span><span>Vị trí</span><span>Giá trị cuối</span><span>Trạng thái</span></div>{[['SENSOR-001', 'Phòng máy 01', `${latest.temperature}°C`, 'Ổn định'], ['SENSOR-002', 'Phòng máy 02', `${latest.humidity}%`, 'Ổn định'], ['SENSOR-003', 'Kho vật tư', `${latest.dust} µg/m³`, 'Cần theo dõi']].map((item) => <div className="sensor-device-row" key={item[0]}><strong>{item[0]}</strong><span>{item[1]}</span><span>{item[2]}</span><span className={item[3] === 'Ổn định' ? 'sensor-state good' : 'sensor-state watch'}><i />{item[3]}</span></div>)}</div>
            </section>
        </div>
    );
};

export default SensorReport;