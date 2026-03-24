import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import React from 'react';
import {ActionControl ,TypeDialgueShow,SelectHTml} from '../../utils/commonUtil';

class GroupCompany  {

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
              headerName: 'tên nhóm công ty',
              flex:1,
            },
            {
              field: 'adress',
              headerName: 'địa chỉ',
              flex:1,
            },
            {
              field: 'location_lat',
              headerName: 'Kinh độ',
              flex:1,
            },
            {
                field: 'location_long',
                headerName: 'vĩ độ',
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
        mainID:'group_company_id',
        mainInfo:{
            field: 'name_group_company',
            headerName: 'địa chỉ',
            flex:1,
        }
      }
    }

    getInfoToAdd(){
      return ["name_group_company","image","adress","location_lat","location_long","city_id","province_id","village_id"];
    }
    getTitleToAdd(){
      return ["Tên nhóm kinh doanh","Ảnh","Địa chỉ","Kinh độ","Vĩ độ","khu vực xã","Huyện","tỉnh/ Thành phố"];
    }
    getJsonTofind(){
      return ["name_group_company","adress"];
    }

    getHtmlAdd(){
      return  [TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.SELECT_CUSTOM,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,TypeDialgueShow.EDIT_TEXT,
                TypeDialgueShow.SELECT_CITY,TypeDialgueShow.SELECT_PROVINCE,TypeDialgueShow.SELECT_VILLAGE ];
    }
    getTypeSelectToAdd(){
      return  [SelectHTml.NOT_CHECK_HTML,SelectHTml.SELECT_IMAGE_UP_LOAD,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,
                SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML,SelectHTml.NOT_CHECK_HTML];
    }
    getTypeSelectTabbleToAdd(){
      return  ["","","","","","","",""];
    }
    getColumeValidate(){
      return ["","","","","","","",""];
    }
} 

export default  GroupCompany;
