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



function showLoadding(){
    Swal.fire({
        title: 'Xin vui lòng đợi '
    });
    Swal.showLoading();
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


export const httpPostData = (url, data) => {
  showLoadding();
  return new Promise((resolve, reject) => {
    axios
      .post(url,data,getHeader(url, data))
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      })
      .finally(() => {
        Swal.close();
      });
  });
};


export const httpPostDataAPI = (url, data) => {
  showLoadding();
  return new Promise((resolve, reject) => {
    axios
      .post(API_URL +url,data,getHeader(API_URL + url, data))
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      })
      .finally(() => {
        Swal.close();
      });
  });
};

export const httpGetData = (url) => {
  showLoadding();
  return new Promise((resolve, reject) => {
    axios.get(url,getHeader(url))
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      })
      .finally(() => {
        Swal.close();
      });
  });
};


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
        //logout();
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



export const getallInfoTable = (table,addInfo=null) => {
  var dataUpload= null;
  if(addInfo!=null) {
    dataUpload = Object.assign({}, addInfo, { table });
  }
  else  dataUpload={ table: table };
  return httpPostData(API_URL + 'users/report',dataUpload);
}

export const getNumberPageOnTable = (table,addInfo=null) => {
  var dataUpload= null;
  if(addInfo!=null) {
    dataUpload = Object.assign({}, addInfo, { table });
  }
  else  dataUpload={ table: table };
  return new Promise((resolve, reject) => {
    httpPostData(API_URL + 'users/report-page',dataUpload)
      .then((response) => {
          var numberPage=0;
          var detailInfo={numberPage:0,detailFillter:null};
          if(!!response.data.result["COUNT(*)"]){
            numberPage= response.data.result["COUNT(*)"];
          }
          else
          if(!!response.data.result[0]["COUNT(*)"]){
            numberPage= response.data.result[0]["COUNT(*)"];
          }
          else
          if(!!response.data.result[0][0]["COUNT(*)"]){
            numberPage= response.data.result[0][0]["COUNT(*)"];
          }
          detailInfo.numberPage =numberPage;// Math.round(numberPage/1000);
          detailInfo.detailFillter=response.data.dataFind
          resolve(detailInfo);
      })
      .catch((error) => {
          reject(error);
      });
  });
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

export const  addOneDataToTable = async (table, data)  =>  {
  return await httpPostData(API_URL + 'users/manager_add', Object.assign({}, data, { table }));
}

export const deleteOneDataToTable = (table, data) => {
  return httpPostData(API_URL + 'users/manager_delete', Object.assign({}, data, { table }));
}

export const updateOneDataInfoTable = (table, data) => {
  return httpPostData(API_URL + 'users/manager_update', Object.assign({}, data, { table }));
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
export const uploadfileDataImageAdmin = (data) => {
  showLoadding();
  return new Promise((resolve, reject) => {
    axios.post(API_URL + 'customers/import-image-admin',data,getHeader(API_URL + 'customers/import-image-admin', data))
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      })
      .finally(() => {
        Swal.close();
      });
  });
};

export const uploadfileDataImage = (data) => {
  showLoadding();
  return new Promise((resolve, reject) => {
    axios.post(API_URL + 'customers/import-image',data,getHeader(API_URL + 'customers/import-image', data))
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      })
      .finally(() => {
        Swal.close();
      });
  });
};

export const sendMessageChat = (data) => {
  showLoadding();
  return new Promise((resolve, reject) => {
    axios.post(HOST_HTTP_CHAT + 'chat',data,getHeader(HOST_HTTP_CHAT + 'chat', data))
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      })
      .finally(() => {
        Swal.close();
      });
  });
}

export const getListFindChat = ( data) => {
  return httpPostData(HOST_HTTP_CHAT + 'find_chat' ,data);
}


export const getListUserChat = ( data) => {
  return new Promise((resolve, reject) => {
    httpGetData(API_URL + 'users/lst_user')
    .then((result) => {
      for(var i=0;i<result.data.result.length;i++){
        result.data.result[i].name = result.data.result[i].fullname;
      }
      resolve(result.data.result);
    })
    .catch((error) => {
      reject(error);
    });
  });
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

//y



