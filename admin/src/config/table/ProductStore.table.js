import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class ProductStore  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'companyname',
              headerName: 'tên công ty',
              flex:1,
            },
            {
              field: 'name',
              headerName: 'tên sản phẩm',
              flex:1,
            },
            {
              field: 'content',
              headerName: 'Nội dung',
              flex:1,
            },
            {
                field: 'number',
                headerName: 'Số lượng',
                flex:1,
            },
            {
                field: 'contain',
                headerName: 'còn lại',
                flex:1,
            },
            {
              field: 'expridate',
              headerName: 'Hạn sử dụng',
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
            }
          ];
        return columns;
    }


    getInfoToEdit(){
      return {
        mainID:'store_product_id',
        mainInfo:{
            field: 'content',
            headerName: 'Sản phẩm',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["product_id","company_id","image_id","content","number","contain","expridate","addr_id","city_id","province_id","village_id"];
    }
    getTitleToAdd(){
      return ["sản phẩm","công ty","hình ảnh","ghi chú","số lượng","còn lại","thời hạn","địa chỉ","thành phố","huyện","phường"];
    }
    getJsonTofind(){
      return ["content","number"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_DATE_TIME ,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_CITY,
              TypeDialgueShow.SELECT_PROVINCE,TypeDialgueShow.SELECT_VILLAGE];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
              ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["product","company","product_image","","","","","address","","",""];
    }
    getColumeValidate(){
      return ["","","image_id","","number","","date","","","",""];
    }
} 


