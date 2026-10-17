import React, { useState } from 'react';
import AppsIcon from '@material-ui/icons/Apps';
import CalendarTodayIcon from '@material-ui/icons/CalendarToday';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import SearchIcon from '@material-ui/icons/Search';
import SettingsIcon from '@material-ui/icons/Settings';
import ShowChartIcon from '@material-ui/icons/ShowChart';
import EnergyTab from './oee-tabs/EnergyTab';
import CounterTab from './oee-tabs/CounterTab';
import MotorsTab from './oee-tabs/MotorsTab';
import OeeTab from './oee-tabs/OeeTab';
import AlarmTab from './oee-tabs/AlarmTab';
import './OeeDashboard.css';

const TABS = [
  { id: 'energy', label: 'Energy', Component: EnergyTab },
  { id: 'counter', label: 'Counter', Component: CounterTab },
  { id: 'motors', label: 'Motors', Component: MotorsTab },
  { id: 'oee', label: 'OEE', Component: OeeTab },
  { id: 'alarm', label: 'Alarm', Component: AlarmTab },
];

const DateNavigation = () => {
  const [date, setDate] = useState(new Date(2020, 0, 20));
  const changeDate = (amount) => setDate((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount));
  const label = `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}`;
  return <div className="oee-dashboard__date-nav"><button className="oee-dashboard__icon-button oee-dashboard__icon-button--dark" type="button" aria-label="Refresh"><SearchIcon fontSize="small" /></button><div className="oee-dashboard__date-picker"><button className="oee-dashboard__date-arrow" type="button" onClick={() => changeDate(-1)} aria-label="Previous day"><ChevronLeftIcon fontSize="small" /></button><span className="oee-dashboard__date-text">{label}</span><CalendarTodayIcon className="oee-dashboard__calendar-icon" fontSize="small" /><button className="oee-dashboard__date-arrow" type="button" onClick={() => changeDate(1)} aria-label="Next day"><ChevronRightIcon fontSize="small" /></button></div><button className="oee-dashboard__settings-button" type="button" aria-label="Settings"><SettingsIcon fontSize="small" /></button></div>;
};

const OeeDashboard = () => {
  const [activeTab, setActiveTab] = useState('oee');
  const ActiveTab = TABS.find((tab) => tab.id === activeTab).Component;
  return <main className="oee-dashboard"><nav className="oee-dashboard__tabs" aria-label="Dashboard sections"><button className="oee-dashboard__tab-menu" type="button" aria-label="Applications"><AppsIcon fontSize="small" /></button>{TABS.map((tab) => <button key={tab.id} type="button" className={`oee-dashboard__tab ${activeTab === tab.id ? 'oee-dashboard__tab--active' : ''}`} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}><ShowChartIcon className="oee-dashboard__tab-icon" fontSize="small" /><span>{tab.label}</span></button>)}</nav><DateNavigation /><div className="oee-dashboard__content"><ActiveTab /></div></main>;
};

export default OeeDashboard;
