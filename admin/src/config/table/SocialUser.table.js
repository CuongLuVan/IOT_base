import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class SocialUser  {

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
              flex:1,
            },
            {
              field: 'id_adress',
              headerName: 'địa chỉ',
              flex:1,
            },
            {
              field: 'name_social',
              headerName: 'Mạng xã hội',
              flex:1,
            },
            {
                field: 'adress_detail',
                headerName: 'địa chỉ chi tiết',
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
        mainID:'id_social',
        mainInfo:{
            field: 'id_adress',
            headerName: 'địa chỉ',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["id_user","id_adress","social_type_id","adress_detail"];
    }
    getTitleToAdd(){
      return ["Tài khoản","Địa chỉ mạng xã hội","Mạng xã hội","địa chỉ chi tiết"];
    }
    getJsonTofind(){
      return ["id_adress","adress_detail"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["customer","","social_type",""];
    }
    getColumeValidate(){
      return ["","","",""];
    }
} 

export default  SocialUser;
