import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class PaymentInternal  {
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
              flex:2,
            },
            {
              field: 'type',
              headerName: 'Loại',
              flex:2,
            },
            {
                field: 'note',
                headerName: 'Nội dung',
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
        mainID:'id_payment_intenal',
        mainInfo:{
            field: 'value',
            headerName: 'Nội dung',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["value","type","note"];
    }
    getTitleToAdd(){
      return ["giá trị","kiểu","ghi chú"];
    }
    getJsonTofind(){
      return ["content"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","payment_type",""];
    }
    getColumeValidate(){
      return ["","",""];
    }
} 

export default  PaymentInternal;
