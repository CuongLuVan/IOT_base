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
              field: 'companyname',
              headerName: 'công ty',
              flex:1,
            },
            {
              field: 'adresss',
              headerName: 'địa chỉ',
              flex:1,
            },
            {
              field: 'phone',
              headerName: 'phone',
              flex:1,
            },
            {
                field: 'fax',
                headerName: 'fax',
                flex:1,
            },
           
            {
              field: 'action',
              headerName: 'Thao tác',
              flex:1,
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
        mainID:'company_id',
        mainInfo:{
            field: 'companyname',
            headerName: 'Công ty',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["icon_company", "companyname","adresss","phone","fax"];
    }
    getTitleToAdd(){
      return ["ảnh đại diện","tên công ty","địa chỉ","số điện thoại","fax"];
    }
    getJsonTofind(){
      return ["icon_company","companyname","adresss","phone","fax"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_CUSTOM, TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
             ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
               ];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","",""];
    }
    getColumeValidate(){
      return ["","","","phone","number"];
    }
} 


