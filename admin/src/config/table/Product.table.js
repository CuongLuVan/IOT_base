import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class Product  {
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
              headerName: 'Tên công ty',
              flex:2,
            },
            {
              field: 'name',
              headerName: 'Tên',
              flex:2,
            },
            {
              field: 'detail',
              headerName: 'Chi tiết',
              flex:2,
            },
            {
              field: 'level',
              headerName: 'level',
              flex:2,
              renderCell: (data) => (
                <div> {data.value==null||data.value==0?"Chưa cài đặt":"Mức độ"+data.value}</div>
              ),
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
        mainID:'product_id',
        mainInfo:{
            field: 'name',
            headerName: 'Sản phẩm',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["company_id","name","detail","image","Độ ưu tiên"];
    }
    getTitleToAdd(){
      return ["công ty","tên sản phẩm","chi tiết","hình ảnh","Độ ưu tiên"];
    }
    getJsonTofind(){
      return ["name","detail","image"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.TYPE_TOP_UN_EDIT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["company","","","",""];
    }
    getColumeValidate(){
      return ["","","","",""];
    }
} 


