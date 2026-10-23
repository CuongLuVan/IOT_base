import React from 'react';
import { JWT_TOKEN } from './config/config.js';
import {
  ADMIN_PORTAL,
  CUSTOMER_PORTAL,
  CUSTOMER_TOKEN_KEY,
  CUSTOMER_USERNAME_KEY,
  PORTAL_MODE_KEY
} from './customer/session';
import './customer/customer.css';

// Keep the two portals out of the initial bundle. A Customer session no longer
// downloads Admin screens (and vice versa) until that portal is selected.
const AdminPortal = React.lazy(() => import('./AdminPortal'));
const CustomerApp = React.lazy(() => import('./customer/CustomerApp'));

const getPortalMode = () => {
  const mode = sessionStorage.getItem(PORTAL_MODE_KEY);
  return mode === ADMIN_PORTAL || mode === CUSTOMER_PORTAL ? mode : null;
};

const clearPortalSessions = () => {
  [JWT_TOKEN, CUSTOMER_TOKEN_KEY, 'username', CUSTOMER_USERNAME_KEY].forEach((key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
};

const PortalChooser = ({ onChoose }) => (
  <main className="customer-login-shell">
    <section className="customer-login-card">
      <p className="customer-login-eyebrow">IOT MANAGER</p>
      <h1>Chọn cổng đăng nhập</h1>
      <p className="customer-login-description">Admin và Customer được tách thành hai không gian làm việc độc lập.</p>
      <button className="customer-primary-button" type="button" onClick={() => onChoose(CUSTOMER_PORTAL)}>Đăng nhập Customer</button>
      <button className="customer-link-button" type="button" onClick={() => onChoose(ADMIN_PORTAL)}>Đăng nhập quản trị</button>
    </section>
  </main>
);

const PortalLoading = () => (
  <main className="customer-login-shell">
    <section className="customer-login-card"><p>Đang tải cổng làm việc…</p></section>
  </main>
);

const App = () => {
  const [portal, setPortal] = React.useState(getPortalMode);

  const switchPortal = (mode) => {
    clearPortalSessions();
    sessionStorage.setItem(PORTAL_MODE_KEY, mode);
    window.location.hash = '#/login';
    setPortal(mode);
  };

  if (!portal) return <PortalChooser onChoose={switchPortal} />;
  const Portal = portal === CUSTOMER_PORTAL ? CustomerApp : AdminPortal;
  return (
    <React.Suspense fallback={<PortalLoading />}>
      <Portal onSwitchPortal={switchPortal} />
    </React.Suspense>
  );
};

export default App;
