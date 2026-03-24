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
              headerName: 'companyname',
              flex:1,
            },
            {
              field: 'name',
              headerName: 'name',
              flex:1,
            },
            {
              field: 'content',
              headerName: 'content',
              flex:1,
            },
            {
                field: 'number',
                headerName: 'number',
                flex:1,
            },
            {
                field: 'contain',
                headerName: 'contain',
                flex:1,
            },
            {
              field: 'expridate',
              headerName: 'expridate',
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
      return ["product_id","company_id","content","number","contain","expridate"];
    }
    getTitleToAdd(){
      return ["Sản Phẩm","Công ty","nội dung","số lượng","còn lại","Hết hạn"];
    }
    getJsonTofind(){
      return ["content","number"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
              TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["product","company","","","",""];
    }
    getColumeValidate(){
      return ["","","","number","","date"];
    }
} 


