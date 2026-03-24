import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class AdvertisementContent  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'group_content',
              headerName: 'Nhóm bài viết',
              flex:2,
            },
            {
              field: 'title',
              headerName: 'Tiêu đề',
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
        mainID:'advertisement_id',
        mainInfo:{
          field: 'title',
          headerName: 'Chi tiết bài báo',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return  ["group_content_sub_id","group_file","filesave","title","content","content_img","land_image"];
    }
    getTitleToAdd(){
      return  ["nhóm nội dung","nhóm file","link","tiêu đề","nội dung","ảnh nội dung","ảnh quảng bá"];
    }
    getJsonTofind(){
      return ["title","content"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.UN_EDIT,TypeDialgueShow.UN_EDIT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.SELECT_CUSTOM];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.SelectGroupContentSub,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.SELECT_IMAGE_UP_LOAD];
    }
    getTypeSelectTabbleToAdd(){
      return  ["group_content_sub","","","","","" ,""];
    }
    getColumeValidate(){
      return ["","","leng6","","","",""];
    }
} 

export default  AdvertisementContent;
