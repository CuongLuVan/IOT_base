import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@material-ui/core';
import Swal from 'sweetalert2';
import { HOST_HTTP } from '../../config/config';
import {
  getPendingCustomerDocuments,
  reviewCustomerDocument
} from '../../api/httpBaseUtil';

const DOCUMENT_ID_PATTERN = /^\/uploads\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/;

function maskDocumentNumber(value) {
  const documentNumber = typeof value === 'string' ? value : '';
  if (documentNumber.length <= 4) return '••••';
  return documentNumber.slice(0, 2) + '••••' + documentNumber.slice(-2);
}

function imageUrl(path) {
  if (typeof path !== 'string' || !DOCUMENT_ID_PATTERN.test(path)) return null;
  return new URL(path, HOST_HTTP).toString();
}

function DocumentLink({ path, label }) {
  const href = imageUrl(path);
  if (!href) return <span>—</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
}

export default function AdminDocumentReview() {
  const [documents, setDocuments] = useState([]);
  const [reasons, setReasons] = useState({});
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);

  const loadDocuments = useCallback(() => {
    setLoading(true);
    return getPendingCustomerDocuments()
      .then((response) => {
        const result = response && response.data && response.data.result;
        setDocuments(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        setDocuments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const review = (documentId, status) => {
    const id = Number(documentId);
    const reason = (reasons[documentId] || '').trim();
    if (!Number.isSafeInteger(id) || id < 1) return;
    if (status === 'REJECTED' && !reason) {
      Swal.fire('Cần nhập lý do từ chối');
      return;
    }

    setPendingId(id);
    reviewCustomerDocument(id, status, reason)
      .then(() => {
        setReasons((current) => {
          const next = Object.assign({}, current);
          delete next[documentId];
          return next;
        });
        return loadDocuments();
      })
      .then(() => Swal.fire('Đã cập nhật giấy tờ', '', 'success'))
      .catch(() => {})
      .finally(() => setPendingId(null));
  };

  return (
    <div className="user-data">
      <Typography variant="h5" gutterBottom>Duyệt giấy tờ khách hàng</Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Số giấy tờ được che bớt; chỉ mở ảnh khi cần xác minh.
      </Typography>
      <TableContainer component={Paper}>
        <Table size="small" aria-label="Danh sách giấy tờ chờ duyệt">
          <TableHead>
            <TableRow>
              <TableCell>Khách hàng</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Loại</TableCell>
              <TableCell>Số giấy tờ</TableCell>
              <TableCell>Ảnh</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => {
              const isPending = pendingId === Number(document.customer_documents_id);
              return (
                <TableRow key={document.customer_documents_id}>
                  <TableCell>{document.fullname || '—'}</TableCell>
                  <TableCell>{document.email || '—'}</TableCell>
                  <TableCell>{document.document_type || '—'}</TableCell>
                  <TableCell>{maskDocumentNumber(document.document_number)}</TableCell>
                  <TableCell>
                    <DocumentLink path={document.image_front} label="Mặt trước" />
                    {' / '}
                    <DocumentLink path={document.image_back} label="Mặt sau" />
                  </TableCell>
                  <TableCell>
                    <Button
                      color="primary"
                      variant="contained"
                      size="small"
                      disabled={isPending}
                      onClick={() => review(document.customer_documents_id, 'APPROVED')}
                    >
                      Duyệt
                    </Button>
                    <TextField
                      size="small"
                      label="Lý do từ chối"
                      value={reasons[document.customer_documents_id] || ''}
                      inputProps={{ maxLength: 255 }}
                      disabled={isPending}
                      onChange={(event) => setReasons((current) => Object.assign({}, current, {
                        [document.customer_documents_id]: event.target.value
                      }))}
                    />
                    <Button
                      color="secondary"
                      size="small"
                      disabled={isPending}
                      onClick={() => review(document.customer_documents_id, 'REJECTED')}
                    >
                      Từ chối
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && documents.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Không có giấy tờ chờ duyệt.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
