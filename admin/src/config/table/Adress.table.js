import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class Adress  {

    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'name',
              headerName: 'địa chỉ',
              flex:1,
            },
            {
              field: 'contactPhoneNumber',
              headerName: 'contactPhoneNumber',
              flex:1,
            },
            {
              field: 'province',
              headerName: 'province',
              flex:1,
            },
            {
                field: 'streetaddr',
                headerName: 'streetaddr',
                flex:1,
            },
            {
                field: 'postCode',
                headerName: 'postCode',
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
        mainID:'addr_id',
        mainInfo:{
            field: 'name',
            headerName: 'địa chỉ',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["user_id","contactPhoneNumber","streetaddr","location_long","location_lat"];
    }
    getTitleToAdd(){
      return ["tài khoản","tên","số điện lên hệ","tỉnh","thành phố","địa chỉ","postCode"];
    }
    getJsonTofind(){
      return ["name","contactPhoneNumber","province","city","streetaddr","postCode"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.NO_CHECK,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","","",""];
    }
    getColumeValidate(){
      return ["","","","","",""];
    }
} 

export default  Adress;
