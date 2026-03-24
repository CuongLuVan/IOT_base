import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';
import {HOST_IMG} from '../config.js';


class User_View  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              width: 100,
            },
            {
              field: 'avatar',
              headerName: 'Hình ảnh',
              width: 150,
              renderCell: (imageInfo) => (
                <div>
                  <img src={HOST_IMG+imageInfo.value} height={40} />
                </div>
              ),
            },
            {
              field: 'username',
              headerName: 'Tài khoản',
              width: 150,
            },
            {
              field: 'email',
              headerName: 'email',
              width: 150,
            },
            {
              field: 'phone',
              headerName: 'Số điện thoại',
              width: 170,
            },
            {
              field: 'manifest_content',
              headerName: 'Quyền',
              width: 120,
            },
            {
              field: 'action',
              headerName: 'Thao tác',
              width: 150,
              renderCell: () => (
                <div>
                  <span
                    onClick={() => {
                      if(callback!=null) callback(ActionControl.ACTION_UPDATE);
                     // ManagerData.selectActionManager(ActionControl.ACTION_UPDATE);
                    }}
                  >
                  <EditIcon />
                  </span>
                  <span
                      onClick={() => {
                        if(callback!=null) callback(ActionControl.ACTION_DELETE);
                        //ManagerData.selectActionManager(ActionControl.ACTION_DELETE);
                        }}
                    >
                    <DeleteIcon />
                  </span>
                </div>
              ),
            },
          ];
        return columns;
    }

    getInfoToEdit(){
      return {
        mainID:'users_id',
        mainInfo:{
            field: 'username',
            headerName: 'Thông tin khách hàng',
            flex:1,
        }
      }
    }
    
    getInfoToAdd(){
      return  ["username","email","password","phone","avatar","fullname","permission_id","address","note" ];
    }
    getTitleToAdd(){
      return  ["Tên tài khoản","email","password","số điện thoại",
                "Ảnh đại điện","Tên đầy đủ","quyền","Địa chỉ",
                "ghi chú"];
    }
    getJsonTofind(){
      return ["username","email","phone","avatar","fullname","address","note" ];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_CUSTOM,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML,SelectHTml.SelectPermision,SelectHTml.NOT_CHECK_HTML,
                SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","","","","","",""]; 
    }

    getColumeValidate(){
      return  ["leng3","email","password","phone","","leng3","","","" ];
    }


} 

export default  User_View;
