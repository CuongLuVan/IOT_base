import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class PaymentType  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'content',
              headerName: 'Nội dung',
              flex:5,
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
        mainID:'id_payment_type',
        mainInfo:{
            field: 'content',
            headerName: 'Nội dung',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["content"];
    }
    getTitleToAdd(){
      return ["nội dung"];
    }
    getJsonTofind(){
      return ["content"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  [""];
    }
    getColumeValidate(){
      return [""];
    }
} 

export default  PaymentType;
