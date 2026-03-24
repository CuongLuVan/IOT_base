import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class PaymentTransport  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'value',
              headerName: 'chi phí',
              flex:1,
            },
            {
              field: 'value_cost',
              headerName: 'phụ phí',
              flex:1,
            },
            {
              field: 'email',
              headerName: 'email',
              flex:1,
            },
            {
                field: 'content',
                headerName: 'ghi chú',
                flex:1,
            },
            {
                field: 'content_cost',
                headerName: 'Nội dung phụ phí',
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
        mainID:'id_payment_intenal',
        mainInfo:{
            field: 'content',
            headerName: 'Nội dung',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["value","content","id_cost_transport","id_transport"];
    }
    getTitleToAdd(){
      return ["giá trị","nội dung","giá vận chuyển","người vận chuyển"];
    }
    getJsonTofind(){
      return ["content"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_TABLE ,TypeDialgueShow.SELECT_TABLE];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","cost_transport","customer"];
    }
    getColumeValidate(){
      return ["","","",""];
    }
} 

export default  PaymentTransport;
