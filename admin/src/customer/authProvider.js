import { loginCustomer, logoutCustomer } from './api';
import { clearCustomerSession, hasValidCustomerSession } from './session';

export default {
  login: ({ username, password }) => loginCustomer({ email: String(username || '').trim(), password }),
  logout: () => logoutCustomer(),
  checkError: ({ status }) => {
    if (status === 401 || status === 403) {
      clearCustomerSession();
      return Promise.reject();
    }
    return Promise.resolve();
  },
  checkAuth: () => {
    if (hasValidCustomerSession()) return Promise.resolve();
    clearCustomerSession();
    return Promise.reject();
  },
  getPermissions: () => Promise.resolve('customer')
};
