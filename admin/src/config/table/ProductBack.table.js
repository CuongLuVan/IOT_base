import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class ProductBack  {
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
              headerName: 'name',
              flex:1,
            },
            {
              field: 'quantity',
              headerName: 'số lượng',
              flex:1,
            },
            {
              field: 'KM',
              headerName: 'khuyến mại',
              flex:1,
            }
            ,
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
        mainID:'buyproduct_id',
        mainInfo:{
            field: 'quantity',
            headerName: 'quantity',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["product_id","quantity","KM"];
    }
    getTitleToAdd(){
      return ["sản phẩm","số lượng","KM"];
    }
    getJsonTofind(){
      return ["quantity","KM"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["product","",""];
    }
    getColumeValidate(){
      return ["","number",""];
    }
} 

export default  ProductBack;
