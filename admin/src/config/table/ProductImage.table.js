import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class ProductImage  {
    getColumeShow=(callback)=>{
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'name',
              headerName: 'name',
              flex:1,
            },
            {
              field: 'name_image_detail',
              headerName: 'name_image_detail',
              flex:1,
            },
            {
              field: 'image_info_detail',
              headerName: 'image_info_detail',
              flex:1,
            },
            {
              field: 'cost_detail',
              headerName: 'cost_detail',
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
            },
          ];
        return columns;
    }
    getInfoToEdit(){
      return {
        mainID:'image_id',
        mainInfo:{
          field: 'name_image_detail',
          headerName: 'Chi tiết sản phẩm',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return  ["product_id","name_image_detail","image_info_detail","cost_detail","cost_real","promotion"];
    }
    getTitleToAdd(){
      return  ["sản phẩm","tên sản phẩm","hình ảnh sản phẩm","giá chi tiết","giá thật ","khuyến mãi"];
    }
    getJsonTofind(){
      return ["name_image_detail","image_info_detail","cost_detail","cost_real","promotion"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.SelectGroupContentSub,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["product","","","","",""];
    }
    getColumeValidate(){
      return ["","leng6","","","",""];
    }
} 

export default  ProductImage;
