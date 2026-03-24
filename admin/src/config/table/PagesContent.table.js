import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';
const type_langue_data = ["Tiếng Việt","","English"];


class PagesContent  {
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
              headerName: 'nội dung',
              flex:2,
            },
            {
              field: 'set_to_fist',
              headerName: 'Đưa lên top',
              flex:1.5,
              renderCell: (data) => (
                <div> {data.value==null||data.value<0?"Chưa lên top":"Đã lên top"}</div>
              ),
            },
            {
              field: 'type_langue',
              headerName: 'Ngôn ngữ',
              flex:2,
              renderCell: (data) => (
                <div>  {type_langue_data[data.value]}</div>
              ),
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
            },
          ];
        return columns;
    }
    getInfoToEdit(){
      return {
        mainID:'pages_content_id',
        mainInfo:{
          field: 'title',
          headerName: 'Chi tiết bài báo',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return  ["group_content_sub_id","group_file","filesave","title","content","content_img","is_main_pages_id","set_to_fist","support_product","type_langue"];
    }
    getTitleToAdd(){
      return  ["","nhóm file","tiệp","tiêu để","nội dung","hình ảnh","Kiểu bài báo","lên top","hỗ trợ sản phẩm","Ngôn ngữ"];
    }
    getJsonTofind(){
      return ["group_file","filesave","title","content","content_img"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.UN_EDIT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.TYPE_PAPER_UN_EDIT,
              TypeDialgueShow.TYPE_TOP_UN_EDIT,TypeDialgueShow.SELECT_TABLE ,TypeDialgueShow.SELECT_LANGGUE];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.SelectGroupContentSub,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,
                SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["group_content_sub","","","","","","","","product" ];
    }
    getColumeValidate(){
      return ["","","","leng6","","","","",""];
    }
} 

export default  PagesContent;
