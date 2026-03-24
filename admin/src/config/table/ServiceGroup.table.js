import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';


class ServiceGroup  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'title',
              headerName: 'tiêu đề',
              flex:2,
            },
            {
              field: 'content',
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
            },
          ];
        return columns;
    }

    getInfoToEdit(){
      return {
        mainID:'service_group_id',
        mainInfo:{
          field: 'title',
          headerName: 'title',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["title","content","image","company_id"];
    }
    getTitleToAdd(){
      return ["Tên dịch vụ","Nội dung","hình ảnh","công ty"];
    }
    getJsonTofind() {
      return ["title", "content"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.SELECT_TABLE];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML ];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","company" ];
    }
    getColumeValidate(){
      return ["","","",""];
    }
} 

export default  ServiceGroup;
