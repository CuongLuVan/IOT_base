import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addCustomerRecord,
  deleteCustomerRecord,
  getCustomerRecords,
  getErrorMessage,
  updateCustomerRecord
} from '../api';
import '../customer.css';

function extractRows(payload) {
  const result = payload && payload.result;
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.data)) return result.data;
  return [];
}

function emptyValues(fields) {
  return fields.reduce((values, field) => ({ ...values, [field.name]: '' }), {});
}

function normalizeValues(fields, values) {
  return fields.reduce((output, field) => {
    const raw = values[field.name];
    if (field.type === 'number') {
      output[field.name] = raw === '' || raw === undefined ? null : Number(raw);
    } else {
      output[field.name] = typeof raw === 'string' ? raw.trim() : raw;
    }
    return output;
  }, {});
}

const CustomerRecordDialog = ({ title, fields, initialValues, saving, error, onCancel, onSave }) => {
  const [values, setValues] = useState(initialValues);

  useEffect(() => setValues(initialValues), [initialValues]);

  const submit = (event) => {
    event.preventDefault();
    onSave(normalizeValues(fields, values));
  };

  return (
    <div className="customer-dialog-overlay" role="presentation">
      <form className="customer-dialog" onSubmit={submit} aria-label={title}>
        <h2>{title}</h2>
        <div className="customer-form-grid">
          {fields.map((field) => (
            <label key={field.name}>
              <span>{field.label}{field.required ? ' *' : ''}</span>
              {field.multiline ? (
                <textarea
                  className="customer-form-control"
                  rows="4"
                  value={values[field.name] || ''}
                  onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                  required={field.required}
                />
              ) : (
                <input
                  className="customer-form-control"
                  type={field.type || 'text'}
                  value={values[field.name] || ''}
                  onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}
                  required={field.required}
                  min={field.min}
                />
              )}
            </label>
          ))}
        </div>
        {error && <p className="customer-form-error" role="alert">{error}</p>}
        <div className="customer-dialog-actions">
          <button className="customer-secondary-button" type="button" onClick={onCancel} disabled={saving}>Hủy</button>
          <button className="customer-primary-button" type="submit" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button>
        </div>
      </form>
    </div>
  );
};

const CustomerRecordsPage = ({
  title,
  description,
  table,
  idField,
  fields,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  useProductEntitlement = false
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return getCustomerRecords(table)
      .then((payload) => setRows(extractRows(payload)))
      .catch((reason) => setError(getErrorMessage(reason, 'Không tải được dữ liệu Customer.')))
      .finally(() => setLoading(false));
  }, [table]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setDialog({ mode: 'create', values: emptyValues(fields) });
    setDialogError('');
  };
  const openEdit = (row) => {
    const values = fields.reduce((output, field) => ({
      ...output,
      [field.name]: row[field.name] === undefined || row[field.name] === null ? '' : row[field.name]
    }), {});
    setDialog({ mode: 'edit', values, id: row[idField] });
    setDialogError('');
  };
  const closeDialog = () => {
    if (!saving) setDialog(null);
  };

  const save = async (values) => {
    if (!dialog) return;
    setSaving(true);
    setDialogError('');
    try {
      if (dialog.mode === 'create') {
        await addCustomerRecord(table, values, useProductEntitlement);
      } else {
        await updateCustomerRecord(table, { ...values, [idField]: dialog.id });
      }
      setDialog(null);
      await load();
    } catch (reason) {
      setDialogError(getErrorMessage(reason, 'Không thể lưu dữ liệu.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    setError('');
    try {
      await deleteCustomerRecord(table, { [idField]: row[idField] });
      await load();
    } catch (reason) {
      setError(getErrorMessage(reason, 'Không thể xóa dữ liệu.'));
    }
  };

  const columns = useMemo(() => fields.filter((field) => field.show !== false), [fields]);

  return (
    <section className="customer-page">
      <h1>{title}</h1>
      {description && <p className="customer-page-lead">{description}</p>}
      <div className="customer-toolbar">
        <button className="customer-secondary-button" onClick={load} disabled={loading}>Tải lại</button>
        {canCreate && <button className="customer-primary-button" onClick={openCreate}>Thêm mới</button>}
      </div>
      {error && <p className="customer-page-error" role="alert">{error}</p>}
      <div className="customer-panel customer-table-wrap">
        {loading ? <p>Đang tải…</p> : (
          <table className="customer-table">
            <thead>
              <tr>
                {columns.map((field) => <th key={field.name}>{field.label}</th>)}
                {(canEdit || canDelete) && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length + (canEdit || canDelete ? 1 : 0)}>Chưa có dữ liệu.</td></tr>
              ) : rows.map((row, index) => (
                <tr key={row[idField] || index}>
                  {columns.map((field) => <td key={field.name}>{String(row[field.name] === undefined || row[field.name] === null ? '—' : row[field.name])}</td>)}
                  {(canEdit || canDelete) && (
                    <td>
                      <div className="customer-inline-actions">
                        {canEdit && <button className="customer-secondary-button" onClick={() => openEdit(row)}>Sửa</button>}
                        {canDelete && <button className="customer-danger-button" onClick={() => remove(row)}>Xóa</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {dialog && (
        <CustomerRecordDialog
          title={dialog.mode === 'create' ? `Thêm ${title.toLowerCase()}` : `Sửa ${title.toLowerCase()}`}
          fields={fields}
          initialValues={dialog.values}
          saving={saving}
          error={dialogError}
          onCancel={closeDialog}
          onSave={save}
        />
      )}
    </section>
  );
};

export const CustomerCompanyPage = () => (
  <CustomerRecordsPage
    title="Công ty"
    description="Các công ty thuộc Customer đang đăng nhập."
    table="company"
    idField="company_id"
    fields={[
      { name: 'companyname', label: 'Tên công ty', required: true },
      { name: 'adresss', label: 'Địa chỉ', required: true, multiline: true },
      { name: 'phone', label: 'Điện thoại', required: true, type: 'tel' },
      { name: 'fax', label: 'Fax' },
      { name: 'icon_company', label: 'Đường dẫn logo' }
    ]}
  />
);

export const CustomerProductGroupPage = () => (
  <CustomerRecordsPage
    title="Danh mục sản phẩm"
    description="Tạo và quản lý nhóm sản phẩm của Customer."
    table="product_group"
    idField="product_group_id"
    fields={[{ name: 'product_group_content', label: 'Tên danh mục', required: true }]}
  />
);

export const CustomerProductPage = () => (
  <CustomerRecordsPage
    title="Sản phẩm"
    description="Sản phẩm mới được kiểm tra giới hạn của gói dịch vụ đang hoạt động."
    table="product"
    idField="product_id"
    useProductEntitlement
    fields={[
      { name: 'company_id', label: 'Mã công ty', required: true, type: 'number', min: '1' },
      { name: 'product_group_id', label: 'Mã danh mục', type: 'number', min: '1' },
      { name: 'name', label: 'Tên sản phẩm', required: true },
      { name: 'detail', label: 'Mô tả', multiline: true },
      { name: 'image', label: 'Đường dẫn ảnh' },
      { name: 'store', label: 'Tồn kho', type: 'number', min: '0' },
      { name: 'level', label: 'Cấp độ', type: 'number', min: '0' }
    ]}
  />
);

export const CustomerLostProductPage = () => (
  <CustomerRecordsPage
    title="Sản phẩm thất lạc"
    description="Danh sách bản ghi sản phẩm thất lạc thuộc Customer."
    table="product_lost"
    idField="stord_id"
    canCreate={false}
    canEdit={false}
    canDelete={false}
    fields={[
      { name: 'stord_id', label: 'Mã', show: false },
      { name: 'companyname', label: 'Công ty' },
      { name: 'name_image_detail', label: 'Sản phẩm' },
      { name: 'content', label: 'Nội dung' },
      { name: 'number', label: 'Số lượng' },
      { name: 'created_at', label: 'Ngày tạo' }
    ]}
  />
);

export default CustomerRecordsPage;

