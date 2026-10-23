import jwtDecode from 'jwt-decode';
import { CUSTOMER_JWT_TOKEN } from '../config/config';

export const CUSTOMER_TOKEN_KEY = CUSTOMER_JWT_TOKEN;
export const CUSTOMER_USERNAME_KEY = 'customer_username';
export const PORTAL_MODE_KEY = 'portal_mode';
export const CUSTOMER_PORTAL = 'customer';
export const ADMIN_PORTAL = 'admin';

export function clearCustomerSession() {
  sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_USERNAME_KEY);
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

export function getCustomerToken() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  return sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function hasValidCustomerSession() {
  const token = getCustomerToken();
  if (!token) return false;

  try {
    const claims = jwtDecode(token);
    return claims && claims.type === 'customer' && typeof claims.exp === 'number' && claims.exp > Date.now() / 1000;
  } catch (error) {
    return false;
  }
}

