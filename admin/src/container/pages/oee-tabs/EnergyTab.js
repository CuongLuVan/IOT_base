import React, { useCallback, useEffect, useRef } from 'react';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import WarningIcon from '@material-ui/icons/Warning';

const RadialGaugeChart = ({ value, color }) => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const center = canvas.width / 2;
    const radius = 42;
    const start = -Math.PI / 2;
    const end = start + (value / 100) * 2 * Math.PI;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 11;
    context.beginPath();
    context.arc(center, center, radius, 0, 2 * Math.PI);
    context.strokeStyle = '#edf1f3';
    context.stroke();
    context.beginPath();
    context.arc(center, center, radius, start, end);
    context.strokeStyle = color;
    context.stroke();
    context.fillStyle = '#28363c';
    context.textAlign = 'center';
    context.font = '16px Segoe UI, Arial, sans-serif';
    context.fillText(value.toFixed(2), center, center + 4);
    context.fillStyle = '#738187';
    context.font = '9px Segoe UI, Arial, sans-serif';
    context.fillText('%', center, center + 17);
  }, [color, value]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="130"
      height="130"
      aria-label={`${value} percent radial gauge`}
    />
  );
};

const SparklineChart = ({ values }) => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = 3;
    const xFor = (index) =>
      padding + ((width - padding * 2) * index) / (values.length - 1);
    const yFor = (value) =>
      height -
      padding -
      ((value - min) / (max - min || 1)) * (height - padding * 2);
    context.clearRect(0, 0, width, height);
    context.beginPath();
    context.moveTo(0, height - 4);
    context.lineTo(width, height - 4);
    context.strokeStyle = '#d8e4ea';
    context.stroke();
    context.beginPath();
    values.forEach((value, index) => {
      if (index === 0) context.moveTo(xFor(index), yFor(value));
      else context.lineTo(xFor(index), yFor(value));
    });
    context.strokeStyle = '#6ba4c5';
    context.lineWidth = 1.5;
    context.lineJoin = 'round';
    context.stroke();
  }, [values]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="260"
      height="58"
      aria-label="KPI sparkline chart"
    />
  );
};

const GanttTimelineChart = () => {
  const canvasRef = useRef(null);
  const rows = [
    [
      'Overview',
      [
        [8, 8, '#99c31c'],
        [18, 9, '#6abf20'],
        [30, 7, '#f55655'],
        [40, 12, '#63b3b2'],
        [55, 8, '#95bd21'],
        [67, 8, '#6eb936'],
        [78, 10, '#5ab9b5'],
        [92, 5, '#fa5858'],
      ],
    ],
    [
      'Failure A',
      [
        [26, 4, '#f34c59'],
        [45, 4, '#f34c59'],
        [64, 4, '#f34c59'],
        [82, 4, '#f34c59'],
        [97, 2, '#f34c59'],
      ],
    ],
    [
      'Break',
      [
        [22, 4, '#4eb5b3'],
        [39, 4, '#4eb5b3'],
        [57, 4, '#4eb5b3'],
        [76, 4, '#4eb5b3'],
        [94, 4, '#4eb5b3'],
      ],
    ],
    [
      'Working A',
      [
        [12, 4, '#6bbf25'],
        [31, 4, '#6bbf25'],
        [50, 4, '#6bbf25'],
        [69, 4, '#6bbf25'],
        [88, 4, '#6bbf25'],
      ],
    ],
    [
      'Working B',
      [
        [16, 4, '#718e22'],
        [34, 4, '#718e22'],
        [53, 4, '#718e22'],
        [72, 4, '#718e22'],
        [90, 4, '#718e22'],
      ],
    ],
  ];
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 5, right: 6, bottom: 20, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const rowHeight = (height - padding.top - padding.bottom) / rows.length;
    context.clearRect(0, 0, width, height);
    context.font = '10px Segoe UI, Arial, sans-serif';
    rows.forEach(([name, segments], rowIndex) => {
      const y = padding.top + rowIndex * rowHeight;
      context.fillStyle = '#3b4b52';
      context.textAlign = 'right';
      context.fillText(name, padding.left - 7, y + rowHeight / 2 + 3);
      context.fillStyle = '#f3f6f7';
      context.fillRect(padding.left, y + 2, chartWidth, rowHeight - 4);
      segments.forEach(([start, duration, color]) => {
        context.fillStyle = color;
        context.fillRect(
          padding.left + (start / 100) * chartWidth,
          y + 3,
          (duration / 100) * chartWidth,
          rowHeight - 6
        );
      });
    });
    ['00:00', '06:00', '12:00', '18:00', '00:00'].forEach(
      (label, index, labels) => {
        const x = padding.left + (chartWidth * index) / (labels.length - 1);
        context.strokeStyle = '#e4eaec';
        context.beginPath();
        context.moveTo(x, padding.top);
        context.lineTo(x, height - padding.bottom);
        context.stroke();
        context.fillStyle = '#89969b';
        context.textAlign = 'center';
        context.fillText(label, x, height - 5);
      }
    );
  }, [rows]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="820"
      height="210"
      aria-label="Machine state Gantt timeline chart"
    />
  );
};

const StackedSegmentedBarChart = () => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const segments = [
      ['#ef4554', 24],
      ['#50b5b4', 22],
      ['#6abc28', 27],
      ['#7b941f', 27],
    ];
    const bar = { x: 14, y: 8, width: 15, height: 156 };
    context.clearRect(0, 0, canvas.width, canvas.height);
    let y = bar.y;
    segments.forEach(([color, percent]) => {
      const segmentHeight = (percent / 100) * bar.height;
      context.fillStyle = color;
      context.fillRect(bar.x, y, bar.width, segmentHeight);
      y += segmentHeight;
    });
    context.strokeStyle = '#dfe5e7';
    context.strokeRect(bar.x, bar.y, bar.width, bar.height);
  }, []);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="46"
      height="174"
      aria-label="Machine state stacked segmented bar chart"
    />
  );
};

const Gauge = ({ title, value, color, sparkline }) => (
  <article className="energy-dashboard__gauge-card">
    <div className="energy-tab__heading">
      <strong>{title}</strong>
      <small>1/20/20</small>
    </div>
    <div className="energy-dashboard__gauge energy-dashboard__radial-canvas">
      <RadialGaugeChart value={value} color={color} />
    </div>
    <div className="energy-dashboard__sparkline">
      <SparklineChart values={sparkline} />
    </div>
    <div className="energy-dashboard__gauge-footer">
      <strong>{value.toFixed(2)}%</strong>
      <span>+</span>
    </div>
  </article>
);

class EnergyTab extends React.Component {
  render() {
    const gauges = [
      ['OEE', 39.28, '#63be35', [40, 56, 37, 49, 31, 61, 40, 53, 34, 57]],
      [
        'Availability',
        76.77,
        '#f7c915',
        [79, 58, 77, 59, 75, 55, 80, 62, 77, 59],
      ],
      [
        'Performance',
        52.63,
        '#ef4248',
        [48, 53, 50, 58, 49, 54, 51, 61, 52, 57],
      ],
      ['Quality', 97.22, '#63bd38', [96, 97, 97, 98, 96, 98, 97, 98, 97, 97]],
    ];
    return (
      <section className="energy-dashboard">
        <header className="energy-dashboard__header">
          <div>
            <span>Selected Analysis:</span>
            <div className="energy-dashboard__analysis-tabs">
              <button type="button" className="is-active">
                OEE Overview
              </button>
              <button type="button">Sub Assets Analysis</button>
            </div>
          </div>
          <div className="energy-dashboard__date">
            <span>Date</span>
            <b>18/8/21</b>
            <CalendarTodayIcon fontSize="small" />
          </div>
        </header>
        <div className="energy-dashboard__section-title">KPIs</div>
        <div className="energy-dashboard__kpi-layout">
          <div className="energy-dashboard__gauge-grid">
            {gauges.map(([title, value, color, sparkline]) => (
              <Gauge
                key={title}
                title={title}
                value={value}
                color={color}
                sparkline={sparkline}
              />
            ))}
          </div>
          <article className="energy-dashboard__other-kpis">
            <strong>Other KPI's</strong>
            {[
              ['PEP', '31.1%', '29.85%'],
              ['MTTR', '52 sec', '59 mins 59 secs'],
              ['MTBF', '2 hrs 55 mins', '2 hrs 48 mins'],
            ].map(([name, current, previous], index) => (
              <div className="energy-dashboard__mini-kpi" key={name}>
                <strong>{name}</strong>
                <div>
                  {index === 2 ? (
                    <WarningIcon className="energy-dashboard__warning" />
                  ) : (
                    <i
                      className={`energy-tab__dot energy-tab__dot--${index}`}
                    />
                  )}
                  Current <b>{current}</b>
                </div>
                <div>
                  Previous <b>{previous}</b>
                </div>
              </div>
            ))}
          </article>
        </div>
        <div className="energy-dashboard__section-title">Machine State</div>
        <article className="energy-dashboard__state-card">
          <div className="energy-dashboard__state-title">State over time</div>
          <div className="energy-dashboard__state-content">
            <div className="energy-dashboard__gantt">
              <GanttTimelineChart />
            </div>
            <aside className="energy-dashboard__distribution">
              <strong>State Distribution</strong>
              <StackedSegmentedBarChart />
              <div className="energy-dashboard__distribution-list">
                {['Failure A', 'Break', 'Working A', 'Working B'].map(
                  (name, index) => (
                    <span key={name}>
                      <i
                        className={
                          ['failure', 'break', 'working-a', 'working-b'][index]
                        }
                      />
                      {name}
                      <b>4:59:59</b>
                    </span>
                  )
                )}
              </div>
            </aside>
          </div>
        </article>
      </section>
    );
  }
}

export default EnergyTab;
