import React, { useEffect, useRef, useCallback } from 'react';
import './MachineMonitoring.css';

// ============================================================
// GAUGE COMPONENT - Semi-circular speedometer gauge
// ============================================================
const GaugeChart = ({ value, maxValue, label, size = 180 }) => {
  const canvasRef = useRef(null);

  const drawGauge = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h - 15;
    const radius = Math.min(w, h) * 0.65;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const percentage = Math.min(value / maxValue, 1);

    ctx.clearRect(0, 0, w, h);

    // Draw background arc (dark gray)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 20;
    ctx.strokeStyle = '#333';
    ctx.stroke();

    // Draw colored arc segments: green -> yellow -> red
    const segments = [
      { start: 0, end: 0.33, color: '#4caf50' },
      { start: 0.33, end: 0.5, color: '#8bc34a' },
      { start: 0.5, end: 0.7, color: '#ffc107' },
      { start: 0.7, end: 0.85, color: '#ff9800' },
      { start: 0.85, end: 1, color: '#f44336' },
    ];

    segments.forEach(seg => {
      const segEnd = Math.min(seg.end, percentage);
      if (seg.start < percentage) {
        ctx.beginPath();
        ctx.arc(
          centerX, centerY, radius,
          startAngle + seg.start * Math.PI,
          startAngle + segEnd * Math.PI
        );
        ctx.lineWidth = 20;
        ctx.strokeStyle = seg.color;
        ctx.lineCap = 'butt';
        ctx.stroke();
      }
    });

    // Draw tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = startAngle + (i / 10) * Math.PI;
      const innerR = radius - 12;
      const outerR = radius + 14;
      const x1 = centerX + innerR * Math.cos(angle);
      const y1 = centerY + innerR * Math.sin(angle);
      const x2 = centerX + outerR * Math.cos(angle);
      const y2 = centerY + outerR * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = i % 5 === 0 ? 2.5 : 1;
      ctx.strokeStyle = '#888';
      ctx.stroke();
    }

    // Draw needle
    const needleAngle = startAngle + percentage * Math.PI;
    const needleLength = radius - 25;
    const needleX = centerX + needleLength * Math.cos(needleAngle);
    const needleY = centerY + needleLength * Math.sin(needleAngle);

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Draw outer ring around gauge
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 18, startAngle, endAngle);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffc107';
    ctx.stroke();
  }, [value, maxValue]);

  useEffect(() => {
    drawGauge();
  }, [drawGauge]);

  return (
    <div className="machine-dashboard__gauge-card">
      <div className="machine-dashboard__gauge-label">{label}</div>
      <div className="machine-dashboard__gauge-wrapper" style={{ width: size, height: size * 0.65 }}>
        <canvas
          ref={canvasRef}
          width={size * 2}
          height={size * 1.3}
          className="machine-dashboard__chart-canvas"
        />
        <div className="machine-dashboard__gauge-value">{value}</div>
      </div>
    </div>
  );
};

// ============================================================
// TOOL LIFE BAR COMPONENT - Vertical progress bar
// ============================================================
const ToolLifeBar = ({ name, value, maxValue }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  let levelClass = 'low';
  if (percentage > 70) levelClass = 'high';
  else if (percentage > 35) levelClass = 'medium';

  return (
    <div className="machine-dashboard__tool-bar-card">
      <div className="machine-dashboard__tool-bar-title">{name}</div>
      <div className="machine-dashboard__tool-bar-body">
        <div
          className={`machine-dashboard__tool-bar-fill machine-dashboard__tool-bar-fill--${levelClass}`}
          style={{ height: `${percentage}%` }}
        >
          <div className="machine-dashboard__tool-bar-value">{value}</div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// LINE CHART COMPONENT - Time-series chart with canvas
// ============================================================
const LineChart = ({ title, data, yMin, yMax, timeLabels }) => {
  const canvasRef = useRef(null);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const padding = { top: 20, right: 20, bottom: 50, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, w, h);

    // Grid lines - horizontal
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    const yRange = yMax - yMin;
    const yStep = yRange <= 20 ? 2 : 5;
    for (let yVal = yMin; yVal <= yMax; yVal += yStep) {
      const y = padding.top + chartH - ((yVal - yMin) / yRange) * chartH;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(yVal.toString(), padding.left - 8, y + 4);
    }

    // X-axis labels
    if (timeLabels && timeLabels.length > 0) {
      const labelStep = Math.max(1, Math.floor(timeLabels.length / 7));
      ctx.fillStyle = '#999';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (let i = 0; i < timeLabels.length; i += labelStep) {
        const x = padding.left + (i / (timeLabels.length - 1)) * chartW;
        ctx.fillText(timeLabels[i], x, h - padding.bottom + 20);

        // Vertical grid line
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartH);
        ctx.stroke();
      }
    }

    // Draw the data line
    if (data && data.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#76ff03';
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';

      data.forEach((val, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        const y = padding.top + chartH - ((val - yMin) / yRange) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Chart border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding.left, padding.top, chartW, chartH);
  }, [data, yMin, yMax, timeLabels]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  return (
    <div className="machine-dashboard__chart-card">
      <div className="machine-dashboard__chart-title">{title}</div>
      <div className="machine-dashboard__chart-container">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="machine-dashboard__chart-canvas"
        />
      </div>
    </div>
  );
};

// ============================================================
// GENERATE REALISTIC DATA - for the line charts
// ============================================================
const generateTimeSeriesData = (count, baseValue, volatility, trend = 0) => {
  const data = [];
  let current = baseValue;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * volatility + trend;
    current += change;
    data.push(parseFloat(current.toFixed(1)));
  }
  return data;
};

const generateTimeLabels = (startTime, count, intervalSeconds = 1) => {
  const labels = [];
  const [hours, minutes, seconds] = startTime.split(':').map(Number);
  let totalSec = hours * 3600 + minutes * 60 + seconds;

  for (let i = 0; i < count; i++) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    labels.push(
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    );
    totalSec += intervalSeconds;
  }
  return labels;
};

// ============================================================
// MAIN DASHBOARD COMPONENT
// ============================================================
const MachineMonitoring = () => {
  // Generate sample data similar to the reference image
  const dataPointCount = 200;
  const xAxisData = generateTimeSeriesData(dataPointCount, 50, 3, -0.02);
  const yAxisData = generateTimeSeriesData(dataPointCount, 65, 2.5, -0.03);
  const timeLabels = generateTimeLabels('12:47:30', dataPointCount, 1);

  // Tool life data
  const toolLifeData = [
    { name: 'Drill Tool', value: 1250, maxValue: 10000 },
    { name: 'Form Tool', value: 3000, maxValue: 5000 },
    { name: 'Cutoff Tool', value: 10000, maxValue: 50000 },
    { name: 'Shave Tool', value: 39000, maxValue: 50000 },
  ];

  return (
    <div className="machine-dashboard">
      {/* Header */}
      <div className="machine-dashboard__header">
        <h1 className="machine-dashboard__title">Machine #110 - Part #78TZ</h1>
      </div>

      {/* Top Section: Gauges + Tool Life */}
      <div className="machine-dashboard__top-section">
        {/* Gauge Charts */}
        <div className="machine-dashboard__gauges">
          <GaugeChart
            value={3631}
            maxValue={5000}
            label="Spindle RPM"
            size={180}
          />
          <GaugeChart
            value={1724}
            maxValue={3000}
            label="Spindle Load"
            size={180}
          />
        </div>

        {/* Tool Life Bars */}
        <div className="machine-dashboard__tool-life">
          <div className="machine-dashboard__tool-life-label">Tool Life</div>
          <div className="machine-dashboard__tool-bars">
            {toolLifeData.map((tool, index) => (
              <ToolLifeBar
                key={index}
                name={tool.name}
                value={tool.value}
                maxValue={tool.maxValue}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Line Charts */}
      <div className="machine-dashboard__bottom-section">
        <LineChart
          title="X-Axis Position"
          data={xAxisData}
          yMin={35}
          yMax={65}
          timeLabels={timeLabels}
        />
        <LineChart
          title="Y-Axis Position"
          data={yAxisData}
          yMin={52}
          yMax={70}
          timeLabels={timeLabels}
        />
      </div>
    </div>
  );
};

export default MachineMonitoring;
