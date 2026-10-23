import React, { useCallback, useEffect, useRef } from 'react';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';
import SearchIcon from '@material-ui/icons/Search';
import WarningIcon from '@material-ui/icons/Warning';

const Heading = ({ title }) => (
  <div className="oee-dashboard__card-heading">
    <div>
      <strong>{title}</strong>
      <small>1/20/20</small>
    </div>
    <SearchIcon fontSize="small" />
  </div>
);

const QualityGaugeChart = ({ value }) => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 13;
    const radius = 53;
    const start = Math.PI;
    const percent = value / 100;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 12;
    context.lineCap = 'butt';
    context.beginPath();
    context.arc(centerX, centerY, radius, Math.PI, 2 * Math.PI);
    context.strokeStyle = '#edf1f3';
    context.stroke();
    [
      { from: 0, to: 0.42, color: '#43b463' },
      { from: 0.42, to: 0.68, color: '#a6c84d' },
      { from: 0.68, to: 0.84, color: '#ffc400' },
      { from: 0.84, to: 1, color: '#ef4d46' },
    ].forEach((segment) => {
      if (percent <= segment.from) return;
      context.beginPath();
      context.arc(
        centerX,
        centerY,
        radius,
        start + segment.from * Math.PI,
        start + Math.min(segment.to, percent) * Math.PI
      );
      context.strokeStyle = segment.color;
      context.stroke();
    });
    const needleAngle = start + percent * Math.PI;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(
      centerX + 35 * Math.cos(needleAngle),
      centerY + 35 * Math.sin(needleAngle)
    );
    context.strokeStyle = '#39434a';
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(centerX, centerY, 4, 0, 2 * Math.PI);
    context.fillStyle = '#39434a';
    context.fill();
    context.fillStyle = '#29353b';
    context.font = '12px Segoe UI, Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(value.toFixed(2), centerX, canvas.height - 1);
  }, [value]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="180"
      height="105"
      aria-label="Quality rate gauge chart"
    />
  );
};

const StatusTimelineChart = () => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 8, right: 13, bottom: 21, left: 13 };
    const chartWidth = width - padding.left - padding.right;
    const blocks = [
      [0, 36, '#ff0b0b'],
      [36, 1, '#17b642'],
      [37, 1, '#00a9a7'],
      [38, 4, '#1bae38'],
    ];
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#f8fafb';
    context.fillRect(padding.left, padding.top, chartWidth, 18);
    blocks.forEach(([start, length, color]) => {
      context.fillStyle = color;
      context.fillRect(
        padding.left + (start / 100) * chartWidth,
        padding.top,
        (length / 100) * chartWidth,
        18
      );
    });
    [
      '20. Jan',
      '03:00',
      '06:00',
      '09:00',
      '12:00',
      '15:00',
      '18:00',
      '21:00',
      '21. Jan',
    ].forEach((label, index, labels) => {
      const x = padding.left + (chartWidth * index) / (labels.length - 1);
      context.strokeStyle = '#e8edef';
      context.beginPath();
      context.moveTo(x, padding.top);
      context.lineTo(x, padding.top + 18);
      context.stroke();
      context.fillStyle = '#78868d';
      context.font = '9px Segoe UI, Arial, sans-serif';
      context.textAlign =
        index === 0 ? 'left' : index === labels.length - 1 ? 'right' : 'center';
      context.fillText(label, x, height - 5);
    });
  }, []);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="980"
      height="60"
      aria-label="Machine status timeline chart"
    />
  );
};

const SegmentedArcChart = () => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height - 8;
    const radius = 65;
    let angle = Math.PI;
    context.clearRect(0, 0, canvas.width, canvas.height);
    [
      { value: 45, color: '#147582' },
      { value: 27, color: '#4db3af' },
    ].forEach((segment) => {
      const next = angle + (segment.value / 72) * Math.PI;
      context.beginPath();
      context.arc(centerX, centerY, radius, angle, next);
      context.lineWidth = 20;
      context.strokeStyle = segment.color;
      context.stroke();
      angle = next;
    });
    context.fillStyle = '#29353b';
    context.textAlign = 'center';
    context.font = '20px Segoe UI, Arial, sans-serif';
    context.fillText('72', centerX, centerY - 10);
    context.fillStyle = '#7c898f';
    context.font = '10px Segoe UI, Arial, sans-serif';
    context.fillText('pieces', centerX, centerY + 5);
  }, []);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="220"
      height="155"
      aria-label="Production output segmented donut chart"
    />
  );
};

const ConveyorLineChart = () => {
  const canvasRef = useRef(null);
  const datasets = [
    {
      color: '#097b88',
      values: [40, 40, 40, 40, 40, 40, 40.02, 40.2, 40.03, 40, 40, 40],
    },
    {
      color: '#48afa8',
      values: [40, 40, 40, 40, 40, 40, 40.1, 40.04, 40, 40, 40, 40],
    },
    {
      color: '#255d6c',
      values: [40, 40, 40, 40, 40, 40, 39.99, 40.02, 40.12, 40, 40, 40],
    },
  ];
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 8, right: 12, bottom: 28, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const low = 39.75;
    const high = 40.25;
    const yFor = (value) =>
      padding.top + chartHeight - ((value - low) / (high - low)) * chartHeight;
    context.clearRect(0, 0, width, height);
    context.font = '9px Segoe UI, Arial, sans-serif';
    [39.75, 40, 40.25].forEach((tick) => {
      const y = yFor(tick);
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = '#e8eef1';
      context.stroke();
      context.fillStyle = '#66737c';
      context.textAlign = 'right';
      context.fillText(String(tick), padding.left - 6, y + 3);
    });
    datasets.forEach((dataset) => {
      context.beginPath();
      dataset.values.forEach((value, index) => {
        const x =
          padding.left + (chartWidth * index) / (dataset.values.length - 1);
        if (index === 0) context.moveTo(x, yFor(value));
        else context.lineTo(x, yFor(value));
      });
      context.strokeStyle = dataset.color;
      context.lineWidth = 2;
      context.stroke();
    });
    ['20. Jan', '04:00', '08:00', '12:00', '16:00', '21. Jan'].forEach(
      (label, index, labels) => {
        const x = padding.left + (chartWidth * index) / (labels.length - 1);
        context.fillStyle = '#66737c';
        context.textAlign = 'center';
        context.fillText(label, x, height - 14);
      }
    );
    context.fillText('Time', width / 2, height - 2);
  }, [datasets]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="820"
      height="220"
      aria-label="Conveyor temperature line chart"
    />
  );
};

const Metric = ({ title, value, alert, gauge }) => (
  <article
    className={`oee-dashboard__metric-card ${
      alert ? 'oee-dashboard__metric-card--alert' : ''
    }`}
  >
    <Heading title={title} />
    {gauge ? (
      <div className="oee-dashboard__gauge oee-tab__quality-gauge">
        <QualityGaugeChart value={Number(value)} />
      </div>
    ) : alert ? (
      <>
        <div className="oee-dashboard__availability">
          <WarningIcon />
          <strong>{value}</strong>
        </div>
        <div className="oee-dashboard__availability-scale">
          <span>8.66</span>
          <span>0</span>
          <span>100</span>
        </div>
      </>
    ) : (
      <>
        <div className="oee-dashboard__metric-value">
          <span
            className={
              title === 'Quality' ? 'oee-dashboard__quality-marker' : ''
            }
          />
          {value}
        </div>
        <ArrowForwardIcon className="oee-dashboard__metric-arrow" />
      </>
    )}
  </article>
);

class OeeTab extends React.Component {
  render() {
    const production = [
      { label: 'Rectangles (Counter) - Nuremberg', color: '#147582' },
      { label: 'Circles (Counter) - Nuremberg', color: '#4db3af' },
    ];
    return (
      <section className="oee-tab">
        <section className="oee-dashboard__kpi-row">
          <Metric title="Quality rate" value="41.67" gauge />
          <Metric title="Quality" value="41.67" />
          <Metric title="Performance" value="55.38" />
          <Metric title="Availability" value="8.66" alert />
        </section>
        <section className="oee-dashboard__status-card">
          <Heading title="Machine Status" />
          <div className="oee-dashboard__status-timeline-canvas">
            <StatusTimelineChart />
          </div>
        </section>
        <section className="oee-dashboard__charts-row">
          <article className="oee-dashboard__output-card">
            <Heading title="Production Output" />
            <div className="oee-tab__arc-chart">
              <SegmentedArcChart />
            </div>
            <div className="oee-dashboard__legend oee-dashboard__legend--vertical">
              {production.map((item) => (
                <span key={item.label}>
                  <i style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </article>
          <article className="oee-dashboard__temperature-card">
            <Heading title="Conveyor temperature" />
            <div className="oee-tab__line-chart">
              <ConveyorLineChart />
            </div>
            <div className="oee-dashboard__legend">
              <span>
                <i style={{ background: '#097b88' }} />
                Conveyor 1
              </span>
              <span>
                <i style={{ background: '#48afa8' }} />
                Conveyor 2
              </span>
              <span>
                <i style={{ background: '#255d6c' }} />
                Conveyor 3
              </span>
            </div>
          </article>
        </section>
      </section>
    );
  }
}

export default OeeTab;
