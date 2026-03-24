import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class ProductPages  {
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
                flex:5,
            },
            {
              field: 'filesave',
              headerName: 'filesave',
              flex:5,
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
        mainID:'product_pages_id',
        mainInfo:{
          field: 'product_id',
          headerName: 'sản phẩm',
          flex:1,
        }
      }
    }

    getInfoToAdd(){
      return  ["product_id","filesave"];
    }
    getTitleToAdd(){
      return  ["sản phẩm","file lưu lại"];
    }
    getJsonTofind(){
      return ["filesave"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.UN_EDIT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.SelectGroupContentSub,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["product",""];
    }
    getColumeValidate(){
      return ["",""];
    }
} 

export default  ProductPages;
