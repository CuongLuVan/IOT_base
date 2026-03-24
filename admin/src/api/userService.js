import axios from 'axios';
import { API_URL, JWT_TOKEN } from '../config/config';
import Swal from 'sweetalert2';
import {
  setLocalStorage,
  clearLocalStorage,
  getLocalStorage,
} from '../utils/storageUtil';
import {checkErrorRetun} from '../utils/commonUtil';


export const sendMessageToAnothenMobile = (data) => {
  return new Promise((resolve, reject) => {
    axios
      .post(
        API_URL + 'customers/send_message',Object.assign(data),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getLocalStorage(JWT_TOKEN),
            authorization: 'Beard ' + getLocalStorage(JWT_TOKEN),
          },
        }
      )
      .then((response) => {
        resolve(response);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      });
  });
}

export const uploadfileDataExel = (data) => {

  return new Promise((resolve, reject) => {
  

    axios
      .post(
        API_URL + 'customers/import-data',Object.assign(data),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getLocalStorage(JWT_TOKEN),
            authorization: 'Beard ' + getLocalStorage(JWT_TOKEN),
          },
        }
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      });
  });
};

export const uploadfileDataImage = (data) => {
  return new Promise((resolve, reject) => {
    axios
      .post(
        API_URL + 'customers/import-image-admin',Object.assign(data),
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': getLocalStorage(JWT_TOKEN),
            authorization: 'Beard ' + getLocalStorage(JWT_TOKEN),
          },
        }
      )
      .then((response) => {
        resolve(response.data);
      })
      .catch((error) => {
        checkErrorRetun(error);
        reject(error);
      });
  });
};

