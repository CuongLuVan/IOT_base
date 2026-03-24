import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';
class MqttUser  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'content',
              headerName: 'Nội dung',
              flex:2,
            },
            {
              field: 'username',
              headerName: 'Tên tài khoản',
              flex:2,
            },
            {
              field: 'mqtt_id',
              headerName: 'mqtt_id',
              flex:2,
            },
            {
              field: 'action',
              headerName: 'Thao tác',
              flex:1.3,
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
            },
          ];
        return columns;
    }
    getInfoToEdit(){
      return {
        mainID:'mqtt_user_id',
        mainInfo:{
          field: 'content',
          headerName: 'Chi tiết bài báo',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return  ["user_id","content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
    }
    getTitleToAdd(){
      return  ["tài khoản","nội dung","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
    }
    getJsonTofind(){
      return ["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML ];
    }
    getTypeSelectTabbleToAdd(){
      return  ["users","","","","","","" ];
    }
    getColumeValidate(){
      return ["","leng3","leng3","leng3","leng3","leng3"];
    }
} 

export default  MqttUser;
