import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class SocialType  {

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
                headerName: 'Mạng xã hội',
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
        mainID:'social_type_id',
        mainInfo:{
            field: 'name',
            headerName: 'Tên mạng xã hội',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["name"];
    }
    getTitleToAdd(){
      return ["Tên mạng xã hội"];
    }
    getJsonTofind(){
      return ["name"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["name"];
    }
    getColumeValidate(){
      return [""];
    }
} 

export default  SocialType;
