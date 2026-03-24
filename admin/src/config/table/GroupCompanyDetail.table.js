import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class GroupCompanyDetail  {

    getColumeShow=(callback)=>{
        //"user_id","name","contactPhoneNumber","province","city","streetaddr","postCode"
        const columns = [
            {
              field: 'id',
              headerName: 'stt',
              flex:1,
            },
            {
              field: 'name_group_company',
              headerName: 'Nhóm bán hàng',
              flex:1,
            },
            {
              field: 'adress',
              headerName: 'Địa chỉ',
              flex:1,
            },
            {
              field: 'companyname',
              headerName: 'Tên công ty',
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
        mainID:'group_company_detail_id',
        mainInfo:{
            field: 'companyname',
            headerName: 'công ty',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["company_id","group_company_id"];
    }
    getTitleToAdd(){
      return ["Tên Đơn vị kinh doanh","Nhóm kinh doanh"];
    }
    getJsonTofind(){
      return [];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.SELECT_TABLE,TypeDialgueShow.SELECT_TABLE ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["company","group_company"];
    }
    getColumeValidate(){
      return ["",""];
    }
} 

export default  GroupCompanyDetail;
