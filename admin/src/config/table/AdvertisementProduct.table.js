import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class AdvertisementProduct  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'group_product_id',
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
        mainID:'advertisement_product_id',
        mainInfo:{
          field: 'title',
          headerName: 'Chi tiết bài báo',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return  ["group_product_id","filesave","title","content","content_img","land_image","set_to_fist"];
    }
    getTitleToAdd(){
      return  ["nhóm sản phẩm","link","tiêu đề","nội dung","ảnh nội dung","ảnh quảng bá","ưu tiên"];
    }
    getJsonTofind(){
      return ["title","content"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.SelectGroupContentSub,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.SELECT_IMAGE_UP_LOAD,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectTabbleToAdd(){
      return  ["group_product","","","","","" ,""];
    }
    getColumeValidate(){
      return ["","","leng6","","","",""];
    }
} 

export default  AdvertisementProduct;
