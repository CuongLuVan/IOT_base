import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class Service  {
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
              headerName: 'Tên dịch vụ',
              flex:2,
            },
            {
              field: 'title',
              headerName: 'Tiêu đề',
              flex:2,
            },
            {
                field: 'cost',
                headerName: 'cost',
                flex:2,
            },
            {
              field: 'downloads',
              headerName: 'downloads',
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
        mainID:'service_id',
        mainInfo:{
            field: 'name',
            headerName: 'Sản phẩm',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["name","service_group_id","image", "content", "cost","downloads"];
    }
    getTitleToAdd(){
      return ["Tên dịch  vụ","Nhóm dịch vụ","hình ảnh", "Nội dung", "giá","downloads"];
    }
    getJsonTofind() {
      return ["name","service_group_id","image", "content","cost", "downloads"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT, TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML ,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","service_group","","","",""];
    }
    getColumeValidate(){
      return ["","","","","number","number"];
    }
} 


