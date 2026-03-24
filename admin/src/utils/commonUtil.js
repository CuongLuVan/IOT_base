import Swal from 'sweetalert2';
import {JWT_TOKEN} from '../config/config.js';

export const TableView = {
  MAIN_ID: 0,
  SYSTEM_EIDIT: 1,
  DATE_TIME_EIDIT: 2,
  ONLY_VIEW: 3,
  EDIT_DIRECTLY: 4,
  EIDIT_FROM: 5,
  EDIT_FROM_HTML: 6,
  STOP_EIDIT: 7,
  MAIN_ID_EDIT: 10,
  EIDIT_GET_ID_FROM_ANOTHER_TABLE: 11,
};

export const ActionControl = {
  NO_ACTION: 0,
  ACTION_ADD: 1,
  ACTION_UPDATE: 2,
  ACTION_DELETE: 3,
};

export const TypeDialgueShow = {
  NO_CHECK: 0,
  EDIT_TEXT: 1,
  EDIT_CUSTOM: 2,
  SELECT_TYPE: 3,
  SELECT_TABLE: 4,
  SELECT_CUSTOM: 5,
  EDIT_DATE_TIME: 6,
  SELECT_PRODUCT_IMAGE:7,
  SELECT_CITY:8,
  SELECT_PROVINCE:9,
  SELECT_VILLAGE:10,
  UN_EDIT:11,
  TYPE_PAPER_UN_EDIT:12,
  TYPE_TOP_UN_EDIT:13,
  SELECT_LANGGUE:14
};


export const SelectHTml = {
  NOT_CHECK_HTML: 0,
  SelectPermision: 1,
  SelectGroupContentSub:2,
  SELECT_IMAGE_UP_LOAD:3,
  CUSTOMER_PERMISION: 4,
  CUSTOMER_SELECT_BILL: 5,
  
};

export const LOADING = {
  SHOW: 'SHOW_LOADING',
  HIDE: 'HIDE_LOADING',
};


export const isNull = (value) => {
  return value === null;
};


export const isObject = (value) => {
  const type = typeof value;
  return value != null && (type === 'object' || type === 'function');
};


export const isEmpty = (obj) => {
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
};

export const toUpper = (v, prev) => {
  if (v === prev) {
    return v;
  }
  return v && v.charAt(0).toUpperCase() + v.slice(1);
};

export const stringExplode = (str, delimiter) => {
  return str.split(delimiter);
};

export const convertStingToPascalCase = (str) => {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

export const arrayCompare = (arr1, arr2) => {
  if (!arr1 || !arr2) return;
  let result;
  arr1.forEach((e1, i) =>
    arr2.forEach((e2) => {
      if (e1.length > 1 && e2.length) {
        result = arrayCompare(e1, e2);
      } else if (e1 !== e2) {
        result = false;
      } else {
        result = true;
      }
    })
  );
  return result;
};

export const stringCompare = (str1, str2) => {
  const string1 = !isEmpty(str1) ? str1.toString() : '';
  const string2 = !isEmpty(str2) ? str2.toString() : '';
  return string1 === string2;
};

export const objectCompare = (obj1, obj2) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};

export const isBase64 = (str, mimeRequired = true) => {
  if (str instanceof Boolean || typeof str === 'boolean' || str === '') {
    return false;
  }
  let regex =
    '(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+/]{3}=)?';
  let mimeRegex = '(data:\\w+\\/[a-zA-Z\\+\\-\\.]+;base64,)';
  if (mimeRequired === true) {
    regex = mimeRegex + regex;
  }
  return new RegExp('^' + regex + '$', 'gi').test(str);
};


export const  validateEmail=(email)=> {
  const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(email=='') return false; 
  return re.test(String(email).toLowerCase());
}

export const  validatePhone=(phone)=> {
  const re = /(([0-9]{8})\b)/g;
  if(phone=='') return false; 
  return re.test(phone);
}

export const  isNumeric=(str)=> {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}

export const  validateDate=(timeDate)=> {
    return timeDate instanceof Date && !isNaN(timeDate);
}


export const checkErrorRetun=(error)=>{
  if(!!!error.response){
      Swal.fire('Kết nối mạng có vấn đề');
  }
  else
  {
      if(401 === error.response.status) {
        // redirect to login page
        console.log("error ... error . ",error.response.request.response);
        var jsonValue= JSON.parse(error.response.request.response);
          localStorage.removeItem(JWT_TOKEN);
          Swal.fire("Xin vui lòng đăng nhập lại !").then((value) => {
            localStorage.removeItem('username');
            //localStorage.removeItem('username');
            window.location.href = window.location.protocol +'////'+ window.location.host +'/admin/#/login';
          });

          return;
      }
      if (404 === error.response.status) {
        // redirect to 404 page
      }
      if (500 === error.response.status) {
        // redirect to 500 page
      }
  
      var dataAcess=" Lỗi chi tiết "+ error;
      if(!!error.response.data)
      {
          if((!!error.response.data.data)&&(!!error.response.data.data.message)){
            dataAcess += "\r\n ||" +error.response.data.data.message;
          }
          if(!!error.response.data.error){
            dataAcess += "\r\n ||" +error.response.data.error.message;
          }
          if((!!error.response.data.error)&&(!!error.response.data.error.sqlMessage)){
            dataAcess += "\r\n ||" +error.response.data.error.sqlMessage;
          }
      }
      console.log("error ... error . ",error.response);
      Swal.fire( " Lỗi",dataAcess,"ok");
  }
}


export const  fillterDataInfo=(infoText,dataTable,columns)=> {
  
    if(infoText.length<2){
        return dataTable;
    }
    var infoDataFillter=[];
    dataTable.forEach(element => {
        for(var i=0;i<columns.length;i++){
            let colume=columns[i];
            if(!!colume.field){
                if(!!element[colume.field])
                {
                    if(element[colume.field].toString().includes(infoText)){
                        infoDataFillter.push(element);
                        break;
                    }
                }  
            }
        }
    });
    return infoDataFillter;
}


export const  fillterDataSearch=(typeFind,lstInfoFind,value_fillter)=> {
    var fieldToFind = "";
    lstInfoFind.forEach(element => {
        if(element.id==typeFind){
            fieldToFind=element.field;
        }
    });
    if(fieldToFind.length<1) return null
    if(value_fillter.length<1) null;
    var dataSearch={dataFind:{}};
    dataSearch.dataFind[fieldToFind]=value_fillter;
    return dataSearch;
}


