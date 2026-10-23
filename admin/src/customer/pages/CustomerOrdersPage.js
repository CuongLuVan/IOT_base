import React, { useCallback, useEffect, useState } from 'react';
import { getCustomerOrders, getCustomerReturns, getErrorMessage } from '../api';
import '../customer.css';

function extractRows(payload) {
  return payload && Array.isArray(payload.result) ? payload.result : [];
}

const OrderTable = ({ rows, isReturn }) => {
  const fields = isReturn
    ? [['product_back_id', 'Mã trả hàng'], ['product_id', 'Mã sản phẩm'], ['created_at', 'Ngày tạo']]
    : [['buyproduct_id', 'Mã đơn hàng'], ['total', 'Tổng tiền'], ['status', 'Trạng thái'], ['created_at', 'Ngày tạo']];

  return (
    <div className="customer-panel customer-table-wrap">
      <table className="customer-table">
        <thead><tr>{fields.map(([, label]) => <th key={label}>{label}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={fields.length}>Chưa có dữ liệu.</td></tr> : rows.map((row, index) => (
            <tr key={row[fields[0][0]] || index}>
              {fields.map(([field]) => <td key={field}>{String(row[field] === undefined || row[field] === null ? '—' : row[field])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CustomerOrdersPage = ({ isReturn = false }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const request = isReturn ? getCustomerReturns : getCustomerOrders;
    return request()
      .then((payload) => setRows(extractRows(payload)))
      .catch((reason) => setError(getErrorMessage(reason, 'Không tải được dữ liệu đơn hàng.')))
      .finally(() => setLoading(false));
  }, [isReturn]);

  useEffect(() => { load(); }, [load]);
  const title = isReturn ? 'Sản phẩm trả lại' : 'Đơn hàng';

  return (
    <section className="customer-page">
      <h1>{title}</h1>
      <p className="customer-page-lead">Dữ liệu thuộc tài khoản Customer đang đăng nhập.</p>
      <div className="customer-toolbar"><button className="customer-secondary-button" onClick={load} disabled={loading}>Tải lại</button></div>
      {error && <p className="customer-page-error" role="alert">{error}</p>}
      {loading ? <p>Đang tải…</p> : <OrderTable rows={rows} isReturn={isReturn} />}
    </section>
  );
};

export default CustomerOrdersPage;

