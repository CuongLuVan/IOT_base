import React from 'react';
import WarningIcon from '@material-ui/icons/Warning';

const Trend = ({ color, fill }) => <div className="alarm-dashboard__trend"><svg viewBox="0 0 100 84" preserveAspectRatio="none"><path d="M0 17H100M0 46H100M0 76H100" stroke="#e6e8ee" strokeWidth=".55" />{fill && <path d="M0 64L12 48 25 54 39 62 53 48 69 38 84 37 100 22V78H0Z" fill="rgba(117,104,232,.25)" />}<path d="M0 64L12 48 25 54 39 62 53 48 69 38 84 37 100 22" fill="none" stroke={color} strokeWidth="1.3" /></svg><div>{['13:00', '15:00', '17:00', '19:00', '21:00'].map((label) => <span key={label}>{label}</span>)}</div></div>;
const Card = ({ title, status, critical, value, description, children }) => <article className="alarm-dashboard__card"><header><h2>{title}</h2>{status && <span className={`alarm-dashboard__status ${critical ? 'alarm-dashboard__status--critical' : 'alarm-dashboard__status--normal'}`}>{status}</span>}</header>{children}<div className="alarm-dashboard__value">{value}</div><p>{description}</p></article>;

class AlarmTab extends React.Component {
  render() {
    return <section className="alarm-dashboard"><div className="alarm-dashboard__grid"><Card title="Vibration RMS" status="Critical" critical value="8.5 mm/s" description="Average RMS (last 8 hrs)"><Trend color="#7771d7" fill /></Card><Card title="Temperature" status="Normal" value="67 C" description="Average Temp. (last 8 hrs)"><Trend color="#bd2170" /></Card><Card title="Pressure" status="Within Range" value="4.5 bar" description="Average Pressure (last 8 hrs)"><div className="alarm-dashboard__gauge-wrap"><div className="alarm-dashboard__gauge"><i /><b /></div></div></Card><Card title="Torque" status="Normal" value="82%" description="Average Torque Load (last 8 hrs)"><div className="alarm-dashboard__torque"><span>82%</span></div></Card><Card title="Current" value="7.7 amps" description="Average Current (last 8 hrs)"><Trend color="#4f499c" /></Card><Card title="Oil Level" value="82%" description="Current Oil Level (36 hrs remaining)"><div className="alarm-dashboard__oil"><div><span>100%</span><span>80%</span><span>60%</span><span>40%</span><span>20%</span></div><b><i /></b></div></Card></div><span className="alarm-tab__accessible"><WarningIcon /> Live alarm status</span></section>;
  }
}

export default AlarmTab;
