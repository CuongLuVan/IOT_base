import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class ServiceCharging  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'email',
              headerName: 'email',
              flex:2,
            },
            {
              field: 'name',
              headerName: 'name',
              flex:2,
            },
            {
              field: 'value',
              headerName: 'value',
              flex:2,
            },
            {
                field: 'bank',
                headerName: 'bank',
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
        mainID:'bill_service_id',
        mainInfo:{
            field: 'value',
            headerName: 'value',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["customer_id","service_id","value","bank","detail_bank","content"];
    }
    getTitleToAdd(){
      return ["khách hàng","dịch vụ","số tiền","Ngân hàng","Chi tiết ngân hàng","Nội dung"];
    }
    getJsonTofind(){
      return ["value","bank","detail_bank","content"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["customer","service","","","",""];
    }
    getColumeValidate(){
      return ["","","number","","",""];
    }
} 


