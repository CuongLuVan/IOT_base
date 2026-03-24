import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

export default class Enterprise  {
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
              headerName: 'Tên xí nghiệp',
              flex:2,
            },
            {
              field: 'detail_info',
              headerName: 'Chi tiết',
              flex:2,
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
        mainID:'enterprise_id',
        mainInfo:{
            field: 'name',
            headerName: 'Sản phẩm',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["name","detail_info"];
    }
    getTitleToAdd(){
      return ["tên doanh nghiệm","thông tin chi tiết"];
    }
    getJsonTofind(){
      return ["name","detail_info"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["",""];
    }
    getColumeValidate(){
      return ["",""];
    }
} 


