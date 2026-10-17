import React, { useEffect, useState } from 'react';
import { getCustomerInfo, getErrorMessage } from '../api';
import '../customer.css';

const valueOrDash = (value) => (value === undefined || value === null || value === '' ? '—' : value);

const CustomerDashboard = () => {
  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getCustomerInfo()
      .then((payload) => {
        if (mounted) setCustomer(payload && payload.user ? payload.user : null);
      })
      .catch((reason) => {
        if (mounted) setError(getErrorMessage(reason, 'Không tải được thông tin Customer.'));
      });
    return () => { mounted = false; };
  }, []);

  return (
    <section className="customer-page">
      <h1>Customer Portal</h1>
      <p className="customer-page-lead">Không gian quản lý dành riêng cho Customer.</p>
      {error && <p className="customer-page-error" role="alert">{error}</p>}
      <div className="customer-card-grid">
        <article className="customer-card">
          <h2>Thông tin tài khoản</h2>
          <p><strong>Họ tên:</strong> {valueOrDash(customer && customer.fullname)}</p>
          <p><strong>Email:</strong> {valueOrDash(customer && customer.email)}</p>
          <p><strong>Điện thoại:</strong> {valueOrDash(customer && customer.phone)}</p>
        </article>
        <article className="customer-card">
          <h2>Chức năng</h2>
          <p>Quản lý công ty và danh mục sản phẩm.</p>
          <p>Theo dõi đơn hàng và gói dịch vụ.</p>
          <p>Nộp, theo dõi trạng thái giấy tờ xác minh.</p>
        </article>
      </div>
    </section>
  );
};

export default CustomerDashboard;

