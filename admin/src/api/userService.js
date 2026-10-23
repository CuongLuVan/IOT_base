import axios from 'axios';
import { API_URL, JWT_TOKEN } from '../config/config';
import {
  getLocalStorage,
} from '../utils/storageUtil';
import {checkErrorRetun} from '../utils/commonUtil';

const getHeaders = (data) => {
  const headers = {
    Accept: 'application/json',
    Authorization: 'Bearer ' + getLocalStorage(JWT_TOKEN),
  };
  if (!(data instanceof FormData)) headers['Content-Type'] = 'application/json';
  return { headers };
};

export const sendMessageToAnothenMobile = (data) => {
  return new Promise((resolve, reject) => {
    axios
      .post(
        API_URL + 'customers/send_message', data, getHeaders(data)
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
        API_URL + 'customers/import-data', data, getHeaders(data)
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
        API_URL + 'customers/import-image-admin', data, getHeaders(data)
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

