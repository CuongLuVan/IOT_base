
import { login, logout as logoutFromApi } from './httpBaseUtil.js';
import { clearLocalStorage } from '../utils/storageUtil';
import { isAuthenticated } from '../utils/jwtUtil';
import { JWT_TOKEN } from '../config/config';

const clearAuthentication = () => {
    clearLocalStorage(JWT_TOKEN);
    sessionStorage.removeItem('username');
};

export default {
    // called when the user attempts to log in
    login: ({ username ,password }) => {
        return login({ email: username, password }).then((value) => {
            sessionStorage.setItem('username', username);
            return value;
        });
    },
    // called when the user clicks on the logout button
    logout: () => {
        return logoutFromApi().finally(clearAuthentication);
    },
    // called when the API returns an error
    checkError: ({ status }) => {
        if (status === 401 || status === 403) {
            clearAuthentication();
            return Promise.reject();
        }
        return Promise.resolve();
    },
    // called when the user navigates to a new location, to check for authentication
    checkAuth: () => {
        if (isAuthenticated()) return Promise.resolve();
        clearAuthentication();
        return Promise.reject();
    },
    // called when the user navigates to a new location, to check for permissions / roles
    getPermissions: () => Promise.resolve(),
};
