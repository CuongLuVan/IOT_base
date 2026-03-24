import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';


class MqttMicroservice  {
    getColumeShow=(callback)=>{
      //"content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'content',
              headerName: 'nội dung',
              flex:2,
            },
            {
              field: 'mqtt_pub',
              headerName: 'MQTT pub',
              flex:2,
            },
            {
              field: 'mqtt_sub',
              headerName: 'MQTT sub',
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
              flex:2,
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
        mainInfo:{
          field: 'content',
          headerName: 'content',
          flex:1,
        },
        mainID:'mqtt_microservice_id',
      }
    }
    getInfoToAdd(){
      return  ["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
    }
    getTitleToAdd(){
      return  ["nội dung","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
    }
    getJsonTofind(){
      return ["content","mqtt_pub","mqtt_sub","mqtt_user","mqtt_pass","mqtt_id"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","","",""];
    }
    getColumeValidate(){
      return ["","leng3","leng3","leng3","leng3","leng3"];
    }
} 

export default  MqttMicroservice;
