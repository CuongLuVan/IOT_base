import axios from 'axios';
import { API_URL, JWT_TOKEN ,HOST_HTTP_CHAT,HOST_HTTP_HISTORY_CHAT} from '../config/config';
import Swal from 'sweetalert2';
import {
  setLocalStorage,
  clearLocalStorage,
  getLocalStorage,
} from '../utils/storageUtil';

import {checkErrorRetun} from '../utils/commonUtil';
import { isAuthenticated } from '../utils/jwtUtil';



// The "please wait" popup is shared by all requests: it is shown by the first
// one and closed when the last one finishes, so a request that ends early does
// not close the spinner of the others.
let pendingRequests = 0;

function showLoadding(){
    pendingRequests++;
    if (pendingRequests > 1) return;
    Swal.fire({
        title: 'Xin vui lòng đợi '
    });
    Swal.showLoading();
}

function hideLoadding(){
    pendingRequests = Math.max(0, pendingRequests - 1);
    if (pendingRequests === 0 && Swal.isLoading()) Swal.close();
}


function isApiUrl(url) {
  try {
    return new URL(url, API_URL).origin === new URL(API_URL).origin;
  } catch (error) {
    return false;
  }
}

function getHeader(url, data) {
  const headers = { Accept: 'application/json' };
  if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json';

  // Never disclose the admin access token to separately hosted chat services.
  // The API middleware expects this standard Authorization scheme.
  if (isApiUrl(url) && isAuthenticated()) {
    headers.Authorization = 'Bearer ' + getLocalStorage(JWT_TOKEN);
  }
  return { headers };
}


// Request with the "please wait" popup. The spinner is closed before an error
// popup is shown (closing it afterwards used to hide the error message at once).
// Resolves with the axios response, or with response.data when unwrap is true.
function request(method, url, data, unwrap = false) {
  showLoadding();
  const call = method === 'get'
    ? axios.get(url, getHeader(url))
    : method === 'delete'
      ? axios.delete(url, getHeader(url))
      : axios[method](url, data, getHeader(url, data));
  return call.then(
    (response) => {
      hideLoadding();
      return unwrap ? response.data : response;
    },
    (error) => {
      hideLoadding();
      checkErrorRetun(error);
      throw error;
    }
  );
}

export const httpPostData = (url, data) => request('post', url, data);

export const httpPostDataAPI = (url, data) => request('post', API_URL + url, data);

export const httpGetData = (url) => request('get', url);
export const httpPutData = (url, data) => request('put', url, data);
export const httpDeleteData = (url) => request('delete', url);


export const login = ({ email, password }) => {
  return new Promise((resolve, reject) =>  {
    axios.post(API_URL + 'auth/login', { email, password })
      .then((response) => {
        if (!response.data || typeof response.data.token !== 'string' || !response.data.token) {
          reject(new Error('The server did not return a valid access token.'));
          return;
        }
        setLocalStorage(JWT_TOKEN, response.data.token);
        resolve(response);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      });
  });
}

export const logout = () => {
  return axios
    .post(API_URL + 'auth/logout', {}, getHeader(API_URL + 'auth/logout', {}))
    .catch(() => undefined)
    .finally(() => {
      clearLocalStorage(JWT_TOKEN);
      sessionStorage.removeItem('username');
    });
}



// Request body of the table APIs: the extra fields plus { table }.
const withTable = (table, data) => Object.assign({}, data, { table });

export const getallInfoTable = (table,addInfo=null) => {
  return httpPostData(API_URL + 'users/report', withTable(table, addInfo));
}

// "COUNT(*)" of the result, which comes as an object, [row] or [[row]]; 0 when missing.
function readCount(result) {
  const candidates = [result, result && result[0], result && result[0] && result[0][0]];
  for (const row of candidates) {
    if (row && row["COUNT(*)"] !== undefined && row["COUNT(*)"] !== null) return Number(row["COUNT(*)"]) || 0;
  }
  return 0;
}

export const getNumberPageOnTable = (table,addInfo=null) => {
  return httpPostData(API_URL + 'users/report-page', withTable(table, addInfo))
    .then((response) => ({
      numberPage: readCount(response.data && response.data.result),
      detailFillter: response.data ? response.data.dataFind : null,
    }));
}

export const getCurUser = () => {
  return  httpGetData(API_URL + 'auth/user');
}

export const getLstApproved = () => {
  return  httpGetData(API_URL + 'users/get_approved');
}
export const setDataApproved = (data) => {
  return  httpPostData(API_URL + 'users/set_approved' ,data);
}
export const setDataApprovedCompany = (data) => {
  return  httpPostData(API_URL + 'users/set_approved_company' ,data);
}
export const saveCertificateMqtt = (data) => {
  return  httpPostData(API_URL + 'document/saveCertificateMqtt' ,data);
}

// Device status history (web_manager: MongoDB sensor_data, admin only).
export const getDeviceHistoryDevices = () => {
  return httpGetData(API_URL + 'mongodb/device-history/devices');
}

export const getDeviceStatusHistory = (deviceId, limit) => {
  return httpPostData(API_URL + 'mongodb/device-history', { mqtt_microservice_id: deviceId, limit });
}

// On/off counts. period: { days: 1..31 } (per day), { months: 1..12 } (per month, 12 = 1 year)
// or { from, to: "YYYY-MM-DD", groupBy?: 'day' | 'month' } (custom range, max 366 days).
export const getDeviceSwitchStats = (deviceId, period = { days: 7 }) => {
  return httpPostData(API_URL + 'mongodb/device-history/switch-stats', Object.assign({ mqtt_microservice_id: deviceId }, period));
}

// Sensor values ("va", raw units). period: { days: 1..31 } (averaged per bucketMs),
// { months: 1..12 } (averaged per month, 12 = 1 year)
// or { from, to: "YYYY-MM-DD", groupBy?: 'day' | 'month' } (custom range, max 366 days).
export const getDeviceSensorData = (deviceId, period = { days: 7 }) => {
  return httpPostData(API_URL + 'mongodb/device-history/sensor-data', Object.assign({ mqtt_microservice_id: deviceId }, period));
}

export const addOneDataToTable = (table, data) => {
  return httpPostData(API_URL + 'users/manager_add', withTable(table, data));
}

export const deleteOneDataToTable = (table, data) => {
  return httpPostData(API_URL + 'users/manager_delete', withTable(table, data));
}

export const updateOneDataInfoTable = (table, data) => {
  return httpPostData(API_URL + 'users/manager_update', withTable(table, data));
}


export const updatePagesToFist = (data) => {
  return  httpPostData(API_URL + 'users/fist_pages' ,data);
}

export const registerPageToWriter = ( data) => {
  return httpPostData(API_URL + 'document/registerPages' ,data);
}
export const registerProductPageToWriter = ( data) => {
  return httpPostData(API_URL + 'document/registerProductPages' ,data);
}
export const registerServicePageToWriter = ( data) => {
  return httpPostData(API_URL + 'document/registerServicePages' ,data);
}
export const updateServicePageToWriter = ( data) => {
  return httpPostData(API_URL + 'document/updatServicePages' ,data);
}

export const updateProductPageToWriter = ( data) => {
  return  httpPostData(API_URL + 'document/updateProductPages' ,data);
}
export const updatePageToWriter = ( data) => {
  return  httpPostData(API_URL + 'document/updatePages' ,data);
}

export const registerPageToAdvertisement = ( data) => {
  return httpPostData(API_URL + 'document/registerAdvertisement' ,data);
}

export const updatePageToAdvertisement = ( data) => {
  return httpPostData(API_URL + 'document/updateAdvertisement' ,data);
}
export const uploadfileDataImageAdmin = (data) => request('post', API_URL + 'customers/import-image-admin', data, true);

export const uploadfileDataImage = (data) => request('post', API_URL + 'customers/import-image', data, true);

export const sendMessageChat = (data) => request('post', HOST_HTTP_CHAT + 'chat', data);

export const getListFindChat = ( data) => {
  return httpPostData(HOST_HTTP_CHAT + 'find_chat' ,data);
}


// Users for the chat, with "name" = fullname.
export const getListUserChat = () => {
  return httpGetData(API_URL + 'users/lst_user')
    .then((result) => (result.data.result || []).map((user) => Object.assign({}, user, { name: user.fullname })));
}

export const getChatWithFriend = ( data) => {
  return httpPostData(HOST_HTTP_CHAT + 'create_friend' ,data);
}

export const getHistoryRoutes = ( data) => {
  return httpPostData(HOST_HTTP_HISTORY_CHAT + 'content' ,data);
}
export const getInfoClientMqtt = ( data) => {
  return  httpGetData(HOST_HTTP_CHAT + 'info_mqtt');
}


export const customerInCompany = ( data) => {
  return  httpPostData(API_URL + 'customers/customer-in-company' ,data);
}

export const getPendingCustomerDocuments = () => {
  return httpGetData(API_URL + 'users/report-cus-documment');
}

export const reviewCustomerDocument = (id, status, rejectReason = '') => {
  if (!Number.isSafeInteger(id) || id < 1) {
    return Promise.reject(new Error('Invalid document id.'));
  }
  return httpPostData(API_URL + 'users/report-cus-documment/' + id, {
    status,
    reject_reason: rejectReason
  });
}


