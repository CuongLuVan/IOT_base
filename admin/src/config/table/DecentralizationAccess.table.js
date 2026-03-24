import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import ManagerData from '../../actions/ManagerData.js'
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';


class DecentralizationAccess  {
    //"name","id_admin","id_member","enterprise_id","note"
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
              field: 'id_admin',
              headerName: 'id_admin',
              flex:1,
            },
            {
              field: 'id_member',
              headerName: 'id_member',
              flex:1,
            },
            {
                field: 'note',
                headerName: 'note',
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
        mainID:'decentralization_access_id',
        mainInfo:{
          field: 'name',
            headerName: 'name',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["name","id_admin","id_member","enterprise_id","note"];
    }
    getTitleToAdd(){
      return ["Tên","admin ","Thành viên","doanh nghiệp","ghi chú"];
    }
    getJsonTofind(){
      return ["name","note"];
    }
    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_TYPE,TypeDialgueShow.SELECT_TYPE,TypeDialgueShow.SELECT_TYPE,
              TypeDialgueShow.EDIT_TEXT];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML
                ,SelectHTml.NOT_CHECK_HTML ];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","users","users","enterprise",""];
    }
    getColumeValidate(){
      return ["","","","",""];
    }
} 

export default  DecentralizationAccess;
