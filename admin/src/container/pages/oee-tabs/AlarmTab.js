import React, { useCallback, useEffect, useRef } from 'react';
import WarningIcon from '@material-ui/icons/Warning';

const AlarmTrendChart = ({ values, color, yMin, yMax, yTicks, fill }) => {
  const canvasRef = useRef(null);
  const xLabels = ['13:00', '15:00', '17:00', '19:00', '21:00'];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 10, right: 8, bottom: 25, left: 33 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const xFor = (index) =>
      padding.left + (chartWidth * index) / (values.length - 1);
    const yFor = (value) =>
      padding.top +
      chartHeight -
      ((value - yMin) / (yMax - yMin)) * chartHeight;

    context.clearRect(0, 0, width, height);
    context.font = '10px Segoe UI, Arial, sans-serif';
    context.lineWidth = 1;

    yTicks.forEach((tick) => {
      const y = yFor(tick);
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = '#e8eaf0';
      context.stroke();
      context.fillStyle = '#5c5870';
      context.textAlign = 'right';
      context.fillText(String(tick), padding.left - 6, y + 3);
    });

    xLabels.forEach((label, index) => {
      const x = padding.left + (chartWidth * index) / (xLabels.length - 1);
      context.fillStyle = '#6c697a';
      context.textAlign = 'center';
      context.fillText(label, x, height - 6);
    });

    if (fill) {
      const gradient = context.createLinearGradient(
        0,
        padding.top,
        0,
        padding.top + chartHeight
      );
      gradient.addColorStop(0, 'rgba(117, 104, 232, .38)');
      gradient.addColorStop(1, 'rgba(117, 104, 232, 0)');
      context.beginPath();
      values.forEach((value, index) => {
        if (index === 0) context.moveTo(xFor(index), yFor(value));
        else context.lineTo(xFor(index), yFor(value));
      });
      context.lineTo(xFor(values.length - 1), padding.top + chartHeight);
      context.lineTo(xFor(0), padding.top + chartHeight);
      context.closePath();
      context.fillStyle = gradient;
      context.fill();
    }

    context.beginPath();
    values.forEach((value, index) => {
      if (index === 0) context.moveTo(xFor(index), yFor(value));
      else context.lineTo(xFor(index), yFor(value));
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();
  }, [color, fill, values, yMax, yMin, yTicks]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="alarm-dashboard__trend">
      <canvas
        ref={canvasRef}
        width="390"
        height="155"
        aria-label="Alarm trend chart"
      />
    </div>
  );
};

const SpeedometerChart = ({ value, min = 0, max = 6 }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height - 22;
    const radius = Math.min(width / 2 - 24, height - 34);
    const startAngle = Math.PI;
    const percent = Math.max(0, Math.min((value - min) / (max - min), 1));

    context.clearRect(0, 0, width, height);
    context.lineCap = 'butt';
    context.lineWidth = 15;

    [
      { start: 0, end: 0.38, color: '#d84156' },
      { start: 0.4, end: 0.58, color: '#f3bd48' },
      { start: 0.6, end: 0.88, color: '#32a967' },
    ].forEach((segment) => {
      context.beginPath();
      context.arc(
        centerX,
        centerY,
        radius,
        startAngle + segment.start * Math.PI,
        startAngle + segment.end * Math.PI
      );
      context.strokeStyle = segment.color;
      context.stroke();
    });

    context.beginPath();
    context.arc(
      centerX,
      centerY,
      radius,
      startAngle + 0.9 * Math.PI,
      2 * Math.PI
    );
    context.strokeStyle = '#e9edf0';
    context.stroke();

    for (let index = 0; index <= 6; index += 1) {
      const angle = startAngle + (index / 6) * Math.PI;
      const outer = radius + 11;
      const inner = radius + 4;
      context.beginPath();
      context.moveTo(
        centerX + inner * Math.cos(angle),
        centerY + inner * Math.sin(angle)
      );
      context.lineTo(
        centerX + outer * Math.cos(angle),
        centerY + outer * Math.sin(angle)
      );
      context.lineWidth = 1;
      context.strokeStyle = '#a9b3b8';
      context.stroke();
    }

    const needleAngle = startAngle + percent * Math.PI;
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.lineTo(
      centerX + (radius - 24) * Math.cos(needleAngle),
      centerY + (radius - 24) * Math.sin(needleAngle)
    );
    context.lineWidth = 3;
    context.strokeStyle = '#4d5d6e';
    context.stroke();
    context.beginPath();
    context.arc(centerX, centerY, 6, 0, 2 * Math.PI);
    context.fillStyle = '#65768a';
    context.fill();
  }, [max, min, value]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="320"
      height="175"
      aria-label="Pressure speedometer chart"
    />
  );
};
const FilledBarChart = ({ value, min = 20, max = 100 }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 12, right: 72, bottom: 10, left: 57 };
    const barWidth = 96;
    const chartHeight = height - padding.top - padding.bottom;
    const percent = Math.max(0, Math.min((value - min) / (max - min), 1));
    const barX = padding.left + 22;
    const barY = padding.top;
    const fillHeight = chartHeight * percent;
    const fillY = barY + chartHeight - fillHeight;

    context.clearRect(0, 0, width, height);
    context.font = '11px Segoe UI, Arial, sans-serif';
    context.textAlign = 'right';

    [100, 80, 60, 40, 20].forEach((tick) => {
      const tickPercent = (tick - min) / (max - min);
      const y = barY + chartHeight - chartHeight * tickPercent;
      context.fillStyle = '#66627b';
      context.fillText(`${tick}%`, padding.left - 7, y + 4);
      context.beginPath();
      context.moveTo(barX, y);
      context.lineTo(barX + barWidth, y);
      context.strokeStyle = '#e9eaf0';
      context.lineWidth = 1;
      context.stroke();
    });

    context.fillStyle = '#f4f4f6';
    context.fillRect(barX, barY, barWidth, chartHeight);
    const gradient = context.createLinearGradient(
      0,
      fillY,
      0,
      barY + chartHeight
    );
    gradient.addColorStop(0, '#a098ee');
    gradient.addColorStop(1, '#5b4be9');
    context.fillStyle = gradient;
    context.fillRect(barX, fillY, barWidth, fillHeight);

    context.beginPath();
    context.moveTo(barX + barWidth + 10, fillY);
    context.lineTo(barX + barWidth + 17, fillY - 5);
    context.lineTo(barX + barWidth + 17, fillY + 5);
    context.closePath();
    context.fillStyle = '#423c59';
    context.fill();
    context.textAlign = 'left';
    context.fillText(`${value}%`, barX + barWidth + 22, fillY + 4);
  }, [max, min, value]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="320"
      height="175"
      aria-label="Oil level filled bar chart"
    />
  );
};

const Card = ({ title, status, critical, value, description, children }) => (
  <article className="alarm-dashboard__card">
    <header>
      <h2>{title}</h2>
      {status && (
        <span
          className={`alarm-dashboard__status ${
            critical
              ? 'alarm-dashboard__status--critical'
              : 'alarm-dashboard__status--normal'
          }`}
        >
          {status}
        </span>
      )}
    </header>
    {children}
    <div className="alarm-dashboard__value">{value}</div>
    <p>{description}</p>
  </article>
);

class AlarmTab extends React.Component {
  render() {
    return (
      <section className="alarm-dashboard">
        <div className="alarm-dashboard__grid">
          <Card
            title="Vibration RMS"
            status="Critical"
            critical
            value="8.5 mm/s"
            description="Average RMS (last 8 hrs)"
          >
            <AlarmTrendChart
              values={[7, 8.5, 8.2, 7.3, 7.9, 9.7, 10.8, 11, 12.1, 13.6]}
              color="#7771d7"
              yMin={0}
              yMax={15}
              yTicks={[0, 5, 10, 15]}
              fill
            />
          </Card>
          <Card
            title="Temperature"
            status="Normal"
            value="67 C"
            description="Average Temp. (last 8 hrs)"
          >
            <AlarmTrendChart
              values={[48, 53, 55, 58, 64, 69, 72, 73, 72, 67]}
              color="#bd2170"
              yMin={30}
              yMax={90}
              yTicks={[30, 50, 70, 90]}
            />
          </Card>
          <Card
            title="Pressure"
            status="Within Range"
            value="4.5 bar"
            description="Average Pressure (last 8 hrs)"
          >
            <div className="alarm-dashboard__speedometer">
              <SpeedometerChart value={4.5} />
            </div>
          </Card>
          <Card
            title="Torque"
            status="Normal"
            value="82%"
            description="Average Torque Load (last 8 hrs)"
          >
            <div className="alarm-dashboard__torque">
              <span>82%</span>
            </div>
          </Card>
          <Card
            title="Current"
            value="7.7 amps"
            description="Average Current (last 8 hrs)"
          >
            <AlarmTrendChart
              values={[10, 11, 21, 27, 25, 14, 6, 4, 8, 16, 17, 13, 11, 17]}
              color="#4f499c"
              yMin={0}
              yMax={30}
              yTicks={[0, 10, 20, 30]}
            />
          </Card>
          <Card
            title="Oil Level"
            value="82%"
            description="Current Oil Level (36 hrs remaining)"
          >
            <div className="alarm-dashboard__oil-chart">
              <FilledBarChart value={82} />
            </div>
          </Card>
        </div>
        <span className="alarm-tab__accessible">
          <WarningIcon /> Live alarm status
        </span>
      </section>
    );
  }
}

export default AlarmTab;
