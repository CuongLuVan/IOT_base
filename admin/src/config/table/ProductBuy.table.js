import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class ProductBuy  {
    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'sale_name',
              headerName: 'người bán',
              flex:2,
            },
            {
              field: 'KM',
              headerName: 'KM',
              flex:2,
            },
            {
              field: 'Total',
              headerName: 'Tổng giá trị',
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
        mainID:'buyproduct_id',
        mainInfo:{
            field: 'Total',
            headerName: 'Total',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["customer_id","selled_id","KM","Total","status","note","phone","name","address"];
    }
    getTitleToAdd(){
      return ["khách hàng","người bán","KM","tổng giá trị","trạng thái","ghi chú","số điện thoại","tên người đặt","địa chỉ"];
    }
    getJsonTofind(){
      return ["KM","Total","note","phone","name","address"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
               TypeDialgueShow.EDIT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.CUSTOMER_SELECT_BILL,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML  ];
    }
    getTypeSelectTabbleToAdd(){
      return  ["customer","users","","","","","",""];
    }
    getColumeValidate(){
      return ["","","number","number","","","",""];
    }
} 


