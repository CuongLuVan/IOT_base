import React, { useCallback, useEffect, useRef } from 'react';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';

const drawLineChart = (
  context,
  width,
  height,
  values,
  labels,
  options = {}
) => {
  const {
    area = false,
    yTicks = [],
    yMin = 0,
    yMax = Math.max(...values),
  } = options;
  const padding = { top: 10, right: 10, bottom: 25, left: 39 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const xFor = (index) =>
    padding.left + (chartWidth * index) / (values.length - 1);
  const yFor = (value) =>
    padding.top + chartHeight - ((value - yMin) / (yMax - yMin)) * chartHeight;

  context.clearRect(0, 0, width, height);
  context.font = '9px Segoe UI, Arial, sans-serif';
  context.lineWidth = 1;
  yTicks.forEach((tick) => {
    const y = yFor(tick);
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.strokeStyle = '#e7eeee';
    context.stroke();
    context.textAlign = 'right';
    context.fillStyle = '#66757b';
    context.fillText(
      `${tick}${tick >= 1000 ? 'k' : ''}`,
      padding.left - 6,
      y + 3
    );
  });
  labels.forEach((label, index) => {
    const pointIndex = Math.round(
      (index * (values.length - 1)) / (labels.length - 1)
    );
    context.textAlign = 'center';
    context.fillStyle = '#748188';
    context.fillText(label, xFor(pointIndex), height - 5);
  });
  if (area) {
    const gradient = context.createLinearGradient(
      0,
      padding.top,
      0,
      padding.top + chartHeight
    );
    gradient.addColorStop(0, 'rgba(93, 207, 185, .34)');
    gradient.addColorStop(1, 'rgba(93, 207, 185, .04)');
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
  context.strokeStyle = '#5ccabb';
  context.lineWidth = 1.7;
  context.lineJoin = 'round';
  context.stroke();
};

const MotorLineChart = ({
  values,
  labels,
  area,
  yTicks,
  yMin,
  yMax,
  label,
}) => {
  const canvasRef = useRef(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawLineChart(
      canvas.getContext('2d'),
      canvas.width,
      canvas.height,
      values,
      labels,
      { area, yTicks, yMin, yMax }
    );
  }, [area, labels, values, yMax, yMin, yTicks]);
  useEffect(() => {
    draw();
  }, [draw]);
  return <canvas ref={canvasRef} width="820" height="270" aria-label={label} />;
};

const HistogramChart = () => {
  const canvasRef = useRef(null);
  const values = [
    24, 39, 46, 42, 19, 18, 8, 10, 16, 29, 25, 31, 40, 27, 25, 19, 24, 17, 13,
    8, 5, 3, 10, 12, 7, 9, 10, 12, 11, 9, 14, 25, 22, 19, 31, 20, 17, 13, 14,
    18, 13, 9, 7, 4, 2,
  ];
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 10, right: 9, bottom: 24, left: 29 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    context.clearRect(0, 0, width, height);
    context.font = '9px Segoe UI, Arial, sans-serif';
    [0, 10, 20, 30, 40].forEach((tick) => {
      const y = padding.top + chartHeight - (tick / 50) * chartHeight;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = '#edf1f2';
      context.stroke();
      context.fillStyle = '#66757b';
      context.textAlign = 'right';
      context.fillText(String(tick), padding.left - 5, y + 3);
    });
    const barWidth = chartWidth / values.length;
    values.forEach((value, index) => {
      const barHeight = (value / 50) * chartHeight;
      context.fillStyle = '#66d0bc';
      context.fillRect(
        padding.left + index * barWidth + 1,
        padding.top + chartHeight - barHeight,
        Math.max(2, barWidth - 2),
        barHeight
      );
    });
    [175, 208, 242, 275, 308, 341, 374, 407, 424].forEach(
      (label, index, list) => {
        context.fillStyle = '#65747a';
        context.textAlign = 'center';
        context.fillText(
          String(label),
          padding.left + (chartWidth * index) / (list.length - 1),
          height - 5
        );
      }
    );
  }, [values]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="500"
      height="270"
      aria-label="Motor energy histogram"
    />
  );
};

const DonutChart = () => {
  const canvasRef = useRef(null);
  const data = [
    { value: 35, color: '#ffcc05' },
    { value: 14, color: '#62d5b7' },
    { value: 15, color: '#8475d5' },
    { value: 16, color: '#fea719' },
    { value: 13, color: '#29b8bd' },
    { value: 7, color: '#eb5ba3' },
  ];
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = 100;
    let angle = -Math.PI / 2;
    context.clearRect(0, 0, canvas.width, canvas.height);
    data.forEach((item) => {
      const nextAngle = angle + (item.value / 100) * 2 * Math.PI;
      context.beginPath();
      context.arc(centerX, centerY, 78, angle, nextAngle);
      context.arc(centerX, centerY, 44, nextAngle, angle, true);
      context.closePath();
      context.fillStyle = item.color;
      context.fill();
      angle = nextAngle;
    });
    context.textAlign = 'center';
    context.fillStyle = '#39474d';
    context.font = '20px Segoe UI, Arial, sans-serif';
    context.fillText('12.0%', centerX, centerY - 1);
    context.font = '10px Segoe UI, Arial, sans-serif';
    context.fillText('Druckluft E2', centerX, centerY + 17);
  }, [data]);
  useEffect(() => {
    draw();
  }, [draw]);
  return (
    <canvas
      ref={canvasRef}
      width="330"
      height="210"
      aria-label="Motor energy composition donut chart"
    />
  );
};

const TrendIndicator = ({ label, alert }) => (
  <button
    type="button"
    className="motor-dashboard__period"
    aria-label={`${label} trend indicator`}
  >
    <ArrowForwardIcon
      className={
        alert
          ? 'motor-dashboard__period-arrow motor-dashboard__period-arrow--alert'
          : 'motor-dashboard__period-arrow'
      }
    />
    <span>{label}</span>
  </button>
);

const Course = ({ title, range, values, labels }) => (
  <article className="motor-dashboard__course-card">
    <div className="motor-dashboard__course-heading">
      <h2>{title}</h2>
      <button type="button">{range}</button>
    </div>
    <div className="motor-dashboard__course-chart">
      <MotorLineChart
        values={values}
        labels={labels}
        yMin={0}
        yMax={400}
        yTicks={[0, 100, 200, 300, 400]}
        label={`${title} line chart`}
      />
    </div>
  </article>
);

class MotorsTab extends React.Component {
  render() {
    const power = [
      178, 169, 165, 171, 390, 285, 405, 295, 365, 244, 321, 400, 232, 228, 185,
      180, 188, 365, 235, 336, 184, 171, 180, 384, 416, 244, 319, 251, 300, 365,
      259, 419, 238, 190, 177, 173, 181, 375, 221, 240, 330, 198, 230, 410, 386,
      248, 332, 262, 278, 410, 190, 180, 175, 190, 365, 205, 230, 249, 312, 410,
      376, 250, 286, 225, 278,
    ];
    return (
      <section className="motor-dashboard">
        <div className="motor-dashboard__periods">
          <TrendIndicator label="Last hour" />
          <TrendIndicator label="Last 24 hours" alert />
          <TrendIndicator label="Last 7 days" />
        </div>
        <article className="motor-dashboard__power-card">
          <h2>ACTIVE POWER CONSUMPTION</h2>
          <div className="motor-dashboard__power-plot">
            <span className="motor-dashboard__axis-title">
              Active Power in kW
            </span>
            <MotorLineChart
              values={power}
              area
              yMin={0}
              yMax={460}
              yTicks={[0, 100, 200, 300, 400]}
              labels={[
                'Dec 25',
                'Dec 27',
                'Dec 29',
                'Dec 31',
                '2019',
                'Jan 03',
                'Jan 05',
                'Jan 07',
                'Jan 09',
                'Jan 11',
                'Jan 13',
              ]}
              label="Active power consumption line chart"
            />
          </div>
        </article>
        <div className="motor-dashboard__small-grid">
          <article className="motor-dashboard__small-card">
            <h2>HISTOGRAM</h2>
            <div className="motor-dashboard__histogram-chart">
              <HistogramChart />
            </div>
          </article>
          <article className="motor-dashboard__small-card motor-dashboard__composition">
            <h2>COMPOSITION</h2>
            <DonutChart />
            <div className="motor-dashboard__composition-legend">
              <span>
                <i />
                Rotation E4
              </span>
              <span>
                <i />
                Druckluft E2
              </span>
              <span>
                <i />
                Kalte
              </span>
              <span>
                <i />
                MSR
              </span>
              <span>
                <i />
                Papier u...
              </span>
            </div>
          </article>
        </div>
        <div className="motor-dashboard__course-grid">
          <Course
            title="WEEKLY COURSE"
            range="2018/01/19 - 2019/01/19"
            values={[280, 340, 350, 345, 330, 240, 200]}
            labels={[
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ]}
          />
          <Course
            title="DAILY COURSE"
            range="2018/12/16 - 2019/01/15"
            values={[
              330, 290, 250, 235, 225, 230, 240, 240, 230, 235, 245, 255, 258,
              263, 270, 275, 280, 286, 300, 330,
            ]}
            labels={[
              '00',
              '02',
              '04',
              '06',
              '08',
              '10',
              '12',
              '14',
              '16',
              '18',
              '20',
              '22',
            ]}
          />
        </div>
      </section>
    );
  }
}

export default MotorsTab;
