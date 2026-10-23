import React, { useCallback, useEffect, useRef } from 'react';

const dates = [
  'Sep 02 2024',
  'Sep 03 2024',
  'Sep 04 2024',
  'Sep 05 2024',
  'Sep 06 2024',
];
const CounterTrendChart = ({ values, target, color }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 7, right: 8, bottom: 22, left: 28 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const xFor = (index) =>
      padding.left + (chartWidth * index) / (values.length - 1);
    const yFor = (value) =>
      padding.top + chartHeight - (value / 100) * chartHeight;

    context.clearRect(0, 0, width, height);
    context.font = '9px Segoe UI, Arial, sans-serif';

    [0, 40, 80, 100].forEach((tick) => {
      const y = yFor(tick);
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = '#e5eaec';
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = '#64737a';
      context.textAlign = 'right';
      context.fillText(`${tick}%`, padding.left - 5, y + 3);
    });

    dates.forEach((date, index) => {
      context.fillStyle = '#64737a';
      context.textAlign = 'center';
      context.fillText(date, xFor(index), height - 5);
    });

    context.beginPath();
    context.setLineDash([4, 3]);
    context.moveTo(padding.left, yFor(target));
    context.lineTo(width - padding.right, yFor(target));
    context.strokeStyle = '#81722f';
    context.stroke();
    context.setLineDash([]);

    context.beginPath();
    values.forEach((value, index) => {
      if (index === 0) context.moveTo(xFor(index), yFor(value));
      else context.lineTo(xFor(index), yFor(value));
    });
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineJoin = 'round';
    context.stroke();
    values.forEach((value, index) => {
      context.beginPath();
      context.arc(xFor(index), yFor(value), 2.2, 0, 2 * Math.PI);
      context.fillStyle = color;
      context.fill();
    });
  }, [color, target, values]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="460"
      height="165"
      aria-label="Counter performance trend chart"
    />
  );
};

const ClusteredColumnLineChart = () => {
  const canvasRef = useRef(null);
  const expected = [5100, 4300, 5000, 4900, 5150];
  const produced = [4300, 3600, 4300, 4100, 3950];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 8, right: 8, bottom: 24, left: 34 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const yFor = (value) =>
      padding.top + chartHeight - (value / 6000) * chartHeight;
    const groupWidth = chartWidth / expected.length;

    context.clearRect(0, 0, width, height);
    context.font = '9px Segoe UI, Arial, sans-serif';
    [0, 2000, 4000, 6000].forEach((tick) => {
      const y = yFor(tick);
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = '#e5eaec';
      context.stroke();
      context.fillStyle = '#64737a';
      context.textAlign = 'right';
      context.fillText(tick.toLocaleString(), padding.left - 5, y + 3);
    });

    expected.forEach((value, index) => {
      const centerX = padding.left + groupWidth * index + groupWidth / 2;
      context.fillStyle = '#65a7e5';
      context.fillRect(
        centerX - 11,
        yFor(value),
        9,
        padding.top + chartHeight - yFor(value)
      );
      context.fillStyle = '#3ab84f';
      context.fillRect(
        centerX + 2,
        yFor(produced[index]),
        9,
        padding.top + chartHeight - yFor(produced[index])
      );
      context.fillStyle = '#64737a';
      context.textAlign = 'center';
      context.fillText(dates[index].replace(' 2024', ''), centerX, height - 5);
    });

    context.beginPath();
    expected.forEach((value, index) => {
      const x = padding.left + groupWidth * index + groupWidth / 2;
      const y = yFor((value + produced[index]) / 2);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = '#7b679f';
    context.lineWidth = 1.5;
    context.stroke();
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="460"
      height="170"
      aria-label="Clustered column and line product chart"
    />
  );
};

const PieChart = () => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const total = 18968;
    const rejected = 1578;
    const accepted = total - rejected;
    const centerX = canvas.width / 2;
    const centerY = 74;
    const radius = 58;
    const rejectedAngle = (rejected / total) * 2 * Math.PI;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(
      centerX,
      centerY,
      radius,
      -Math.PI / 2,
      -Math.PI / 2 + rejectedAngle
    );
    context.closePath();
    context.fillStyle = '#ef533b';
    context.fill();
    context.beginPath();
    context.moveTo(centerX, centerY);
    context.arc(
      centerX,
      centerY,
      radius,
      -Math.PI / 2 + rejectedAngle,
      1.5 * Math.PI
    );
    context.closePath();
    context.fillStyle = '#31c8b3';
    context.fill();
    context.font = '10px Segoe UI, Arial, sans-serif';
    context.fillStyle = '#637177';
    context.textAlign = 'center';
    context.fillText(
      `Accepted ${accepted.toLocaleString()} (91.65%)`,
      centerX,
      146
    );
    context.fillText(
      `Rejected ${rejected.toLocaleString()} (8.35%)`,
      centerX,
      160
    );
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="260"
      height="170"
      aria-label="Accepted and rejected quantity pie chart"
    />
  );
};

const HorizontalBarChart = () => {
  const canvasRef = useRef(null);
  const rows = [
    ['Gearbox Failure', 35, 27],
    ['Corrective Maintenance', 27, 19],
    ['Lubrication', 22, 16],
    ['Bearing Failure', 15, 10],
    ['Power Supply Failure', 10, 7],
  ];

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const { width, height } = canvas;
    const padding = { top: 6, right: 10, bottom: 4, left: 86 };
    const chartWidth = width - padding.left - padding.right;
    const rowHeight = (height - padding.top - padding.bottom) / rows.length;

    context.clearRect(0, 0, width, height);
    context.font = '8px Segoe UI, Arial, sans-serif';
    rows.forEach(([label, estimated, unplanned], index) => {
      const y = padding.top + index * rowHeight + 3;
      context.fillStyle = '#405056';
      context.textAlign = 'right';
      context.fillText(label, padding.left - 4, y + 6);
      context.fillStyle = '#e5e8e9';
      context.fillRect(padding.left, y, chartWidth, 5);
      context.fillStyle = '#18a344';
      context.fillRect(padding.left, y, (estimated / 40) * chartWidth, 5);
      context.fillStyle = '#ff5a29';
      context.fillRect(padding.left, y + 7, (unplanned / 40) * chartWidth, 5);
    });
  }, [rows]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="290"
      height="112"
      aria-label="Top unplanned downtime horizontal bar chart"
    />
  );
};

const RadialGaugeChart = ({ value }) => {
  const canvasRef = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const center = canvas.width / 2;
    const radius = 29;
    const start = -Math.PI / 2;
    const end = start + (value / 100) * 2 * Math.PI;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 10;
    context.beginPath();
    context.arc(center, center, radius, 0, 2 * Math.PI);
    context.strokeStyle = '#edf0f1';
    context.stroke();
    context.beginPath();
    context.arc(center, center, radius, start, end);
    context.strokeStyle = '#b6db09';
    context.stroke();
    context.fillStyle = '#5c6a71';
    context.font = '9px Segoe UI, Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(`${value}%`, center, center + 3);
  }, [value]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width="80"
      height="80"
      aria-label={`Machine OEE radial gauge ${value} percent`}
    />
  );
};

const Metric = ({ name, value, target, color, values }) => (
  <article className="counter-dashboard__metric-card">
    <div className="counter-dashboard__metric-title">{name}</div>
    <div className="counter-dashboard__metric-body">
      <div className="counter-dashboard__score">
        <strong>{value}</strong>
        <span>%</span>
        <small>down 5%</small>
        <b>
          {target}%<em>Target</em>
        </b>
      </div>
      <div className="counter-dashboard__trend">
        <CounterTrendChart values={values} target={target} color={color} />
      </div>
    </div>
    <div className="counter-dashboard__metric-legend">
      <span>
        <i style={{ background: color }} />
        {name}
      </span>
      <span>
        <i className="counter-dashboard__dash" />
        Target{name}
      </span>
    </div>
  </article>
);
const Machine = ({ name, value }) => (
  <article className="counter-dashboard__machine">
    <strong>{name}</strong>
    <div className="counter-dashboard__radial-gauge">
      <RadialGaugeChart value={value} />
    </div>
  </article>
);

class CounterTab extends React.Component {
  render() {
    const machines = [
      ['Food Hidrostatic machine washer', 80],
      ['Mixer Carbo 150kg', 85],
      ['Mixer Carbo 500kg', 83],
      ['Mixer Prote 400kg', 79],
      ['Mixer Prote 500kg', 80],
    ];
    return (
      <section className="counter-dashboard">
        <div className="counter-dashboard__top-grid">
          <Metric
            name="OEE"
            value="63"
            target="75"
            color="#84b840"
            values={[72, 68, 76, 71, 59]}
          />
          <article className="counter-dashboard__product-card">
            <div className="counter-dashboard__metric-title">Product Count</div>
            <div className="counter-dashboard__product-body">
              <div className="counter-dashboard__score">
                <strong>18,968</strong>
                <small>down 10%</small>
                <b>
                  21,000<em>Target</em>
                </b>
              </div>
              <div className="counter-dashboard__product-chart">
                <ClusteredColumnLineChart />
              </div>
            </div>
            <div className="counter-dashboard__metric-legend">
              <span>
                <i className="counter-dashboard__blue" />
                Expected
              </span>
              <span>
                <i style={{ background: '#3ab84f' }} />
                Produced
              </span>
            </div>
          </article>
          <article className="counter-dashboard__pie-card">
            <div className="counter-dashboard__pie-title">
              Accepted and Rejected Quantity
            </div>
            <div className="counter-dashboard__pie-note">(17.39K) (92.62%)</div>
            <div className="counter-dashboard__pie-chart">
              <PieChart />
            </div>
          </article>
        </div>
        <div className="counter-dashboard__bottom-grid">
          <Metric
            name="Availability"
            value="86"
            target="90"
            color="#4baf68"
            values={[84, 80, 87, 89, 84]}
          />
          <Metric
            name="Quality"
            value="90"
            target="95"
            color="#3ba85d"
            values={[93, 94, 94, 89, 86]}
          />
          <article className="counter-dashboard__runtime-card">
            <div className="counter-dashboard__metric-title">Downtime</div>
            <div className="counter-dashboard__runtime">
              <strong>87.16</strong>
              <small>down 44.47%</small>
              <b>
                602.34<em>Planned Run Time</em>
              </b>
            </div>
            <div className="counter-dashboard__downtime-chart">
              <strong>Top 5 Unplanned Downtime</strong>
              <HorizontalBarChart />
            </div>
          </article>
        </div>
        <article className="counter-dashboard__machines">
          <h3>OEE: Lower than target</h3>
          <div>
            {machines.map(([name, value]) => (
              <Machine key={name} name={name} value={value} />
            ))}
          </div>
        </article>
      </section>
    );
  }
}

export default CounterTab;
