import React, { useCallback, useEffect, useState } from 'react';
import { API_URL } from '../../config/config';
import {
  getCustomerRecords,
  getErrorMessage,
  submitCustomerDocument,
  uploadCustomerImage
} from '../api';
import '../customer.css';

function rowsFrom(payload) {
  return payload && Array.isArray(payload.result) ? payload.result : [];
}

function safeUploadUrl(path) {
  if (typeof path !== 'string' || !/^\/uploads\/[a-zA-Z0-9._/-]+$/.test(path) || path.includes('..')) return null;
  try {
    const url = new URL(path, API_URL);
    const apiOrigin = new URL(API_URL).origin;
    return url.origin === apiOrigin ? url.toString() : null;
  } catch (error) {
    return null;
  }
}

const CustomerDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ document_type: 'CCCD', document_number: '', document_name: '' });
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    // customer_documents is protected by the Customer manifest and ONLY_USER
    // access rule; Customer cannot read another account's documents.
    return getCustomerRecords('customer_documents')
      .then((payload) => setDocuments(rowsFrom(payload)))
      .catch((reason) => setError(getErrorMessage(reason, 'Không tải được giấy tờ.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    if (!front || submitting) {
      setError('Vui lòng chọn ít nhất ảnh mặt trước.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const frontResponse = await uploadCustomerImage(front);
      const frontPath = frontResponse && frontResponse.url;
      const backResponse = back ? await uploadCustomerImage(back) : null;
      const backPath = backResponse && backResponse.url;
      if (!safeUploadUrl(frontPath) || (back && !safeUploadUrl(backPath))) {
        throw new Error('Máy chủ trả về đường dẫn ảnh không hợp lệ.');
      }

      await submitCustomerDocument({ ...form, image_front: frontPath, image_back: backPath || null });
      setForm({ document_type: 'CCCD', document_number: '', document_name: '' });
      setFront(null);
      setBack(null);
      setSuccess('Giấy tờ đã được gửi để duyệt.');
      await load();
    } catch (reason) {
      setError(getErrorMessage(reason, (reason && reason.message) || 'Không thể gửi giấy tờ.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="customer-page">
      <h1>Giấy tờ xác minh</h1>
      <p className="customer-page-lead">Nộp giấy tờ của Customer và theo dõi trạng thái duyệt.</p>
      <div className="customer-card-grid">
        <form className="customer-panel" onSubmit={submit}>
          <h2>Gửi giấy tờ</h2>
          <div className="customer-form-grid">
            <label><span>Loại giấy tờ *</span>
              <select className="customer-form-control" value={form.document_type} onChange={(event) => setForm({ ...form, document_type: event.target.value })}>
                <option value="CCCD">CCCD</option>
                <option value="PASSPORT">Hộ chiếu</option>
                <option value="BUSINESS_LICENSE">Giấy phép doanh nghiệp</option>
                <option value="EXPORT_CERT">Chứng nhận xuất khẩu</option>
                <option value="OTHER">Khác</option>
              </select>
            </label>
            <label><span>Số giấy tờ</span><input className="customer-form-control" value={form.document_number} maxLength="100" onChange={(event) => setForm({ ...form, document_number: event.target.value })} /></label>
            <label><span>Tên giấy tờ</span><input className="customer-form-control" value={form.document_name} maxLength="255" onChange={(event) => setForm({ ...form, document_name: event.target.value })} /></label>
            <label><span>Ảnh mặt trước * (JPG/PNG, tối đa 10 MB)</span><input className="customer-form-control" type="file" accept="image/jpeg,image/png" onChange={(event) => setFront(event.target.files && event.target.files[0])} required /></label>
            <label><span>Ảnh mặt sau (JPG/PNG, tối đa 10 MB)</span><input className="customer-form-control" type="file" accept="image/jpeg,image/png" onChange={(event) => setBack(event.target.files && event.target.files[0])} /></label>
          </div>
          {error && <p className="customer-form-error" role="alert">{error}</p>}
          {success && <p role="status">{success}</p>}
          <button className="customer-primary-button" type="submit" disabled={submitting}>{submitting ? 'Đang gửi…' : 'Gửi duyệt'}</button>
        </form>
        <section className="customer-panel">
          <h2>Danh sách đã nộp</h2>
          <button className="customer-secondary-button" onClick={load} disabled={loading}>Tải lại</button>
          {loading ? <p>Đang tải…</p> : documents.length === 0 ? <p>Chưa có giấy tờ.</p> : documents.map((document) => (
            <article key={document.customer_documents_id} className="customer-card">
              <p><strong>{document.document_type}</strong> — {document.document_name || 'Không có tên'}</p>
              <p>Số giấy tờ: {document.document_number || '—'}</p>
              <span className={`customer-status customer-status-${document.status || 'PENDING'}`}>{document.status || 'PENDING'}</span>
              {document.reject_reason && <p className="customer-page-error">Lý do từ chối: {document.reject_reason}</p>}
              <div className="customer-document-images">
                {[document.image_front, document.image_back].map((path, index) => {
                  const url = safeUploadUrl(path);
                  return url ? <img key={path} src={url} alt={`Giấy tờ ${index + 1}`} /> : null;
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
};

export default CustomerDocumentsPage;

