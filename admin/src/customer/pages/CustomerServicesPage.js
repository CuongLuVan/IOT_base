import React, { useCallback, useEffect, useState } from 'react';
import { getCustomerServices, getErrorMessage } from '../api';
import '../customer.css';

const rowsFrom = (payload) => (payload && Array.isArray(payload.result) ? payload.result : []);

const CustomerServicesPage = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return getCustomerServices()
      .then((payload) => setServices(rowsFrom(payload)))
      .catch((reason) => setError(getErrorMessage(reason, 'Không tải được gói dịch vụ.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="customer-page">
      <h1>Dịch vụ</h1>
      <p className="customer-page-lead">Các gói dịch vụ đang hoạt động của Customer.</p>
      <div className="customer-toolbar">
        <button className="customer-secondary-button" onClick={load} disabled={loading}>Tải lại</button>
      </div>
      {error && <p className="customer-page-error" role="alert">{error}</p>}
      <div className="customer-card-grid">
        {loading ? <p>Đang tải…</p> : services.length === 0 ? <p>Chưa có gói dịch vụ đang hoạt động.</p> : services.map((service) => (
          <article className="customer-card" key={service.service_product_bill_id}>
            <h2>{service.title || 'Gói dịch vụ'}</h2>
            {service.content && <p>{service.content}</p>}
            <p><strong>Giới hạn:</strong> {service.limit === undefined || service.limit === null ? '—' : service.limit}</p>
            <p><strong>Trạng thái:</strong> {service.payment_status || '—'}</p>
            <p><strong>Hết hạn:</strong> {service.expires_at || '—'}</p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default CustomerServicesPage;

