import React, { useEffect, useRef, useCallback } from 'react';
import './LineOeeDashboard.css';

// ============================================================
// GAUGE COMPONENT - Semi-circular with green→yellow→red
// ============================================================
const OeeGauge = ({ value, maxValue = 100, title, size = 160 }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h - 10;
    const r = Math.min(w, h) * 0.62;
    const pct = Math.min(value / maxValue, 1);
    const startA = Math.PI;

    ctx.clearRect(0, 0, w, h);

    // Draw full background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, 2 * Math.PI);
    ctx.lineWidth = 22;
    ctx.strokeStyle = '#e8e8e8';
    ctx.stroke();

    // Colored gradient segments (green → yellow → orange → red)
    const segs = [
      { s: 0.0, e: 0.25, c: '#4caf50' },
      { s: 0.25, e: 0.45, c: '#8bc34a' },
      { s: 0.45, e: 0.60, c: '#cddc39' },
      { s: 0.60, e: 0.75, c: '#ffc107' },
      { s: 0.75, e: 0.88, c: '#ff9800' },
      { s: 0.88, e: 1.0, c: '#f44336' },
    ];

    // Draw full colored arc (like the reference image shows full arc colored)
    segs.forEach(seg => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startA + seg.s * Math.PI, startA + seg.e * Math.PI);
      ctx.lineWidth = 22;
      ctx.strokeStyle = seg.c;
      ctx.lineCap = 'butt';
      ctx.stroke();
    });

    // Draw outer ring (yellow/gold)
    ctx.beginPath();
    ctx.arc(cx, cy, r + 14, startA, 2 * Math.PI);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffc107';
    ctx.stroke();

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = startA + (i / 10) * Math.PI;
      const ir = r - 14;
      const or2 = r + 10;
      ctx.beginPath();
      ctx.moveTo(cx + ir * Math.cos(angle), cy + ir * Math.sin(angle));
      ctx.lineTo(cx + or2 * Math.cos(angle), cy + or2 * Math.sin(angle));
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.strokeStyle = '#999';
      ctx.stroke();
    }

    // Needle
    const needleAngle = startA + pct * Math.PI;
    const nl = r - 20;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + nl * Math.cos(needleAngle), cy + nl * Math.sin(needleAngle));
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
  }, [value, maxValue]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="line-oee__gauge-card">
      <div className="line-oee__gauge-title">{title}</div>
      <div className="line-oee__gauge-wrapper" style={{ width: size, height: size * 0.65 }}>
        <canvas
          ref={canvasRef}
          width={size * 2}
          height={size * 1.3}
          className="line-oee__gauge-canvas"
        />
        <div className="line-oee__gauge-value">{value}</div>
      </div>
      <div className="line-oee__gauge-scale">
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
};

// ============================================================
// BAR CHART COMPONENT (Vertical)
// ============================================================
const BarChart = ({ data, title, legend, yMax, yStep = 10, barWidth = 0.6 }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const pad = { top: 15, right: 20, bottom: 60, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    // Y-axis grid & labels
    ctx.strokeStyle = '#eee';
    ctx.lineWidth = 0.5;
    for (let yVal = 0; yVal <= yMax; yVal += yStep) {
      const y = pad.top + ch - (yVal / yMax) * ch;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toLocaleString(), pad.left - 6, y + 4);
    }

    // Draw bars
    const barGroupWidth = cw / data.length;
    data.forEach((item, i) => {
      const barW = barGroupWidth * barWidth;
      const barH = (item.value / yMax) * ch;
      const x = pad.left + i * barGroupWidth + (barGroupWidth - barW) / 2;
      const y = pad.top + ch - barH;

      // Bar fill
      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, barW, barH);

      // X-axis label
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const labelX = pad.left + i * barGroupWidth + barGroupWidth / 2;

      // Wrap long labels
      const words = item.label.split(' ');
      let line = '';
      let lineY = pad.top + ch + 14;
      words.forEach(word => {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > barGroupWidth - 4 && line) {
          ctx.fillText(line, labelX, lineY);
          line = word;
          lineY += 12;
        } else {
          line = test;
        }
      });
      ctx.fillText(line, labelX, lineY);
    });

    // Axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ch);
    ctx.lineTo(w - pad.right, pad.top + ch);
    ctx.stroke();
  }, [data, yMax, yStep, barWidth]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="line-oee__chart-card">
      <div className="line-oee__chart-title">{title}</div>
      {legend && (
        <div className="line-oee__chart-legend">
          {legend.map((item, i) => (
            <div key={i} className="line-oee__legend-item">
              <div className="line-oee__legend-dot" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="line-oee__chart-container">
        <canvas ref={canvasRef} width={800} height={400} className="line-oee__chart-canvas" />
      </div>
    </div>
  );
};

// ============================================================
// DATA TABLE COMPONENT
// ============================================================
const DataTable = ({ title, columns, rows }) => (
  <div className="line-oee__table-card">
    <div className="line-oee__table-title">{title}</div>
    <table className="line-oee__table">
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ============================================================
// MAIN DASHBOARD
// ============================================================
const LineOeeDashboard = () => {
  // === Gauge data ===
  const gauges = [
    { title: 'OEE', value: 68.76 },
    { title: 'Performance', value: 81.8 },
    { title: 'Availability', value: 85.42 },
    { title: 'Quality', value: 98.4 },
  ];

  // === Downtime Summary data ===
  const downtimeData = [
    { label: 'Material Shortage', value: 20, color: '#1565c0' },
    { label: 'Technical Fault', value: 55, color: '#d32f2f' },
    { label: 'Operator Unavailable', value: 8, color: '#e65100' },
    { label: 'Planned Power Outage', value: 8, color: '#2e7d32' },
    { label: 'Power Failure', value: 10, color: '#43a047' },
    { label: 'Equipment Upgrades', value: 8, color: '#c62828' },
  ];

  const downtimeLegend = downtimeData.map(d => ({ label: d.label, color: d.color }));

  // === Production Data ===
  const productionData = [
    { label: 'Total Good Units Produced', value: 45000, color: '#8b9a2f' },
    { label: 'Total Defective Units Produced', value: 2000, color: '#c62828' },
  ];

  const productionLegend = productionData.map(d => ({ label: d.label, color: d.color }));

  // === Underperforming Machines table ===
  const underperformingCols = ['Machine Name', 'Area', 'OEE (%)'];
  const underperformingRows = [
    ['P and P-74954', 'Assembly', '74.13'],
    ['PP-65804', 'Pressing', '75.55'],
    ['CSM-57436', 'Packaging', '76.77'],
    ['RA-76922', 'Assembly', '77.34'],
  ];

  // === Recent Downtime Events table ===
  const downtimeEventsCols = ['Machine Name', 'Downtime Start At', 'Downtime Duration (minutes)', 'Downtime Reason'];
  const downtimeEventsRows = [
    ['P and P-74954', '2025-04-02 14:45:00', '14', 'Technical Fault'],
    ['CSM-57436', '2025-04-02 14:22:00', '14', 'Technical Fault'],
    ['P and P-74954', '2025-04-02 13:57:00', '9', 'Equipment Upgrades'],
    ['HP-17505', '2025-04-02 12:48:00', '14', 'Technical Fault'],
  ];

  return (
    <div className="line-oee">
      {/* Header */}
      <div className="line-oee__header">
        <button className="line-oee__menu-btn">☰</button>
        <span className="line-oee__header-title">Line-1</span>
      </div>

      <div className="line-oee__content">
        {/* Gauge Row */}
        <div className="line-oee__gauge-row">
          {gauges.map((g, i) => (
            <OeeGauge key={i} title={g.title} value={g.value} />
          ))}
        </div>

        {/* Charts Row */}
        <div className="line-oee__charts-row">
          <BarChart
            title="Downtime Summary (minutes)"
            data={downtimeData}
            legend={downtimeLegend}
            yMax={60}
            yStep={10}
            barWidth={0.55}
          />
          <BarChart
            title="Production Data"
            data={productionData}
            legend={productionLegend}
            yMax={50000}
            yStep={5000}
            barWidth={0.45}
          />
        </div>

        {/* Tables Row */}
        <div className="line-oee__tables-row">
          <DataTable
            title="Top Underperforming Machines"
            columns={underperformingCols}
            rows={underperformingRows}
          />
          <DataTable
            title="Recent Downtime Events"
            columns={downtimeEventsCols}
            rows={downtimeEventsRows}
          />
        </div>
      </div>
    </div>
  );
};

export default LineOeeDashboard;
