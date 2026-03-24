import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class GroupContentSub  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'group_content',
              headerName: 'Nhóm nội dung',
              flex:2,
            },
            {
              field: 'group_content_main',
              headerName: 'Mô tả',
              flex:2,
            },
            {
              field: 'title',
              headerName: 'Chi tiết',
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
            }
            
          ];
        return columns;
    }


    getInfoToEdit(){
      return {
        mainID:'group_content_sub_id',
        mainInfo:{
            field: 'group_content',
            headerName: 'Nội dung',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["group_content","group_content_id","title"];
    }
    getTitleToAdd(){
      return ["nội dung","nhóm","tiêu đề"];
    }
    getJsonTofind(){
      return ["group_content","title"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","group_content",""];
    }
    getColumeValidate(){
      return ["","",""];
    }
} 


