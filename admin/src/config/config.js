// Select HTTP only for a local development browser.  A production bundle must
// not accidentally keep calling localhost or downgrade API traffic to HTTP.
const ModeDevelop = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
export const apiPath = 'api/';

export const APP_HOST = ModeDevelop? 'localhost':'trithuc.choxanh4mua.com';
export const APP_PORT = ModeDevelop?  3000:80;
// Paper Library uses a fixed category-to-subcategory taxonomy.
export const MODE_PAPER_LIBRARRY = true;
export const HOST = ModeDevelop?`${APP_HOST}:${APP_PORT}/`:`${APP_HOST}/`;
export const HOST_HTTP = ModeDevelop? `http://${APP_HOST}:${APP_PORT}/`: `https://${APP_HOST}/`;
export const HOST_IMG = "";// ModeDevelop? `http://${APP_HOST}:${APP_PORT}`:`https://${APP_HOST}`;
export const API_URL =ModeDevelop? `http://${HOST}${apiPath}`:`https://${HOST}${apiPath}`;
export const JWT_TOKEN = 'token';
export const HOST_HTTP_CHAT = 'http://103.1.238.175:5000/api/chat/';
export const HOST_HTTP_HISTORY_CHAT = 'http://103.1.238.175:5000/api/history/';
