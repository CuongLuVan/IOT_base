import React, { useEffect, useRef, useCallback, useState } from 'react';
import './OeeDashboard.css';

// ============================================================
// TAB NAVIGATION
// ============================================================
const TABS = [
  { id: 'energy', label: 'Energy', icon: '⚡' },
  { id: 'counter', label: 'Counter', icon: '🔢' },
  { id: 'motors', label: 'Motors', icon: '⚙️' },
  { id: 'oee', label: 'OEE', icon: '📊' },
  { id: 'alarm', label: 'Alarm', icon: '🔔' },
];

const TabNavigation = ({ activeTab, onTabChange }) => (
  <div className="oee-dashboard__tabs">
    <button className="oee-dashboard__tab-menu" title="Menu">☰</button>
    {TABS.map(tab => (
      <button
        key={tab.id}
        className={`oee-dashboard__tab ${activeTab === tab.id ? 'oee-dashboard__tab--active' : ''}`}
        onClick={() => onTabChange(tab.id)}
      >
        <span className="oee-dashboard__tab-icon">{tab.icon}</span>
        {tab.label}
      </button>
    ))}
  </div>
);

// ============================================================
// DATE NAVIGATION
// ============================================================
const DateNavigation = () => (
  <div className="oee-dashboard__date-nav">
    <button className="oee-dashboard__date-btn oee-dashboard__date-btn--dark" title="Calendar">📅</button>
    <button className="oee-dashboard__date-btn" title="Previous">◀</button>
    <span className="oee-dashboard__date-text">1/20/20</span>
    <button className="oee-dashboard__date-btn" title="Calendar picker">📆</button>
    <button className="oee-dashboard__date-btn" title="Next">▶</button>
    <button className="oee-dashboard__date-btn oee-dashboard__date-btn--gear" title="Settings">⚙</button>
  </div>
);

// ============================================================
// MINI GAUGE for Quality Rate KPI
// ============================================================
const MiniGauge = ({ value, maxValue = 100, size = 100 }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h - 8;
    const r = Math.min(w, h) * 0.6;
    const pct = Math.min(value / maxValue, 1);

    ctx.clearRect(0, 0, w, h);

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#e0e0e0';
    ctx.stroke();

    // Colored segments
    const segs = [
      { s: 0, e: 0.4, c: '#4caf50' },
      { s: 0.4, e: 0.6, c: '#8bc34a' },
      { s: 0.6, e: 0.75, c: '#ffc107' },
      { s: 0.75, e: 0.9, c: '#ff9800' },
      { s: 0.9, e: 1.0, c: '#f44336' },
    ];
    segs.forEach(seg => {
      const end = Math.min(seg.e, pct);
      if (seg.s < pct) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI + seg.s * Math.PI, Math.PI + end * Math.PI);
        ctx.lineWidth = 14;
        ctx.strokeStyle = seg.c;
        ctx.lineCap = 'butt';
        ctx.stroke();
      }
    });

    // Needle
    const angle = Math.PI + pct * Math.PI;
    const nl = r - 18;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + nl * Math.cos(angle), cy + nl * Math.sin(angle));
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
  }, [value, maxValue]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="oee-dashboard__kpi-gauge" style={{ width: size, height: size * 0.65 }}>
      <canvas ref={canvasRef} width={size * 2} height={size * 1.3} className="oee-dashboard__chart-canvas" />
      <div className="oee-dashboard__kpi-gauge-value">{value}</div>
    </div>
  );
};

// ============================================================
// DONUT CHART for Production Output
// ============================================================
const DonutChart = ({ data, centerValue, centerLabel, size = 140 }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 5;
    const innerR = outerR * 0.6;
    const total = data.reduce((sum, d) => sum + d.value, 0);

    ctx.clearRect(0, 0, w, h);

    let currentAngle = -Math.PI / 2;
    data.forEach(d => {
      const sliceAngle = (d.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, currentAngle, currentAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();

      // Slight border between segments
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentAngle += sliceAngle;
    });
  }, [data]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="oee-dashboard__donut-wrapper" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} width={size * 2} height={size * 2} className="oee-dashboard__chart-canvas" />
      <div className="oee-dashboard__donut-center">
        <div className="oee-dashboard__donut-value">{centerValue}</div>
        <div className="oee-dashboard__donut-label">{centerLabel}</div>
      </div>
    </div>
  );
};

// ============================================================
// LINE CHART for Conveyor Temperature
// ============================================================
const ConveyorLineChart = ({ datasets, timeLabels, yMin, yMax }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const pad = { top: 15, right: 15, bottom: 45, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;
    const yRange = yMax - yMin;

    ctx.clearRect(0, 0, w, h);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = yMin + (yRange / ySteps) * i;
      const y = pad.top + ch - ((yVal - yMin) / yRange) * ch;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      // Y label
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toFixed(2), pad.left - 6, y + 4);
    }

    // X labels
    if (timeLabels && timeLabels.length > 0) {
      const step = Math.max(1, Math.floor(timeLabels.length / 6));
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < timeLabels.length; i += step) {
        const x = pad.left + (i / (timeLabels.length - 1)) * cw;
        ctx.fillText(timeLabels[i], x, h - pad.bottom + 18);
        // Vertical grid
        ctx.beginPath();
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, pad.top);
        ctx.lineTo(x, pad.top + ch);
        ctx.stroke();
      }
      // "Time" label
      ctx.fillStyle = '#888';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Time', w / 2, h - 5);
    }

    // Y-axis label
    ctx.save();
    ctx.translate(12, pad.top + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('°C', 0, 0);
    ctx.restore();

    // Draw each dataset line
    datasets.forEach(ds => {
      if (!ds.data || ds.data.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = ds.color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      ds.data.forEach((val, i) => {
        const x = pad.left + (i / (ds.data.length - 1)) * cw;
        const y = pad.top + ch - ((val - yMin) / yRange) * ch;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Border
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.strokeRect(pad.left, pad.top, cw, ch);
  }, [datasets, timeLabels, yMin, yMax]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas ref={canvasRef} width={800} height={350} className="oee-dashboard__chart-canvas" />
  );
};

// ============================================================
// MACHINE STATUS BAR
// ============================================================
const MachineStatusBar = () => {
  const segments = [
    { color: '#f44336', width: 30 },  // Red - downtime
    { color: '#f44336', width: 8 },
    { color: '#4caf50', width: 5 },   // Green - running
    { color: '#f44336', width: 4 },
    { color: '#4caf50', width: 10 },
    { color: '#2196f3', width: 3 },   // Blue
    { color: '#4caf50', width: 7 },
    { color: '#e0e0e0', width: 33 },  // Gray - idle/no data
  ];

  const timeLabels = ['20 Jan', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00', '21 Jan'];

  return (
    <div className="oee-dashboard__status-card">
      <div className="oee-dashboard__status-header">
        <span className="oee-dashboard__status-title">Machine Status</span>
        <span className="oee-dashboard__status-date">1/20/20</span>
      </div>
      <div className="oee-dashboard__status-bar-container">
        {segments.map((seg, i) => (
          <div
            key={i}
            className="oee-dashboard__status-segment"
            style={{ width: `${seg.width}%`, backgroundColor: seg.color }}
          />
        ))}
      </div>
      <div className="oee-dashboard__status-timeline">
        {timeLabels.map((lbl, i) => (
          <span key={i}>{lbl}</span>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// GENERATE CONVEYOR TEMPERATURE DATA
// ============================================================
const generateConveyorData = (count, base, variance) => {
  const data = [];
  let val = base;
  for (let i = 0; i < count; i++) {
    // Mostly flat with a small bump in the middle
    const mid = count / 2;
    const distFromMid = Math.abs(i - mid);
    const bump = Math.max(0, 0.15 - (distFromMid / count) * 0.3);
    val = base + bump + (Math.random() - 0.5) * variance;
    data.push(parseFloat(val.toFixed(3)));
  }
  return data;
};

// ============================================================
// MAIN OEE DASHBOARD COMPONENT
// ============================================================
const OeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('oee');

  // Conveyor temperature data
  const tempPointCount = 100;
  const conveyorTimeLabels = ['20. Jan', '04:00', '08:00', '12:00', '16:00', '21. Jan'];
  const conveyorDatasets = [
    { label: 'Conveyor 1', color: '#f44336', data: generateConveyorData(tempPointCount, 40.0, 0.04) },
    { label: 'Conveyor 2', color: '#4caf50', data: generateConveyorData(tempPointCount, 39.95, 0.03) },
    { label: 'Conveyor 3', color: '#1976d2', data: generateConveyorData(tempPointCount, 39.90, 0.04) },
  ];

  // Production output donut data
  const productionData = [
    { label: 'Rectangles (Counter) - Nu...', value: 45, color: '#37474f' },
    { label: 'Circles (Counter) - Nurem...', value: 27, color: '#78909c' },
  ];

  return (
    <div className="oee-dashboard">
      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Date Navigation */}
      <DateNavigation />

      {/* Content */}
      <div className="oee-dashboard__content">

        {/* KPI Row */}
        <div className="oee-dashboard__kpi-row">
          {/* Quality Rate - with gauge */}
          <div className="oee-dashboard__kpi-card">
            <div className="oee-dashboard__kpi-header">
              <span className="oee-dashboard__kpi-title">Quality rate</span>
              <span className="oee-dashboard__kpi-icon">📊</span>
            </div>
            <div className="oee-dashboard__kpi-date">1/20/20</div>
            <div className="oee-dashboard__kpi-body">
              <MiniGauge value={41.67} maxValue={100} size={100} />
            </div>
          </div>

          {/* Quality - large number */}
          <div className="oee-dashboard__kpi-card">
            <div className="oee-dashboard__kpi-header">
              <span className="oee-dashboard__kpi-title">Quality</span>
              <span className="oee-dashboard__kpi-icon">📊</span>
            </div>
            <div className="oee-dashboard__kpi-date">1/20/20</div>
            <div className="oee-dashboard__kpi-body" style={{ flexDirection: 'row' }}>
              <span style={{ fontSize: '28px', marginRight: '10px', color: '#ffc107' }}>◆</span>
              <span className="oee-dashboard__kpi-value">41.67</span>
            </div>
          </div>

          {/* Performance - with warning */}
          <div className="oee-dashboard__kpi-card">
            <div className="oee-dashboard__kpi-header">
              <span className="oee-dashboard__kpi-title">Performance</span>
              <span className="oee-dashboard__kpi-icon">📊</span>
            </div>
            <div className="oee-dashboard__kpi-date">1/20/20</div>
            <div className="oee-dashboard__kpi-body">
              <span className="oee-dashboard__kpi-warning oee-dashboard__kpi-warning--yellow">▲</span>
              <span className="oee-dashboard__kpi-value oee-dashboard__kpi-value--yellow">55.38</span>
            </div>
          </div>

          {/* Availability - with red alert border */}
          <div className="oee-dashboard__kpi-card oee-dashboard__kpi-card--alert">
            <div className="oee-dashboard__kpi-header">
              <span className="oee-dashboard__kpi-title">Availability</span>
              <span className="oee-dashboard__kpi-icon">📊</span>
            </div>
            <div className="oee-dashboard__kpi-date">1/20/20</div>
            <div className="oee-dashboard__kpi-body" style={{ flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="oee-dashboard__kpi-warning oee-dashboard__kpi-warning--red">▲</span>
                <span className="oee-dashboard__kpi-value oee-dashboard__kpi-value--red">8.66</span>
              </div>
              <div className="oee-dashboard__kpi-sub-values">
                <span>8.66</span>
                <span>0</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </div>

        {/* Machine Status */}
        <MachineStatusBar />

        {/* Bottom Row: Production Output + Conveyor Temperature */}
        <div className="oee-dashboard__bottom-row">
          {/* Production Output */}
          <div className="oee-dashboard__production-card">
            <div className="oee-dashboard__production-header">
              <span className="oee-dashboard__production-title">Production Output</span>
              <span className="oee-dashboard__kpi-icon">📊</span>
            </div>
            <div className="oee-dashboard__kpi-date" style={{ marginBottom: '8px' }}>1/20/20</div>
            <div className="oee-dashboard__production-body">
              <DonutChart
                data={productionData}
                centerValue={72}
                centerLabel="pieces"
                size={140}
              />
              <div className="oee-dashboard__production-legend">
                {productionData.map((d, i) => (
                  <div key={i} className="oee-dashboard__legend-item">
                    <div className="oee-dashboard__legend-dot" style={{ backgroundColor: d.color }} />
                    <span>{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Conveyor Temperature */}
          <div className="oee-dashboard__conveyor-card">
            <div className="oee-dashboard__conveyor-header">
              <span className="oee-dashboard__conveyor-title">Conveyor temperature</span>
              <span className="oee-dashboard__kpi-icon">📊</span>
            </div>
            <div className="oee-dashboard__kpi-date" style={{ marginBottom: '8px' }}>1/20/20</div>
            <div className="oee-dashboard__chart-wrapper">
              <ConveyorLineChart
                datasets={conveyorDatasets}
                timeLabels={conveyorTimeLabels}
                yMin={39.75}
                yMax={40.25}
              />
            </div>
            <div className="oee-dashboard__conveyor-legend">
              {conveyorDatasets.map((ds, i) => (
                <div key={i} className="oee-dashboard__conveyor-legend-item">
                  <div className="oee-dashboard__conveyor-legend-dot" style={{ backgroundColor: ds.color }} />
                  <span>{ds.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OeeDashboard;
