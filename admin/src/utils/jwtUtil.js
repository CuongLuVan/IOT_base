import jwtDecode from 'jwt-decode';

import { getLocalStorage } from './storageUtil';
import { JWT_TOKEN } from '../config/config';

export let isTokenExpired = (token) => {
  try {
    const decoded = jwtDecode(token);
    // A malformed token or one without an expiry must not pass the UI guard.
    return typeof decoded.exp !== 'number' || decoded.exp <= Date.now() / 1000;
  } catch (e) {
    return true;
  }
};

export let getToken = () => {
  return getLocalStorage(JWT_TOKEN);
};

export let isAuthenticated = () => {
  return !!getToken() && !isTokenExpired(getToken());
};
