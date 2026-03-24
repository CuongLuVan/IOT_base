import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';


class GroupContent  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'group_content',
              headerName: 'Nhóm',
              flex:2,
            },
            {
              field: 'title',
              headerName: 'Tiêu đề',
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
        mainID:'group_content_id',
        mainInfo:{
          field: 'group_content',
          headerName: 'group_content',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["group_content","title"];
    }
    getTitleToAdd(){
      return ["nhóm nội dung ","tiêu đề"];
    }
    getJsonTofind(){
      return ["group_content","title"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML ];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","" ];
    }
    getColumeValidate(){
      return ["",""];
    }
} 

export default  GroupContent;
