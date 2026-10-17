import React, { useState } from 'react';
import { useLogin } from 'react-admin';
import './customer.css';

const CustomerLoginPage = ({ onSwitchPortal }) => {
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (submitting) return;
    const username = email.trim();
    if (!username || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setSubmitting(true);
    setError('');
    login({ username, password })
      .catch((reason) => setError((reason && reason.message) || 'Đăng nhập Customer không thành công.'))
      .finally(() => setSubmitting(false));
  };

  return (
    <main className="customer-login-shell">
      <form className="customer-login-card" onSubmit={submit} noValidate>
        <p className="customer-login-eyebrow">CUSTOMER PORTAL</p>
        <h1>Đăng nhập Customer</h1>
        <p className="customer-login-description">Quản lý doanh nghiệp, sản phẩm, dịch vụ và giấy tờ của bạn.</p>

        <label htmlFor="customer-email">Email</label>
        <input
          id="customer-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="customer-password">Mật khẩu</label>
        <input
          id="customer-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {error && <p className="customer-form-error" role="alert">{error}</p>}
        <button className="customer-primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        {onSwitchPortal && (
          <button className="customer-link-button" type="button" onClick={() => onSwitchPortal('admin')}>
            Đăng nhập quản trị
          </button>
        )}
      </form>
    </main>
  );
};

export default CustomerLoginPage;

