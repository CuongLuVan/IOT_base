const ModeDevelop=true; 
export const apiPath = 'api/';

export const APP_HOST = ModeDevelop? 'localhost':'trithuc.choxanh4mua.com';
export const APP_PORT = ModeDevelop?  3000:80;
export const HOST = ModeDevelop?`${APP_HOST}:${APP_PORT}/`:`${APP_HOST}/`;
export const HOST_HTTP = ModeDevelop? `http://${APP_HOST}:${APP_PORT}/`: `https://${APP_HOST}/`;
export const HOST_IMG = "";// ModeDevelop? `http://${APP_HOST}:${APP_PORT}`:`https://${APP_HOST}`;
export const API_URL =ModeDevelop? `http://${HOST}${apiPath}`:`https://${HOST}${apiPath}`;
export const JWT_TOKEN = 'token';
export const HOST_HTTP_CHAT = 'http://103.1.238.175:5000/api/chat/';
export const HOST_HTTP_HISTORY_CHAT = 'http://103.1.238.175:5000/api/history/';
