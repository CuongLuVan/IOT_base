import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class Customer  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'username',
              headerName: 'Tên Khách hàng',
              flex:2,
            },
            {
              field: 'email',
              headerName: 'email',
              flex:2,
            },
            {
              field: 'phone',
              headerName: 'phone',
              flex:2,
            },
            {
              field: 'action',
              headerName: 'Thao tác',
              flex:1.5,
              renderCell: () => (
                <div>
                  <span
                    onClick={() => {
                      if(callback!=null) callback(ActionControl.ACTION_UPDATE);
                    }}
                  >
                  <EditIcon />
                  </span>
                  <span
                      onClick={() => {
                        if(callback!=null) callback(ActionControl.ACTION_DELETE);
                        }}
                    >
                    <DeleteIcon />
                  </span>
                </div>
              ),
            }
          ];
        return columns;
    }


    getInfoToEdit(){
      return {
        mainID:'customer_id',
        mainInfo:{
            field: 'email',
            headerName: 'email',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["username","email","password",
              "token_reset","phone","avatar",
              "fullname","permission_id","address",
              "note"];
    }
    getTitleToAdd(){
      return ["Tài khoản","email","Mật khẩu","token_reset",
          "số điện thoại","ảnh đại diện","Tên đầy đủ","quyền","địa chỉ","ghi chú"];
    }
    getJsonTofind(){
      return ["username","email","phone","avatar","fullname","address","note"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.PASSWORD,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_CUSTOM,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_CUSTOM,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT  ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,
                SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,
                SelectHTml.NOT_CHECK_HTML,SelectHTml.CUSTOMER_PERMISION,SelectHTml.NOT_CHECK_HTML,
                SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","","","","","","",""];
    }
    getColumeValidate(){
      return ["leng6","email","password","","phone","","","","",""];
    }
} 


