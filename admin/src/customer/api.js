import axios from 'axios';
import { API_URL } from '../config/config';
import {
  CUSTOMER_TOKEN_KEY,
  CUSTOMER_USERNAME_KEY,
  clearCustomerSession,
  getCustomerToken,
  hasValidCustomerSession
} from './session';

function endpoint(path) {
  return API_URL + String(path || '').replace(/^\/+/, '');
}

function messageFromError(error, fallback = 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.') {
  const body = error && error.response && error.response.data;
  if (body && body.error && typeof body.error.message === 'string') return body.error.message;
  if (body && typeof body.message === 'string') return body.message;
  return fallback;
}

function handleApiError(error) {
  if (error && error.response && (error.response.status === 401 || error.response.status === 403)) {
    clearCustomerSession();
  }
  return Promise.reject(error);
}

function customerHeaders(data) {
  const headers = { Accept: 'application/json' };
  const token = getCustomerToken();
  if (token && hasValidCustomerSession()) headers.Authorization = 'Bearer ' + token;
  if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json';
  return headers;
}

export async function customerRequest(method, path, data) {
  try {
    const response = await axios({
      method,
      url: endpoint(path),
      data,
      headers: customerHeaders(data),
      responseType: 'json'
    });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function loginCustomer({ email, password }) {
  try {
    // The reference Customer application uses the manager endpoint because its
    // product and company tools require the Customer manager permission.
    const response = await axios.post(endpoint('auth/login_customer_manage'), { email, password });
    const token = response && response.data && response.data.token;
    if (typeof token !== 'string' || !token) throw new Error('INVALID_ACCESS_TOKEN');

    sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    sessionStorage.setItem(CUSTOMER_USERNAME_KEY, email);
    if (!hasValidCustomerSession()) {
      clearCustomerSession();
      throw new Error('INVALID_ACCESS_TOKEN');
    }
    return response.data;
  } catch (error) {
    clearCustomerSession();
    throw new Error(messageFromError(error, 'Đăng nhập Customer không thành công.'));
  }
}

export async function logoutCustomer() {
  const token = getCustomerToken();
  try {
    if (token && hasValidCustomerSession()) {
      await customerRequest('post', 'auth/logout', {});
    }
  } finally {
    clearCustomerSession();
  }
}

export function getErrorMessage(error, fallback) {
  return messageFromError(error, fallback);
}

export function getCustomerInfo() {
  return customerRequest('get', 'auth/info_customer');
}

export function getCustomerRecords(table) {
  return customerRequest('post', 'customers/report', { table });
}

export function addCustomerRecord(table, values, useProductEntitlement = false) {
  return customerRequest('post', useProductEntitlement ? 'customers/manager_add_product' : 'customers/manager_add', {
    ...values,
    table
  });
}

export function updateCustomerRecord(table, values) {
  return customerRequest('post', 'customers/manager_update', { ...values, table });
}

export function deleteCustomerRecord(table, values) {
  return customerRequest('post', 'customers/manager_delete', { ...values, table });
}

export function getCustomerOrders() {
  return customerRequest('post', 'customers/all_bill', {});
}

export function getCustomerReturns() {
  return customerRequest('post', 'customers/all_back', {});
}

export function getCustomerServices() {
  return customerRequest('get', 'customers/detail_service_all');
}

export function uploadCustomerImage(file) {
  const form = new FormData();
  form.append('file', file);
  return customerRequest('post', 'customers/import-image', form);
}

export function submitCustomerDocument(values) {
  return customerRequest('post', 'customers/upload_document', values);
}

